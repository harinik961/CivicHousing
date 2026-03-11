import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
from flask import Flask
from models import db, Community, Housing, Transportation

load_dotenv()

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


def seed_associations():

    print("Seeding associations by zip code...")

    communities = Community.query.all()
    housings = Housing.query.all()
    stops = Transportation.query.all()

    linked_ch = 0
    linked_ht = 0
    linked_ct = 0

    # -------------------------
    # COMMUNITY ↔ HOUSING
    # -------------------------

    for community in communities:

        community_zip = str(community.zip_code).strip()

        for housing in housings:

            if not housing.zip_code:
                continue

            housing_zip = str(housing.zip_code).strip()

            if housing_zip == community_zip:

                # prevent duplicate insert
                if housing not in community.housing:
                    community.housing.append(housing)
                    linked_ch += 1

    print(f"Linked {linked_ch} community <-> housing pairs")

    # -------------------------
    # HOUSING ↔ TRANSPORTATION
    # -------------------------

    DEGREE_THRESHOLD = 0.0072  # ~0.5 miles

    for housing in housings:

        if housing.latitude is None or housing.longitude is None:
            continue

        for stop in stops:

            if stop.latitude is None or stop.longitude is None:
                continue

            lat_diff = abs(housing.latitude - stop.latitude)
            lon_diff = abs(housing.longitude - stop.longitude)

            if lat_diff <= DEGREE_THRESHOLD and lon_diff <= DEGREE_THRESHOLD:

                if stop not in housing.transportation:
                    housing.transportation.append(stop)
                    linked_ht += 1

    print(f"Linked {linked_ht} housing <-> transportation pairs")

    # -------------------------
    # COMMUNITY ↔ TRANSPORTATION
    # -------------------------

    for community in communities:

        for housing in community.housing:

            for stop in housing.transportation:

                if stop not in community.transportation:
                    community.transportation.append(stop)
                    linked_ct += 1

    print(f"Linked {linked_ct} community <-> transportation pairs")

    # commit everything once
    db.session.commit()

    print("Done!")


if __name__ == "__main__":

    with app.app_context():

        print("Community rows:", Community.query.count())
        print("Housing rows:", Housing.query.count())
        print("Transportation rows:", Transportation.query.count())

        seed_associations()