import os
import re
import sys

from dotenv import load_dotenv
from flask import Flask

# Add backend folder to path so we can import models
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from models import db, Transportation


load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)


def parse_duration_to_minutes(duration_text):
    """
    Convert Google-style duration text to total minutes.

    Supports values like:
    - "13 mins"
    - "1 min"
    - "1 hour 7 mins"
    - "2 hours 1 min"
    """
    if not duration_text:
        return None

    text = str(duration_text).strip().lower()
    if not text:
        return None

    hours_match = re.search(r"(\d+)\s*hour[s]?", text)
    mins_match = re.search(r"(\d+)\s*min[s]?", text)

    hours = int(hours_match.group(1)) if hours_match else 0
    mins = int(mins_match.group(1)) if mins_match else 0

    total = (hours * 60) + mins
    return total if total > 0 else None


def backfill_minutes():
    field_pairs = [
        ("travel_time_ut", "travel_time_ut_minutes"),
        ("travel_time_downtown", "travel_time_downtown_minutes"),
        ("travel_time_domain", "travel_time_domain_minutes"),
    ]

    records = Transportation.query.all()
    updated_rows = 0
    updated_fields = 0

    for record in records:
        row_changed = False

        for source_field, target_field in field_pairs:
            source_value = getattr(record, source_field, None)
            parsed_minutes = parse_duration_to_minutes(source_value)

            if getattr(record, target_field, None) != parsed_minutes:
                setattr(record, target_field, parsed_minutes)
                row_changed = True
                updated_fields += 1

        if row_changed:
            updated_rows += 1

    db.session.commit()

    print(f"Processed {len(records)} transportation records.")
    print(f"Updated {updated_rows} records.")
    print(f"Updated {updated_fields} minute fields.")


if __name__ == "__main__":
    with app.app_context():
        backfill_minutes()
