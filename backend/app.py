from flask import Flask, jsonify, request, redirect
from flask_cors import CORS
from dotenv import load_dotenv
import os
import math

from models import db, Housing, Community, Transportation
from flask_migrate import Migrate

load_dotenv()


def haversine_miles(lat1, lon1, lat2, lon2):
    radius_miles = 3958.8

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_miles * c


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
        payload = housing.to_dict(include_relations=True)

        transport_candidates = [
            t for t in housing.transportation
            if t.latitude is not None and t.longitude is not None
        ]

        nearest_stop = None
        if (
            housing.latitude is not None
            and housing.longitude is not None
            and transport_candidates
        ):
            nearest_stop = min(
                transport_candidates,
                key=lambda t: (housing.latitude - t.latitude) ** 2 + (housing.longitude - t.longitude) ** 2,
            )

        if nearest_stop:
            approx_miles = haversine_miles(
                housing.latitude,
                housing.longitude,
                nearest_stop.latitude,
                nearest_stop.longitude,
            )

            maps_key = os.getenv("GOOGLE_MAPS_API_KEY")
            walking_map_embed_url = None

            if maps_key:
                walking_map_embed_url = (
                    "https://www.google.com/maps/embed/v1/directions"
                    f"?key={maps_key}"
                    f"&origin={housing.latitude},{housing.longitude}"
                    f"&destination={nearest_stop.latitude},{nearest_stop.longitude}"
                    "&mode=walking"
                )

            payload.update({
                "closest_stop_frequency": nearest_stop.frequency,
                "walking_distance": f"~{round(approx_miles, 2)} miles (approx)",
                "walking_map_embed_url": walking_map_embed_url,
            })

        return jsonify(payload)

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

if __name__ == "__main__": # pragma: no cover
    if os.getenv("FLASK_ENV") != "production":
        with app.app_context():
            db.create_all()

    app.run(host="0.0.0.0", port=5000, debug=True)