import requests
import os
import sys
from datetime import datetime, timezone


# Add backend folder to path so we can import models
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
from flask import Flask
from models import db, Housing

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

# ----------------------------------------
# CONFIGURATION
# ----------------------------------------
BASE_URL = "https://data.austintexas.gov/resource/ifzc-3xz8.json"
WALK_SCORE_API_KEY = os.getenv("WALK_SCORE_API_KEY")

def fetch_walkability_score(address, lat, lon): 
    """
    Fetches walkability score, transit score, and bike score of a given
    location using the Walk Score API. 
    Returns None, None, None upon failure.
    """
    try: 
        url = WALKABILITY_URL
        params = {
            "format": "json", 
            "address": address, 
            "lat": lat, 
            "lon": lon, 
            "transit": 1, 
            "bike": 1, 
            "wsapikey": WALK_SCORE_API_KEY
        }
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200: 
            data = response.json()
            if data.get("status") == 1: 
                walk_score = data.get("walkscore")
                transit_score = data.get("transit", {}).get("score")
                bike_score = data.get("bike", {}).get("score")
                return walk_score, transit_score, bike_score
    except Exception as e: 
        print(f"Walk Score fetch failed for {address}: {e}")
    return None, None, None

# ----------------------------------------
# SETUP FLASK APP AND DB CONNECTION
# ----------------------------------------
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

GOOGLE_MAPS_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
APP_TOKEN = os.getenv("APP_TOKEN_HOUSING")

def fetch_street_view(address=None, latitude=None, longitude=None):
    """
    Return HTTPS Street View image URL.
    Prefers lat/lon when provided (e.g. location=47.5763831,-122.4211769); otherwise uses address.
    """
    if not GOOGLE_MAPS_KEY:
        return None
    try:
        if latitude is not None and longitude is not None:
            location = f"{latitude},{longitude}"
        elif address:
            location = f"{address}, Austin, TX".replace(" ", "+")
        else:
            return None
        return (
            f"https://maps.googleapis.com/maps/api/streetview?"
            f"size=600x400&location={location}&fov=80&heading=70&pitch=0&key={GOOGLE_MAPS_KEY}"
        )
    except Exception as e:
        print(f"Street view URL failed: {e}")
    return None

# ----------------------------------------
# STEP 1: Fetch all data from SODA 2 API
# ----------------------------------------
def fetch_housing_data():
    all_records = []
    limit = 1000
    offset = 0

    headers = {
        "X-App-Token": APP_TOKEN
    }

    params = {
        "$limit": limit,
        "$where": "affordable_units > 0 AND development_status = 'Project Completed'",
    }

    print("Fetching housing data from API...")

    while True:
        params["$offset"] = offset
        response = requests.get(BASE_URL, headers=headers, params=params)

        if response.status_code != 200:
            print(f"Error fetching data: {response.status_code}")
            break

        batch = response.json()

        if not batch:
            break

        all_records.extend(batch)
        offset += limit
        print(f"Fetched {len(all_records)} records so far...")

    print(f"Total records fetched: {len(all_records)}")
    return all_records

# ----------------------------------------
# STEP 2: Merge records by project_name before sending to DB
# ----------------------------------------
def merge_records_by_project_name(records):
    """
    Combine all records with the same project_name into one record.
    - total_affordable_units (affordable_units) = sum across group
    - total_ada_units = sum across group
    - address (and zip, etc.) = from first record in group that has address+zip, else first record
    """
    from collections import defaultdict
    groups = defaultdict(list)
    for r in records:
        key = (r.get("project_name") or "").strip() or "Unknown"
        groups[key].append(r)

    merged = []
    for project_name, group in groups.items():
        # Prefer first record that has both address and zip for address/zip
        first_with_address = next((r for r in group if r.get("address") and r.get("zip")), group[0])
        first = first_with_address

        try:
            total_affordable = sum(int(r.get("affordable_units", 0) or 0) for r in group)
        except (TypeError, ValueError):
            total_affordable = 0
        try:
            total_ada = sum(int(r.get("total_ada_units", 0) or 0) for r in group)
        except (TypeError, ValueError):
            total_ada = 0

        merged_record = dict(first)
        merged_record["project_name"] = project_name
        merged_record["affordable_units"] = total_affordable
        merged_record["total_ada_units"] = total_ada
        merged_record["address"] = first.get("address")
        merged_record["zip"] = first.get("zip")
        merged.append(merged_record)
    return merged


# ----------------------------------------
# STEP 3: Helper for income restriction
# ----------------------------------------
def get_income_restriction(record):
    mfi_fields = {
        "mfi_20": "20% AMI",
        "mfi_30": "30% AMI",
        "mfi_40": "40% AMI",
        "mfi_50": "50% AMI",
        "mfi_60": "60% AMI",
        "mfi_65": "65% AMI",
        "mfi_70": "70% AMI",
        "mfi_80": "80% AMI",
        "mfi_100": "100% AMI",
        "mfi_120": "120% AMI",
    }
    levels = []
    for field, label in mfi_fields.items():
        try:
            value = int(record.get(field, 0))
            if value > 0:
                levels.append(label)
        except:
            pass
    return ", ".join(levels) if levels else "Not Specified"

# ----------------------------------------
# STEP 4: Load data into database (Upsert)
# ----------------------------------------
def seed_housing(records):
    """
    Upsert housing data: update existing records, insert new ones.
    Uses address as the unique identifier.
    No downtime window, only changes what's different.
    Removes stale records that no longer exist in the API.
    """
    print("Syncing housing data with database (upsert)...")
    
    inserted = 0
    updated = 0
    skipped = 0
    seen_addresses = set()

    for record in records:
        if not record.get("address") or not record.get("zip"):
            skipped += 1
            continue

        try:
            total_affordable_units = int(record.get("affordable_units", 0))
        except:
            total_affordable_units = 0

        try:
            total_ada_units = int(record.get("total_ada_units", 0))
        except:
            total_ada_units = 0

        try:
            latitude = float(record.get("latitude")) if record.get("latitude") else None
            longitude = float(record.get("longitude")) if record.get("longitude") else None
        except:
            latitude = None
            longitude = None

        address = record.get("address", "")
        seen_addresses.add(address)

        street_view = fetch_street_view(
            address=f"{address}, Austin, TX",
            latitude=latitude,
            longitude=longitude,
        )
        walk_score, transit_score, bike_score = fetch_walkability_score(
            f"{address}, Austin, TX", latitude, longitude)

        # Check if housing with this address already exists
        existing = Housing.query.filter_by(address=address).first()
        
        if existing:
            # Update existing record
            existing.project_name = record.get("project_name", "Unknown")
            existing.zip_code = record.get("zip", "")
            existing.unit_type = record.get("unit_type", "")
            existing.housing_tenure = record.get("housing_tenure", "")
            existing.income_restriction_level = get_income_restriction(record)
            existing.total_ada_units = total_ada_units
            existing.total_affordable_units = total_affordable_units
            existing.council_district = record.get("council_district", "")
            existing.latitude = latitude
            existing.longitude = longitude
            if street_view:
                existing.street_view_image = street_view
            existing.last_synced_at = datetime.now(timezone.utc)
            existing.walk_score = walk_score

            updated += 1
        else:
            # Insert new record
            housing = Housing(
                project_name=record.get("project_name", "Unknown"),
                address=address,
                zip_code=record.get("zip", ""),
                unit_type=record.get("unit_type", ""),
                housing_tenure=record.get("housing_tenure", ""),
                income_restriction_level=get_income_restriction(record),
                total_ada_units=total_ada_units,
                total_affordable_units=total_affordable_units,
                council_district=record.get("council_district", ""),
                latitude=latitude,
                longitude=longitude,
                street_view_image=street_view,
                last_synced_at=datetime.now(timezone.utc),
                walk_score=walk_score,
            )
            db.session.add(housing)
            inserted += 1

    # Remove stale records that no longer exist in the API
    deleted = Housing.query.filter(Housing.address.notin_(seen_addresses)).delete(synchronize_session=False)
    
    db.session.commit()
    print(f"Inserted {inserted} new records, updated {updated}, deleted {deleted} stale records, skipped {skipped}")


# ----------------------------------------
# Refresh street view images only (no API pull, no merge)
# ----------------------------------------
def refresh_street_views():
    """Re-fetch street view images for all existing Housing rows. Does not touch other data."""
    print("Refreshing street view images for all housing records...")
    rows = Housing.query.all()
    updated = 0
    failed = 0
    for i, housing in enumerate(rows):
        if not housing.address and (housing.latitude is None or housing.longitude is None):
            failed += 1
            continue
        full_address = f"{housing.address}, Austin, TX" if housing.address else None
        img = fetch_street_view(
            address=full_address,
            latitude=housing.latitude,
            longitude=housing.longitude,
        )
        if img:
            housing.street_view_image = img
            housing.last_synced_at = datetime.now(timezone.utc)
            updated += 1
        else:
            failed += 1
        if (i + 1) % 10 == 0:
            print(f"  Processed {i + 1}/{len(rows)}...")
    db.session.commit()
    print(f"Done. Updated {updated} images, {failed} skipped or failed.")


# ----------------------------------------
# MAIN
# ----------------------------------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        if "--refresh-street-view" in sys.argv:
            refresh_street_views()
        else:
            records = fetch_housing_data()
            records = merge_records_by_project_name(records)
            print(f"Merged to {len(records)} records by project_name")
            seed_housing(records)
        print("Done!")
        