import requests
import os
import sys

# Add backend folder to path so we can import models
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
from flask import Flask
from models import db, Housing

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

# ----------------------------------------
# CONFIGURATION
# ----------------------------------------
APP_TOKEN = "eB6v7DTNNhE5gKWwdRFK2Dzl0"
BASE_URL = "https://data.austintexas.gov/resource/ifzc-3xz8.json"

# ----------------------------------------
# SETUP FLASK APP AND DB CONNECTION
# ----------------------------------------
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

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
# STEP 3: Load data into database
# ----------------------------------------
def seed_housing(records):
    inserted = 0
    skipped = 0

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

        housing = Housing(
            project_name=record.get("project_name", "Unknown"),
            address=record.get("address", ""),
            zip_code=record.get("zip", ""),
            unit_type=record.get("unit_type", ""),
            housing_tenure=record.get("housing_tenure", ""),
            income_restriction_level=get_income_restriction(record),
            total_ada_units=total_ada_units,
            total_affordable_units=total_affordable_units,
            council_district=record.get("council_district", ""),
            latitude=latitude,
            longitude=longitude,
        )

        db.session.add(housing)
        inserted += 1

    db.session.commit()
    print(f"Inserted {inserted} housing records, skipped {skipped}")

# ----------------------------------------
# MAIN
# ----------------------------------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        records = fetch_housing_data()
        seed_housing(records)
        print("Done!")
        