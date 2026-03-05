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

    id = db.Column(db.Integer, primary_key=True)

    address = db.Column(db.String(200))
    unit_type = db.Column(db.String(100))
    income_restriction_level = db.Column(db.String(100))
    accessibility_score = db.Column(db.Float)
    rent_cost = db.Column(db.Float)
    total_affordable_units = db.Column(db.Integer)

    transportation = db.relationship(
        "Transportation",
        secondary=housing_transportation,
        backref="housing"
    )


# -------------------------
# Transportation Model
# -------------------------

class Transportation(db.Model):
    __tablename__ = "transportation"

    id = db.Column(db.Integer, primary_key=True)

    line = db.Column(db.String(100))
    type = db.Column(db.String(50))
    accessibility_score = db.Column(db.Float)
    sidewalk_score = db.Column(db.Float)
    frequency = db.Column(db.String(50))