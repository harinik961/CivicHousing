from flask import Flask, app, jsonify, request, redirect
from flask_cors import CORS
from dotenv import load_dotenv
import os
import math
import requests
from sqlalchemy import cast, Integer, case
from sqlalchemy.sql import func
from models import db, Housing, Community, Transportation
from flask_migrate import Migrate
from search import (
    search_housing,
    search_communities,
    search_transportation,
    global_search,
    combined_filter,
)

from nl_query import generate_sql, is_safe_sql, run_query, generate_answer
from austin_council_districts import zips_for_district

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


def community_satellite_image_url(lat, lon, zoom=15, size="600x400"):
    maps_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not maps_key:
        return None

    try:
        lat = float(lat)
        lon = float(lon)
        if not math.isfinite(lat) or not math.isfinite(lon):
            return None
    except (TypeError, ValueError):
        return None

    return (
        "https://maps.googleapis.com/maps/api/staticmap"
        f"?center={lat:.6f},{lon:.6f}"
        f"&zoom={zoom}&size={size}&maptype=satellite&key={maps_key}"
    )


def apply_community_image_override(payload):
    if not isinstance(payload, dict):
        return payload

    satellite_url = community_satellite_image_url(
        payload.get("latitude"), payload.get("longitude")
    )
    if satellite_url:
        payload["street_view_url"] = satellite_url

    return payload


HOUSING_SORT_MAP = {
    "walk_score": Housing.walk_score,
    "total_affordable_units": cast(
        func.coalesce(Housing.total_affordable_units, 0),
        Integer,
    ),
    "id": Housing.id,
    "income_restriction_level": cast(
        func.split_part(
            func.replace(Housing.income_restriction_level, "% AMI", ""),
            ",",
            1,
        ),
        Integer,
    ),
}


def housing_filter_conditions(args):
    conditions = []
    unit_type = args.get("unit_type")
    housing_tenure = args.get("housing_tenure")
    zip_code = args.get("zip_code")
    district = args.get("district", type=int)
    if unit_type:
        conditions.append(Housing.unit_type == unit_type)
    if housing_tenure:
        conditions.append(Housing.housing_tenure == housing_tenure)
    if zip_code:
        conditions.append(Housing.zip_code == zip_code)
    if district is not None:
        zips = zips_for_district(district)
        if zips:
            normalized_zip = func.left(func.trim(Housing.zip_code), 5)
            conditions.append(normalized_zip.in_(zips))
    return conditions


COMMUNITY_SORT_MAP = {
    "median_housing_price": Community.median_housing_price,
    "health_count": Community.health_count,
    "crime_index": Community.crime_index,
    "park_count": Community.park_count,
}


def community_filter_conditions(args):
    conditions = []
    median_housing_price = args.get("median_housing_price", type=int)
    crime_index = args.get("crime_index", type=int)
    transit_score = args.get("transit_score", type=int)
    population_min = args.get("population_min", type=int)
    population_max = args.get("population_max", type=int)
    health_count = args.get("health_count", type=int)
    if median_housing_price:
        conditions.append(Community.median_housing_price == median_housing_price)
    if crime_index:
        conditions.append(Community.crime_index == crime_index)
    if transit_score:
        conditions.append(Community.transit_score == transit_score)
    if health_count:
        conditions.append(Community.health_count == health_count)
    if population_min:
        conditions.append(Community.population >= population_min)
    if population_max:
        conditions.append(Community.population <= population_max)
    return conditions


TRANSPORT_SORT_MAP = {
    "num_routes": Transportation.num_routes,
    "travel_time_ut_minutes": Transportation.travel_time_ut_minutes,
    "travel_time_downtown_minutes": Transportation.travel_time_downtown_minutes,
    "travel_time_domain_minutes": Transportation.travel_time_domain_minutes,
}


def transportation_filter_conditions(args):
    conditions = []
    transport_type = args.get("transport_type")
    wheelchair_accessible = args.get("wheelchair_accessible")
    num_routes_min = args.get("num_routes_min", type=int)
    num_routes_max = args.get("num_routes_max", type=int)
    travel_time_ut_minutes_min = args.get("travel_time_ut_minutes_min", type=int)
    travel_time_ut_minutes_max = args.get("travel_time_ut_minutes_max", type=int)
    travel_time_downtown_minutes_min = args.get(
        "travel_time_downtown_minutes_min", type=int
    )
    travel_time_downtown_minutes_max = args.get(
        "travel_time_downtown_minutes_max", type=int
    )
    if transport_type:
        conditions.append(Transportation.transport_type == transport_type)
    if wheelchair_accessible:
        conditions.append(Transportation.wheelchair_accessible == wheelchair_accessible)
    if num_routes_min is not None:
        conditions.append(Transportation.num_routes >= num_routes_min)
    if num_routes_max is not None:
        conditions.append(Transportation.num_routes <= num_routes_max)
    if travel_time_ut_minutes_min is not None:
        conditions.append(
            Transportation.travel_time_ut_minutes >= travel_time_ut_minutes_min
        )
    if travel_time_ut_minutes_max is not None:
        conditions.append(
            Transportation.travel_time_ut_minutes <= travel_time_ut_minutes_max
        )
    if travel_time_downtown_minutes_min is not None:
        conditions.append(
            Transportation.travel_time_downtown_minutes
            >= travel_time_downtown_minutes_min
        )
    if travel_time_downtown_minutes_max is not None:
        conditions.append(
            Transportation.travel_time_downtown_minutes
            <= travel_time_downtown_minutes_max
        )
    return conditions


def housing_stats_payload(args):
    q = args.get("q", "")
    filt = combined_filter(Housing, q, housing_filter_conditions(args))
    stmt = db.session.query(
        func.count(Housing.id),
        func.coalesce(func.sum(Housing.total_affordable_units), 0),
        func.avg(Housing.walk_score),
        func.coalesce(func.sum(Housing.total_ada_units), 0),
    )
    if filt is not None:
        stmt = stmt.filter(filt)
    c, sum_u, avg_w, sum_a = stmt.one()
    return {
        "count": int(c or 0),
        "total_affordable_units": int(sum_u or 0),
        "avg_walk_score": round(float(avg_w), 1) if avg_w is not None else None,
        "total_ada_units": int(sum_a or 0),
    }


def community_stats_payload(args):
    q = args.get("q", "")
    filt = combined_filter(Community, q, community_filter_conditions(args))
    stmt = db.session.query(
        func.count(Community.id),
        func.coalesce(func.sum(Community.population), 0),
        func.coalesce(func.sum(Community.community_total_affordable_units), 0),
        func.avg(Community.median_housing_price),
        func.avg(Community.transit_score),
        func.coalesce(func.sum(Community.park_count), 0),
        func.coalesce(func.sum(Community.health_count), 0),
    )
    if filt is not None:
        stmt = stmt.filter(filt)
    row = stmt.one()
    c, pop_sum, aff_sum, avg_price, avg_transit, parks, health = row
    return {
        "count": int(c or 0),
        "population_sum": int(pop_sum or 0),
        "community_total_affordable_units_sum": int(aff_sum or 0),
        "avg_median_housing_price": (
            round(float(avg_price), 1) if avg_price is not None else None
        ),
        "avg_transit_score": (
            round(float(avg_transit), 1) if avg_transit is not None else None
        ),
        "park_count_sum": int(parks or 0),
        "health_count_sum": int(health or 0),
    }


def transportation_stats_payload(args):
    q = args.get("q", "")
    filt = combined_filter(Transportation, q, transportation_filter_conditions(args))
    wheelchair_yes = case(
        (Transportation.wheelchair_accessible == "Wheelchair Accessible", 1),
        else_=0,
    )
    stmt = db.session.query(
        func.count(Transportation.id),
        func.avg(Transportation.num_routes),
        func.avg(Transportation.travel_time_ut_minutes),
        func.avg(Transportation.travel_time_downtown_minutes),
        func.sum(wheelchair_yes),
    )
    if filt is not None:
        stmt = stmt.filter(filt)
    c, avg_nr, avg_ut, avg_dt, wc_count = stmt.one()
    cnt = int(c or 0)
    wc = int(wc_count or 0)
    return {
        "count": cnt,
        "avg_num_routes": round(float(avg_nr), 1) if avg_nr is not None else None,
        "avg_travel_time_ut_minutes": (
            round(float(avg_ut), 1) if avg_ut is not None else None
        ),
        "avg_travel_time_downtown_minutes": (
            round(float(avg_dt), 1) if avg_dt is not None else None
        ),
        "wheelchair_accessible_stops": wc,
        "wheelchair_accessible_pct": round(100.0 * wc / cnt, 1) if cnt else None,
    }


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
                    "search": {
                        "list": "/api/search",
                        "detail": "/api/search/community",
                        "detail": "/api/search/housing",
                        "detail": "/api/search/transportation",
                    },
                },
                "system": {"health": "/health"},
                "documentation": "/docs",
            }
        )

    @app.route("/api/data-as-of", methods=["GET"])
    def data_as_of():
        latest_sync = db.session.query(func.max(Housing.last_synced_at)).scalar()
        return jsonify(
            {
                "last_synced_at": latest_sync.isoformat() if latest_sync else None,
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

        for item in results:
            if item.get("type") == "community" and isinstance(item.get("data"), dict):
                item["data"] = apply_community_image_override(item["data"])

        return jsonify(
            {"results": results, "total": total, "page": page, "pages": pages}
        )

    # -----------------------------
    # HOUSING
    # -----------------------------
    @app.route("/api/housing", methods=["GET"], strict_slashes=False)
    def get_housing():

        page = request.args.get("page", 1, type=int)
        per_page = 50

        query = Housing.query
        for condition in housing_filter_conditions(request.args):
            query = query.filter(condition)

        # --- SORTING ---
        sort = request.args.get("sort")
        order = request.args.get("order", "asc")
        if not sort:
            sort = "id"
            order = "asc"

        if sort in HOUSING_SORT_MAP:
            column = HOUSING_SORT_MAP[sort]
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

    @app.route("/api/housing/stats", methods=["GET"], strict_slashes=False)
    def get_housing_stats():
        return jsonify(housing_stats_payload(request.args))

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
        q = request.args.get("q", "")
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        sort = request.args.get("sort")
        order = request.args.get("order", "asc")
        sort_col = HOUSING_SORT_MAP.get(sort) if sort else None

        results, total, pages = search_housing(
            q,
            page=page,
            per_page=per_page,
            extra_filters=housing_filter_conditions(request.args),
            sort_column=sort_col,
            order=order,
        )

        return jsonify(
            {"results": results, "total": total, "page": page, "pages": pages}
        )

    # -----------------------------
    # COMMUNITY
    # -----------------------------
    @app.route("/api/community", methods=["GET"], strict_slashes=False)
    def get_communities():

        page = request.args.get("page", 1, type=int)
        per_page = 50

        query = Community.query
        for condition in community_filter_conditions(request.args):
            query = query.filter(condition)

        sort = request.args.get("sort")
        order = request.args.get("order", "asc")

        if sort in COMMUNITY_SORT_MAP:
            column = COMMUNITY_SORT_MAP[sort]
            query = query.order_by(column.desc() if order == "desc" else column.asc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        data = [
            apply_community_image_override(c.to_dict(include_relations=False))
            for c in pagination.items
        ]

        return jsonify(
            {
                "data": data,
                "total": pagination.total,
                "page": page,
                "pages": pagination.pages,
            }
        )

    @app.route("/api/community/stats", methods=["GET"], strict_slashes=False)
    def get_community_stats():
        return jsonify(community_stats_payload(request.args))

    @app.route("/api/community/<int:id>", methods=["GET"], strict_slashes=False)
    def get_community(id):

        community = Community.query.get_or_404(id)

        return jsonify(
            apply_community_image_override(community.to_dict(include_relations=True))
        )

    @app.route("/api/search/community", methods=["GET"])
    def community_search_route():
        q = request.args.get("q", "")
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        sort = request.args.get("sort")
        order = request.args.get("order", "asc")
        sort_col = COMMUNITY_SORT_MAP.get(sort) if sort else None

        results, total, pages = search_communities(
            q,
            page=page,
            per_page=per_page,
            extra_filters=community_filter_conditions(request.args),
            sort_column=sort_col,
            order=order,
        )

        for item in results:
            if isinstance(item.get("data"), dict):
                item["data"] = apply_community_image_override(item["data"])

        return jsonify(
            {"results": results, "total": total, "page": page, "pages": pages}
        )

    # -----------------------------
    # TRANSPORTATION
    # -----------------------------

    @app.route("/api/transportation", methods=["GET"], strict_slashes=False)
    def get_transportation():

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 50, type=int)

        query = Transportation.query
        for condition in transportation_filter_conditions(request.args):
            query = query.filter(condition)

        # --- SORTING ---
        sort = request.args.get("sort")
        order = request.args.get("order", "asc")

        if sort in TRANSPORT_SORT_MAP:
            column = TRANSPORT_SORT_MAP[sort]
            query = query.order_by(column.desc() if order == "desc" else column.asc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify(
            {
                "data": [c.to_dict(include_relations=False) for c in pagination.items],
                "total": pagination.total,
                "page": page,
                "pages": pagination.pages,
            }
        )

    @app.route("/api/transportation/stats", methods=["GET"], strict_slashes=False)
    def get_transportation_stats():
        return jsonify(transportation_stats_payload(request.args))

    @app.route("/api/transportation/<int:id>", methods=["GET"], strict_slashes=False)
    def get_one_transportation(id):

        transportation = Transportation.query.get_or_404(id)

        return jsonify(transportation.to_dict(include_relations=True))

    @app.route("/api/search/transportation", methods=["GET"])
    def transportation_search_route():
        q = request.args.get("q", "")
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        sort = request.args.get("sort")
        order = request.args.get("order", "asc")
        sort_col = TRANSPORT_SORT_MAP.get(sort) if sort else None

        results, total, pages = search_transportation(
            q,
            page=page,
            per_page=per_page,
            extra_filters=transportation_filter_conditions(request.args),
            sort_column=sort_col,
            order=order,
        )

        return jsonify(
            {"results": results, "total": total, "page": page, "pages": pages}
        )

    @app.route("/api/nl-query", methods=["POST"])
    def nl_query():
        data = request.get_json()
        question = data.get("question")

        if not question:
            return jsonify({"error": "Missing question"}), 400

        try:
            sql = generate_sql(question)

            if not is_safe_sql(sql):
                return jsonify({"error": "Unsafe query blocked", "sql": sql}), 400

            results = run_query(sql)

            if results:
                answer = generate_answer(question, results)
            else:
                answer = "No results found."

            return jsonify(
                {"question": question, "sql": sql, "results": results, "answer": answer}
            )

        except Exception as e:
            print("Warning: Error processing NL query:", str(e))
            return jsonify({"error": str(e)}), 500

    return app


app = create_app()
application = app

if __name__ == "__main__":  # pragma: no cover
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8000")), debug=True)
