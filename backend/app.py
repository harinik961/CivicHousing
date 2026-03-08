from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os

from models import db, Housing, Community, Transportation
from flask_migrate import Migrate
from sqlalchemy.orm import selectinload

load_dotenv()


def create_app():

    app = Flask(__name__)
    CORS(app)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    migrate = Migrate(app, db)

    # -----------------------------
    # Root Routes
    # -----------------------------
    @app.route("/")
    def index():
        return {"message": "CivicHousing API is running."}

    @app.route("/health")
    def health():
        return {"status": "ok"}

    # -----------------------------
    # HOUSING
    # -----------------------------
    @app.route("/api/housing", methods=["GET"], strict_slashes=False)
    def get_housing():

        page = request.args.get("page", 1, type=int)
        per_page = 50

        zip_code = request.args.get("zip")
        district = request.args.get("district")

        query = Housing.query

        if zip_code:
            query = query.filter(Housing.zip_code == zip_code)

        if district:
            query = query.filter(Housing.council_district == district)

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "data": [h.to_dict() for h in pagination.items],
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages
        })

    @app.route("/api/housing/<int:id>", methods=["GET"], strict_slashes=False)
    def get_one_housing(id):

        housing = Housing.query.get_or_404(id)

        return jsonify(housing.to_dict())

    # -----------------------------
    # COMMUNITY
    # -----------------------------
    @app.route("/api/community", methods=["GET"], strict_slashes=False)
    def get_communities():

        page = request.args.get("page", 1, type=int)
        per_page = 50

        query = Community.query

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "data": [c.to_dict() for c in pagination.items],
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages
        })

    @app.route("/api/community/<int:id>", methods=["GET"], strict_slashes=False)
    def get_community(id):

        community = Community.query.get_or_404(id)

        return jsonify(community.to_dict())

    # -----------------------------
    # TRANSPORTATION
    # -----------------------------
    @app.route("/api/transportation", methods=["GET"], strict_slashes=False)
    def get_transportation():

        page = request.args.get("page", 1, type=int)
        per_page = 50

        query = Transportation.query.options(
            selectinload(Transportation.communities)
        )

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "data": [t.to_dict() for t in pagination.items],
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages
        })

    @app.route("/api/transportation/<int:id>", methods=["GET"], strict_slashes=False)
    def get_one_transportation(id):

        transportation = (
            Transportation.query
            .options(selectinload(Transportation.communities))
            .get_or_404(id)
        )

        return jsonify(transportation.to_dict())

    return app


app = create_app()
application = app


if __name__ == "__main__":
    if os.getenv("FLASK_ENV") != "production":
        with app.app_context():
            db.create_all()

    app.run(host="0.0.0.0", port=5000, debug=True)