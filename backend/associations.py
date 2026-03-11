import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
from flask import Flask
from sqlalchemy import text
from models import db, Community, Housing, Transportation

load_dotenv()

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


def seed_associations():

    print("\nStarting association seeding...")

    try:

        print("Clearing existing associations...")

        db.session.execute(text("DELETE FROM community_housing"))
        db.session.execute(text("DELETE FROM housing_transportation"))
        db.session.execute(text("DELETE FROM community_transportation"))

        # Community → nearest Housing

        print("Community → nearest housing")

        db.session.execute(text("""
            INSERT INTO community_housing (community_id, housing_id)
            SELECT c.id,
                   (
                       SELECT h.id
                       FROM housing h
                       WHERE h.latitude IS NOT NULL
                       AND h.longitude IS NOT NULL
                       ORDER BY
                           (c.latitude - h.latitude)*(c.latitude - h.latitude) +
                           (c.longitude - h.longitude)*(c.longitude - h.longitude)
                       LIMIT 1
                   )
            FROM communities c
            WHERE c.latitude IS NOT NULL
            AND c.longitude IS NOT NULL
            ON CONFLICT DO NOTHING
        """))

        # Community → nearest Transit

        print("Community → nearest transit")

        db.session.execute(text("""
            INSERT INTO community_transportation (community_id, transportation_id)
            SELECT c.id,
                   (
                       SELECT t.id
                       FROM transportation t
                       WHERE t.latitude IS NOT NULL
                       AND t.longitude IS NOT NULL
                       ORDER BY
                           (c.latitude - t.latitude)*(c.latitude - t.latitude) +
                           (c.longitude - t.longitude)*(c.longitude - t.longitude)
                       LIMIT 1
                   )
            FROM communities c
            WHERE c.latitude IS NOT NULL
            AND c.longitude IS NOT NULL
            ON CONFLICT DO NOTHING
        """))

        # Housing → nearest Community

        print("Housing → nearest community")

        db.session.execute(text("""
            INSERT INTO community_housing (community_id, housing_id)
            SELECT
                (
                    SELECT c.id
                    FROM communities c
                    WHERE c.latitude IS NOT NULL
                    AND c.longitude IS NOT NULL
                    ORDER BY
                        (h.latitude - c.latitude)*(h.latitude - c.latitude) +
                        (h.longitude - c.longitude)*(h.longitude - c.longitude)
                    LIMIT 1
                ),
                h.id
            FROM housing h
            WHERE h.latitude IS NOT NULL
            AND h.longitude IS NOT NULL
            ON CONFLICT DO NOTHING
        """))

        
        # Housing → nearest Transit

        print("Housing → nearest transit")

        db.session.execute(text("""
            INSERT INTO housing_transportation (housing_id, transportation_id)
            SELECT h.id,
                   (
                       SELECT t.id
                       FROM transportation t
                       WHERE t.latitude IS NOT NULL
                       AND t.longitude IS NOT NULL
                       ORDER BY
                           (h.latitude - t.latitude)*(h.latitude - t.latitude) +
                           (h.longitude - t.longitude)*(h.longitude - t.longitude)
                       LIMIT 1
                   )
            FROM housing h
            WHERE h.latitude IS NOT NULL
            AND h.longitude IS NOT NULL
            ON CONFLICT DO NOTHING
        """))

        # Transit → nearest Housing

        print("Transit → nearest housing")

        db.session.execute(text("""
            INSERT INTO housing_transportation (housing_id, transportation_id)
            SELECT
                (
                    SELECT h.id
                    FROM housing h
                    WHERE h.latitude IS NOT NULL
                    AND h.longitude IS NOT NULL
                    ORDER BY
                        (t.latitude - h.latitude)*(t.latitude - h.latitude) +
                        (t.longitude - h.longitude)*(t.longitude - h.longitude)
                    LIMIT 1
                ),
                t.id
            FROM transportation t
            WHERE t.latitude IS NOT NULL
            AND t.longitude IS NOT NULL
            ON CONFLICT DO NOTHING
        """))

        # Transit → nearest Community

        print("Transit → nearest community")

        db.session.execute(text("""
            INSERT INTO community_transportation (community_id, transportation_id)
            SELECT
                (
                    SELECT c.id
                    FROM communities c
                    WHERE c.latitude IS NOT NULL
                    AND c.longitude IS NOT NULL
                    ORDER BY
                        (t.latitude - c.latitude)*(t.latitude - c.latitude) +
                        (t.longitude - c.longitude)*(t.longitude - c.longitude)
                    LIMIT 1
                ),
                t.id
            FROM transportation t
            WHERE t.latitude IS NOT NULL
            AND t.longitude IS NOT NULL
            ON CONFLICT DO NOTHING
        """))

        db.session.commit()

        print("\nAssociations committed successfully.")

    except Exception as e:

        db.session.rollback()

        print("\nError occurred — transaction rolled back.")
        print(e)


def show_counts():

    ch = db.session.execute(text("SELECT COUNT(*) FROM community_housing")).scalar()
    ht = db.session.execute(text("SELECT COUNT(*) FROM housing_transportation")).scalar()
    ct = db.session.execute(text("SELECT COUNT(*) FROM community_transportation")).scalar()

    print("\nAssociation counts:")
    print("community_housing:", ch)
    print("housing_transportation:", ht)
    print("community_transportation:", ct)


if __name__ == "__main__":

    confirm = input(
        "\nThis will rebuild all association tables.\n"
        "Core tables will NOT be modified.\n"
        "Continue? (y/n): "
    )

    if confirm.lower() != "y":
        print("Aborted.")
        sys.exit()

    with app.app_context():

        print("\nRow counts before:")
        print("Community:", Community.query.count())
        print("Housing:", Housing.query.count())
        print("Transportation:", Transportation.query.count())

        seed_associations()

        show_counts()

        print("\nDone.")