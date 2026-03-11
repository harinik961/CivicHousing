from flask import Flask, jsonify, request, redirect
from flask_cors import CORS
from dotenv import load_dotenv
import os

from models import db, Housing, Community, Transportation
from flask_migrate import Migrate

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
    @app.route("/", methods=["GET"])
    def index():
        return jsonify({
            "message": "CivicHousing API is running.",
            "api": "/api",
            "docs": "/docs",
            "health": "/health"
        })

    @app.route("/health", methods=["GET"])
    def health():
        return {"status": "ok"}

    @app.route("/api", methods=["GET"])
    def api_info():
        return jsonify({
            "name": "CivicHousing API",
            "version": "1.0",
            "description": "API for CivicHousing housing, community, and transportation data.",
            "resources": {
                "housing": {
                    "list": "/api/housing",
                    "detail": "/api/housing/<id>"
                },
                "community": {
                    "list": "/api/community",
                    "detail": "/api/community/<id>"
                },
                "transportation": {
                    "list": "/api/transportation",
                    "detail": "/api/transportation/<id>"
                }
            },
            "system": {
                "health": "/health"
            },
            "documentation": "/docs"
        })
        
    @app.route("/docs", methods=["GET"])
    def docs():
        return redirect("https://documenter.getpostman.com/view/52514232/2sBXcDHMyK", code=302)

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

        return jsonify(housing.to_dict(include_relations=True))

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
            "data": [c.to_dict(include_relations=True) for c in pagination.items],
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages
        })

    @app.route("/api/community/<int:id>", methods=["GET"], strict_slashes=False)
    def get_community(id):

        community = Community.query.get_or_404(id)

        return jsonify(community.to_dict(include_relations=True))

    # -----------------------------
    # TRANSPORTATION
    # -----------------------------
    @app.route("/api/transportation", methods=["GET"], strict_slashes=False)
    def get_transportation():

        page = request.args.get("page", 1, type=int)
        per_page = 50

        query = Transportation.query

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "data": [t.to_dict() for t in pagination.items],
            "total": pagination.total,
            "page": page,
            "pages": pagination.pages
        })

    @app.route("/api/transportation/<int:id>", methods=["GET"], strict_slashes=False)
    def get_one_transportation(id):

        transportation = Transportation.query.get_or_404(id)

        return jsonify(transportation.to_dict(include_relations=True))

    return app


app = create_app()
application = app


if __name__ == "__main__":
    if os.getenv("FLASK_ENV") != "production":
        with app.app_context():
            db.create_all()

    app.run(host="0.0.0.0", port=5000, debug=True)