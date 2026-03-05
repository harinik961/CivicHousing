from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os

from models import db, Housing

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    with app.app_context():
        db.create_all()

    @app.route("/")
    def index():
        return {"message": "CivicHousing API is running."}

    @app.route("/health")
    def health():
        return {"status": "ok"}

    @app.route("/api/housing", methods=["GET"])
    def get_housing():
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 100, type=int)
        pagination = Housing.query.paginate(page=page, per_page=per_page, error_out=False)
        return jsonify({
            "data": [h.to_dict() for h in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": pagination.pages
        })

    @app.route("/api/housing/<int:id>", methods=["GET"])
    def get_one_housing(id):
        housing = Housing.query.get_or_404(id)
        return jsonify(housing.to_dict())

    @app.route("/api/community", methods=["GET"])
    def get_communities():
        return {"message": "get all communities"}

    @app.route("/api/community/<int:id>", methods=["GET"])
    def get_community(id):
        return {"message": f"get community {id}"}

    @app.route("/api/transportation", methods=["GET"])
    def get_transportation():
        return {"message": "get all transportation"}

    @app.route("/api/transportation/<int:id>", methods=["GET"])
    def get_one_transportation(id):
        return {"message": f"get transportation {id}"}

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
    