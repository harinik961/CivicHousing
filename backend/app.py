from flask import Flask, jsonify
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)

    @app.route("/")
    def index():
        return {"message": "CivicHousing API is running."}

    @app.route("/health")
    def health():
        return {"status": "ok"}

    @app.route("/api/community", methods=["GET"])
    def get_communities():
        return {"message": "get all communities"}

    @app.route("/api/community/<int:id>", methods=["GET"])
    def get_community(id):
        return {"message": f"get community {id}"}

    @app.route("/api/housing", methods=["GET"])
    def get_housing():
        return {"message": "get all housing"}

    @app.route("/api/housing/<int:id>", methods=["GET"])
    def get_one_housing(id):
        return {"message": f"get housing {id}"}

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