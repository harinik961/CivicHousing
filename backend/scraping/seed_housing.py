import requests
import os
import sys
import base64
from datetime import datetime
import timezone


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

# ----------------------------------------
# SETUP FLASK APP AND DB CONNECTION
# ----------------------------------------
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

GOOGLE_MAPS_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
APP_TOKEN = os.getenv("APP_TOKEN_HOUSING")

def fetch_street_view(address):
    try:
        url = "https://maps.googleapis.com/maps/api/streetview"
        params = {
            "size": "600x400",
            "location": address,
            "key": GOOGLE_MAPS_KEY
        }
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200 and response.headers.get("content-type", "").startswith("image"):
            return base64.b64encode(response.content).decode("utf-8")
    except Exception as e:
        print(f"Street view fetch failed for {address}: {e}")
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
        "$select": "*, :updated_at"
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
# STEP 2: Helper for income restriction
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
# STEP 3: Load data into database (Upsert)
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

        street_view = fetch_street_view(f"{address}, Austin, TX")

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
                last_synced_at=datetime.now(timezone.utc)

            )
            db.session.add(housing)
            inserted += 1

    # Remove stale records that no longer exist in the API
    deleted = Housing.query.filter(Housing.address.notin_(seen_addresses)).delete(synchronize_session=False)
    
    db.session.commit()
    print(f"Inserted {inserted} new records, updated {updated}, deleted {deleted} stale records, skipped {skipped}")

# ----------------------------------------
# MAIN
# ----------------------------------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        records = fetch_housing_data()
        seed_housing(records)
        print("Done!")
        