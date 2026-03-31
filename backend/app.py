from flask import Flask, jsonify, request, redirect
from flask_cors import CORS
from dotenv import load_dotenv
import os
import math
import requests
from sqlalchemy import cast, Integer
from sqlalchemy.sql import func
from models import db, Housing, Community, Transportation
from flask_migrate import Migrate
from search import search_housing, search_communities, search_transportation, global_search

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


def nearest_transport_stop_for_housing(housing):
    if housing.latitude is None or housing.longitude is None:
        return None

    transport_candidates = [
        t
        for t in Transportation.query.filter(
            Transportation.latitude.isnot(None),
            Transportation.longitude.isnot(None),
        ).all()
    ]

    if not transport_candidates:
        return None

    return min(
        transport_candidates,
        key=lambda t: haversine_miles(
            housing.latitude,
            housing.longitude,
            t.latitude,
            t.longitude,
        ),
    )


def get_google_walking_distance_miles(
    origin_lat, origin_lng, dest_lat, dest_lng, api_key
):
    if not api_key:
        return None

    try:
        response = requests.get(
            "https://maps.googleapis.com/maps/api/directions/json",
            params={
                "origin": f"{origin_lat},{origin_lng}",
                "destination": f"{dest_lat},{dest_lng}",
                "mode": "walking",
                "key": api_key,
            },
            timeout=6,
        )
        response.raise_for_status()

        body = response.json()
        if body.get("status") != "OK":
            return None

        routes = body.get("routes") or []
        if not routes:
            return None

        legs = routes[0].get("legs") or []
        if not legs:
            return None

        distance_info = legs[0].get("distance") or {}
        distance_meters = distance_info.get("value")
        if distance_meters is None:
            return None

        return float(distance_meters) / 1609.344
    except Exception:
        return None


def create_app():

    app = Flask(__name__)
    CORS(app)

    database_uri = (
        os.getenv("DATABASE_URL")
        or os.getenv("SQLALCHEMY_DATABASE_URI")
        or "sqlite:////app/local-dev.db"
    )
    app.config["SQLALCHEMY_DATABASE_URI"] = database_uri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    migrate = Migrate(app, db)

    auto_create_tables = os.getenv("AUTO_CREATE_TABLES")
    should_auto_create = (
        auto_create_tables.lower() == "true"
        if auto_create_tables is not None
        else database_uri.startswith("sqlite")
    )
    if should_auto_create:
        with app.app_context():
            db.create_all()

    # -----------------------------
    # Root Routes
    # -----------------------------
    @app.route("/", methods=["GET"])
    def index():
        return jsonify(
            {
                "message": "CivicHousing API is running.",
                "api": "/api",
                "docs": "/docs",
                "health": "/health",
            }
        )

    @app.route("/health", methods=["GET"])
    def health():
        return {"status": "ok"}

    @app.route("/api", methods=["GET"])
    def api_info():
        return jsonify(
            {
                "name": "CivicHousing API",
                "version": "1.0",
                "description": "API for CivicHousing housing, community, and transportation data.",
                "resources": {
                    "housing": {"list": "/api/housing", "detail": "/api/housing/<id>"},
                    "community": {
                        "list": "/api/community",
                        "detail": "/api/community/<id>",
                    },
                    "transportation": {
                        "list": "/api/transportation",
                        "detail": "/api/transportation/<id>",
                    },
                },
                "system": {"health": "/health"},
                "documentation": "/docs",
            }
        )

    @app.route("/docs", methods=["GET"])
    def docs():
        return redirect(
            "https://documenter.getpostman.com/view/52514232/2sBXcDHMyK", code=302
        )
    
    @app.route("/api/search", methods=["GET"])
    def global_search_route():
        query = request.args.get("q", "")
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))

        results, total, pages = global_search(query, page=page, per_page=per_page)

        return jsonify({
            "results": results,
            "total": total,
            "page": page,
            "pages": pages
        })

    # -----------------------------
    # HOUSING
    # -----------------------------
    @app.route("/api/housing", methods=["GET"], strict_slashes=False)
    def get_housing():

        page = request.args.get("page", 1, type=int)
        per_page = 50

        # --- FILTER PARAMS (MATCH FRONTEND EXACTLY) ---
        unit_type = request.args.get("unit_type")
        housing_tenure = request.args.get("housing_tenure")
        zip_code = request.args.get("zip_code")

        query = Housing.query

        # --- FILTERS ---
        if unit_type:
            query = query.filter(Housing.unit_type == unit_type)

        if housing_tenure:
            query = query.filter(Housing.housing_tenure == housing_tenure)

        if zip_code:
            query = query.filter(Housing.zip_code == zip_code)

        # --- SORTING ---
        sort = request.args.get("sort")
        order = request.args.get("order", "asc")
        if not sort:
            sort = "id"
            order = "asc"

        SORT_MAP = {
            "walk_score": Housing.walk_score,
            "total_affordable_units": cast(
                func.coalesce(Housing.total_affordable_units, 0),
                Integer
            ),           
            "id": Housing.id,
            "income_restriction_level": cast(
                func.split_part(
                    func.replace(Housing.income_restriction_level, "% AMI", ""),
                    ",",
                    1
                ),
                Integer
            )
        }

        if sort in SORT_MAP:
            column = SORT_MAP[sort]
            query = query.order_by(column.desc() if order == "desc" else column.asc())

        # --- PAGINATION (ALWAYS LAST) ---
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify(
            {
                "data": [h.to_dict() for h in pagination.items],
                "total": pagination.total,
                "page": page,
                "pages": pagination.pages,
            }
        )

    @app.route("/api/housing/<int:id>", methods=["GET"], strict_slashes=False)
    def get_one_housing(id):

        housing = Housing.query.get_or_404(id)
        payload = housing.to_dict(include_relations=True)

        nearest_stop = nearest_transport_stop_for_housing(housing)

        if nearest_stop:
            approx_miles = haversine_miles(
                housing.latitude,
                housing.longitude,
                nearest_stop.latitude,
                nearest_stop.longitude,
            )

            maps_key = os.getenv("GOOGLE_MAPS_API_KEY")
            walking_map_embed_url = None
            walking_distance_miles = get_google_walking_distance_miles(
                housing.latitude,
                housing.longitude,
                nearest_stop.latitude,
                nearest_stop.longitude,
                maps_key,
            )

            if maps_key:
                walking_map_embed_url = (
                    "https://www.google.com/maps/embed/v1/directions"
                    f"?key={maps_key}"
                    f"&origin={housing.latitude},{housing.longitude}"
                    f"&destination={nearest_stop.latitude},{nearest_stop.longitude}"
                    "&mode=walking"
                )

            distance_miles = (
                walking_distance_miles
                if walking_distance_miles is not None
                else approx_miles
            )

            payload.update(
                {
                    "closest_stop_frequency": nearest_stop.frequency,
                    "walking_distance": f"~{round(distance_miles, 2)} miles (walking route)",
                    "walking_map_embed_url": walking_map_embed_url,
                    "transportation": [nearest_stop.to_dict()],
                }
            )

        return jsonify(payload)
    
    @app.route("/api/search/housing", methods=["GET"])
    def housing_search_route():
        query = request.args.get("q", "")
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))

        results, total, pages = search_housing(query, page=page, per_page=per_page)

        return jsonify({
            "results": results,
            "total": total,
            "page": page,
            "pages": pages
        })

    # -----------------------------
    # COMMUNITY
    # -----------------------------
    @app.route("/api/community", methods=["GET"], strict_slashes=False)
    def get_communities():

        page = request.args.get("page", 1, type=int)
        per_page = 50
        median_housing_price = request.args.get("median_housing_price", type = int)
        crime_index = request.args.get("crime_index", type=int)
        transit_score = request.args.get("transit_score", type = int)
        population = request.args.get("population", type = int)
        population_min = request.args.get("population_min", type=int)
        population_max = request.args.get("population_max", type=int)

        health_count = request.args.get("health_count", type = int)
        zipcode = request.args.get("zipcode")




        query = Community.query

        #filtering 
        if median_housing_price:
            query = query.filter(Community.median_housing_price == median_housing_price)
        if crime_index:
            query = query.filter(Community.crime_index == crime_index)
        if transit_score:
            query = query.filter(Community.transit_score == transit_score)
        if health_count:
            query = query.filter(Community.health_count == health_count)
        if population_min: 
            query = query.filter(Community.population >= population_min)
        if population_max:
            query = query.filter(Community.population <= population_max)


        sort = request.args.get("sort")
        order = request.args.get("order", "asc")
        print(f"DEBUG sort={sort} order={order}")

        SORT_MAP = {
           "median_housing_price": Community.median_housing_price,
           "health_count": Community.health_count,
           "crime_index": Community.crime_index,
           "park_count": Community.park_count,

        }

        if sort in SORT_MAP:
            column = SORT_MAP[sort]
            query = query.order_by(column.desc() if order == "desc" else column.asc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify(
            {
                "data": [c.to_dict(include_relations=True) for c in pagination.items],
                "total": pagination.total,
                "page": page,
                "pages": pagination.pages,
            }
        )

    @app.route("/api/community/<int:id>", methods=["GET"], strict_slashes=False)
    def get_community(id):

        community = Community.query.get_or_404(id)

        return jsonify(community.to_dict(include_relations=True))
    
    @app.route("/api/search/community", methods=["GET"])
    def community_search_route():
        query = request.args.get("q", "")
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))

        results, total, pages = search_communities(query, page=page, per_page=per_page)

        return jsonify({
            "results": results,
            "total": total,
            "page": page,
            "pages": pages
        })

    # -----------------------------
    # TRANSPORTATION
    # -----------------------------

    @app.route("/api/transportation", methods=["GET"], strict_slashes=False)
    def get_transportation():

        page = request.args.get("page", 1, type=int)
        per_page = 50

        query = Transportation.query

        # --- SORTING ---
        sort = request.args.get("sort")
        order = request.args.get("order", "asc")

        SORT_MAP = {
            "num_routes": Transportation.num_routes,
            "travel_time_ut_minutes": Transportation.travel_time_ut_minutes,
            "travel_time_downtown_minutes": Transportation.travel_time_downtown_minutes,
            "travel_time_domain_minutes": Transportation.travel_time_domain_minutes,
        }

        if sort in SORT_MAP:
            column = SORT_MAP[sort]
            query = query.order_by(column.desc() if order == "desc" else column.asc())
            
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify(
            {
                "data": [c.to_dict(include_relations=True) for c in pagination.items],
                "total": pagination.total,
                "page": page,
                "pages": pagination.pages,
            }
        )

    @app.route("/api/transportation/<int:id>", methods=["GET"], strict_slashes=False)
    def get_one_transportation(id):

        transportation = Transportation.query.get_or_404(id)

        return jsonify(transportation.to_dict(include_relations=True))
    
    @app.route("/api/search/transportation", methods=["GET"])
    def transportation_search_route():
        query = request.args.get("q", "")
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))

        results, total, pages = search_transportation(query, page=page, per_page=per_page)

        return jsonify({
            "results": results,
            "total": total,
            "page": page,
            "pages": pages
        })

    return app


app = create_app()
application = app

if __name__ == "__main__":  # pragma: no cover
    app.run(host="0.0.0.0", port=0, debug=True)

