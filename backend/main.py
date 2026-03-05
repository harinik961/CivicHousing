from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from scraper import get_data
from models import db
from flask_migrate import Migrate

load_dotenv()


def create_app():

    app = Flask(__name__)

    CORS(app)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    migrate = Migrate(app, db)



    @app.route("/")
    def index():
        return {"message": "CivicHousing API is running."}

    @app.route("/health")
    def health():
        return {"status": "ok"}

    @app.route("/api/community")
    def get_communities():
        return {"message": "get all communities"}

    @app.route("/api/community/<int:id>")
    def get_community(id):
        return {"message": f"get community {id}"}

    @app.route("/api/housing")
    def get_housing():
        return {"message": "get all housing"}

    @app.route("/api/housing/<int:id>")
    def get_one_housing(id):
        return {"message": f"get housing {id}"}

    @app.route("/api/transportation")
    def get_transportation():
        return {"message": "get all transportation"}

    @app.route("/api/transportation/<int:id>")
    def get_one_transportation(id):
        return {"message": f"get transportation {id}"}

    @app.route("/scrape")
    def scrape():
        data = get_data()
        return jsonify(data)

    return app


app = create_app()

if __name__ == "__main__":
    with app.app_context():
        db.create_all()

    app.run(host="0.0.0.0", port=5000, debug=True)