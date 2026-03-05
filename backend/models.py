from flask_sqlalchemy import SQLAlchemy

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
    transit_score = db.Column(db.Float)

    housing = db.relationship(
        "Housing",
        secondary=community_housing,
        backref="communities"
    )

    transportation = db.relationship(
        "Transportation",
        secondary=community_transportation,
        backref="communities"
    )


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

    transportation = db.relationship(
        "Transportation",
        secondary=housing_transportation,
        backref="housing"
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
        }


# -------------------------
# Transportation Model
# -------------------------

class Transportation(db.Model):
    __tablename__ = "transportation"

    id = db.Column(db.Integer, primary_key=True)

    line = db.Column(db.String(100))
    type = db.Column(db.String(50))
    route_count = db.Column(db.Float)
    service = db.Column(db.String(50))
    accessibility_score = db.Column(db.Float)
