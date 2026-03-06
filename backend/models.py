from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import ARRAY

db = SQLAlchemy()

# -------------------------
# Association Tables
# -------------------------

community_housing = db.Table(
    "community_housing",
    db.Column("community_id", db.Integer, db.ForeignKey("communities.id"), primary_key=True),
    db.Column("housing_id", db.Integer, db.ForeignKey("housing.id"), primary_key=True)
)

community_transportation = db.Table(
    "community_transportation",
    db.Column("community_id", db.Integer, db.ForeignKey("communities.id"), primary_key=True),
    db.Column("transportation_id", db.Integer, db.ForeignKey("transportation.id"), primary_key=True)
)

housing_transportation = db.Table(
    "housing_transportation",
    db.Column("housing_id", db.Integer, db.ForeignKey("housing.id"), primary_key=True),
    db.Column("transportation_id", db.Integer, db.ForeignKey("transportation.id"), primary_key=True)
)


# -------------------------
# Community Model
# -------------------------

class Community(db.Model):
    __tablename__ = "communities"

    id = db.Column(db.Integer, primary_key=True)

    county = db.Column(db.String(100))
    zip_code = db.Column(db.String(20))
    median_housing_price = db.Column(db.Float)
    population = db.Column(db.Integer)
    crime_index = db.Column(db.Float)
    park_count = db.Column(db.Integer)
    health_count = db.Column(db.Integer)
    map_embed_url = db.Column(db.Text)
    street_view_url = db.Column(db.Text)

    housing = db.relationship(
        "Housing",
        secondary=community_housing,
        backref="communities",
        lazy=True
    )

    transportation = db.relationship(
        "Transportation",
        secondary=community_transportation,
        backref="communities",
        lazy=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "county": self.county,
            "zip_code": self.zip_code,
            "median_housing_price": self.median_housing_price,
            "population": self.population,
            "crime_index": self.crime_index,
            "park_count": self.park_count,
            "health_count": self.health_count,
            "map_embed_url": self.map_embed_url,
            "street_view_url": self.street_view_url,
            

            # return only IDs to avoid recursion
            "housing_ids": [h.id for h in self.housing],
            "transportation_ids": [t.id for t in self.transportation]
        }


# -------------------------
# Housing Model
# -------------------------

class Housing(db.Model):
    __tablename__ = "housing"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    project_name = db.Column(db.String(255), nullable=False)
    address = db.Column(db.String(200))
    zip_code = db.Column(db.String(10))
    unit_type = db.Column(db.String(100))
    housing_tenure = db.Column(db.String(100))
    income_restriction_level = db.Column(db.String(255))
    total_ada_units = db.Column(db.Integer, default=0)
    total_affordable_units = db.Column(db.Integer, default=0)
    council_district = db.Column(db.String(10))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    street_view_image = db.Column(db.Text)



    street_view_image = db.Column(db.Text)


    transportation = db.relationship(
        "Transportation",
        secondary=housing_transportation,
        backref="housing",
        lazy=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "project_name": self.project_name,
            "address": self.address,
            "zip_code": self.zip_code,
            "unit_type": self.unit_type,
            "housing_tenure": self.housing_tenure,
            "income_restriction_level": self.income_restriction_level,
            "total_ada_units": self.total_ada_units,
            "total_affordable_units": self.total_affordable_units,
            "council_district": self.council_district,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "street_view_image": self.street_view_image,
            "street_view_image": self.street_view_image,

            # relationship references
            "community_ids": [c.id for c in self.communities],
            "transportation_ids": [t.id for t in self.transportation],
        }


# -------------------------
# Transportation Model
# -------------------------

class Transportation(db.Model):
    __tablename__ = "transportation"

    id = db.Column(db.Integer, primary_key=True)
    stop_id = db.Column(db.String(50), unique=True, nullable=True, index=True)
    stop_name = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    stop_url = db.Column(db.String(500))
    map_embed_url = db.Column(db.String(1000))
    street_view_url = db.Column(db.String(1000))
    transport_type = db.Column(db.String(50))
    frequency = db.Column(db.String(100))
    num_routes = db.Column(db.Integer)
    wheelchair_accessible = db.Column(db.String(100))
    routes = db.Column(db.String(100))
    service_days = db.Column(db.String(50))


    def to_dict(self):
        return {
            "id": self.id,
            "stop_id": self.stop_id,
            "stop_name": self.stop_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "stop_url": self.stop_url,
            "map_embed_url": self.map_embed_url,
            "street_view_url": self.street_view_url,
            "transport_type": self.transport_type,
            "routes": self.routes,
            "frequency": self.frequency,
            "num_routes": self.num_routes,
            "wheelchair_accessible": self.wheelchair_accessible,
            "service_days": self.service_days,
            "stop_id": self.stop_id,
            

            "community_ids": [c.id for c in self.communities],
            "housing_ids": [h.id for h in self.housing],
        }
