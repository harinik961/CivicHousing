from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Index, event, DDL
from sqlalchemy_utils import TSVectorType

db = SQLAlchemy()

  # Association Tables
  
community_housing = db.Table(
    "community_housing",
    db.Column(
        "community_id", db.Integer, db.ForeignKey("communities.id"), primary_key=True
    ),
    db.Column("housing_id", db.Integer, db.ForeignKey("housing.id"), primary_key=True),
)

community_transportation = db.Table(
    "community_transportation",
    db.Column(
        "community_id", db.Integer, db.ForeignKey("communities.id"), primary_key=True
    ),
    db.Column(
        "transportation_id",
        db.Integer,
        db.ForeignKey("transportation.id"),
        primary_key=True,
    ),
)

housing_transportation = db.Table(
    "housing_transportation",
    db.Column("housing_id", db.Integer, db.ForeignKey("housing.id"), primary_key=True),
    db.Column(
        "transportation_id",
        db.Integer,
        db.ForeignKey("transportation.id"),
        primary_key=True,
    ),
)

  # Community Model
  

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
    transit_score = db.Column(db.Integer)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    community_total_affordable_units = db.Column(db.Integer)
    community_housing_count = db.Column(db.Integer)
    transportation_count = db.Column(db.Integer)

    housing = db.relationship(
        "Housing", secondary=community_housing, backref="communities", lazy="selectin"
    )

    transportation = db.relationship(
        "Transportation",
        secondary=community_transportation,
        backref="communities",
        lazy="selectin",
    )

    ts_vector = db.Column(TSVectorType(), nullable=True)

    __table_args__ = (
        Index("ix_community_ts_vector", "ts_vector", postgresql_using="gin"),
    )

    def to_dict(self, include_relations=False):
        data = {
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
            "transit_score": self.transit_score,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "community_total_affordable_units": self.community_total_affordable_units,
            "community_housing_count": self.community_housing_count,
            "transportation_count": self.transportation_count,
        }

        if include_relations:
            data["housing"] = [h.to_dict() for h in self.housing[:1]]
            data["transportation"] = [t.to_dict() for t in self.transportation[:1]]

        return data


  # Housing Model
  

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

    last_synced_at = db.Column(db.DateTime, default=datetime.utcnow)

    walk_score = db.Column(db.Integer, default=0)

    transportation = db.relationship(
        "Transportation",
        secondary=housing_transportation,
        backref="housing",
        lazy="selectin",
    )

    ts_vector = db.Column(TSVectorType(), nullable=True)

    __table_args__ = (
        Index("ix_housing_ts_vector", "ts_vector", postgresql_using="gin"),
    )

    def to_dict(self, include_relations=False):
        data = {
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
            "last_synced_at": self.last_synced_at,
            "walk_score": self.walk_score,
        }

        if include_relations:
            data["communities"] = [c.to_dict() for c in self.communities[:1]]
            data["transportation"] = [t.to_dict() for t in self.transportation[:1]]

        return data


  # Transportation Model
  

class Transportation(db.Model):
    __tablename__ = "transportation"

    id = db.Column(db.Integer, primary_key=True)

    stop_id = db.Column(db.String(50), unique=True)
    stop_name = db.Column(db.String(255))

    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    stop_url = db.Column(db.String(500))

    map_embed_url = db.Column(db.String(1000))
    street_view_url = db.Column(db.String(1000))

    transport_type = db.Column(db.String(50))
    routes = db.Column(db.String(100))
    frequency = db.Column(db.String(100))

    num_routes = db.Column(db.Integer)

    wheelchair_accessible = db.Column(db.String(100))

    service_days = db.Column(db.String(1000))

    travel_time_ut = db.Column(db.String(1000))
    travel_time_downtown = db.Column(db.String(1000))
    travel_time_domain = db.Column(db.String(1000))
    travel_time_ut_minutes = db.Column(db.Integer)
    travel_time_downtown_minutes = db.Column(db.Integer)
    travel_time_domain_minutes = db.Column(db.Integer)
    zip_code = db.Column(db.String(1000))

    ts_vector = db.Column(TSVectorType(), nullable=True)

    __table_args__ = (
        Index("ix_transportation_ts_vector", "ts_vector", postgresql_using="gin"),
    )

    def to_dict(self, include_relations=False):
        data = {
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
            "travel_time_ut": self.travel_time_ut,
            "travel_time_downtown": self.travel_time_downtown,
            "travel_time_domain": self.travel_time_domain,
            "travel_time_ut_minutes": self.travel_time_ut_minutes,
            "travel_time_downtown_minutes": self.travel_time_downtown_minutes,
            "travel_time_domain_minutes": self.travel_time_domain_minutes,
            "zip_code": self.zip_code,
        }

        if include_relations:
            data["communities"] = [c.to_dict() for c in self.communities[:1]]
            data["housing"] = [h.to_dict() for h in self.housing[:1]]

        return data


  # Trigger DDL — fires after table creation via db.create_all()
  
event.listen(
    Community.__table__,
    "after_create",
    DDL(
        """
        CREATE OR REPLACE FUNCTION community_ts_vector_update() RETURNS trigger AS $$
        BEGIN
            NEW.ts_vector :=
                to_tsvector('english',
                    coalesce(NEW.county, '') || ' ' ||
                    coalesce(NEW.zip_code, '') || ' ' ||
                    coalesce(NEW.median_housing_price::text, '') || ' ' ||
                    coalesce(NEW.population::text, '') || ' ' ||
                    coalesce(NEW.crime_index::text, '') || ' ' ||
                    coalesce(NEW.park_count::text, '') || ' ' ||
                    coalesce(NEW.health_count::text, '') || ' ' ||
                    coalesce(NEW.map_embed_url, '') || ' ' ||
                    coalesce(NEW.street_view_url, '') || ' ' ||
                    coalesce(NEW.transit_score::text, '') || ' ' || 
                    coalesce(NEW.community_total_affordable_units::text, '') || ' ' ||
                    coalesce(NEW.community_housing_count::text, '') || ' ' ||
                    coalesce(NEW.transportation_count::text, '')
                );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER community_ts_vector_trigger
        BEFORE INSERT OR UPDATE ON communities
        FOR EACH ROW EXECUTE FUNCTION community_ts_vector_update();
    """
    ),
)

event.listen(
    Housing.__table__,
    "after_create",
    DDL(
        """
        CREATE OR REPLACE FUNCTION housing_ts_vector_update() RETURNS trigger AS $$
        BEGIN
            NEW.ts_vector :=
                to_tsvector('english',
                    coalesce(NEW.project_name, '') || ' ' ||
                    coalesce(NEW.address, '') || ' ' ||
                    coalesce(NEW.zip_code, '') || ' ' ||
                    coalesce(NEW.unit_type, '') || ' ' ||
                    coalesce(NEW.housing_tenure, '') || ' ' ||
                    coalesce(NEW.income_restriction_level, '') || ' ' ||
                    coalesce(NEW.council_district, '') || ' ' ||
                    coalesce(NEW.total_ada_units::text, '') || ' ' ||
                    coalesce(NEW.total_affordable_units::text, '') || ' ' ||
                    coalesce(NEW.street_view_image, '') || ' ' ||
                    coalesce(NEW.last_synced_at::text, '') || ' ' ||
                    coalesce(NEW.walk_score::text, '')
                );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER housing_ts_vector_trigger
        BEFORE INSERT OR UPDATE ON housing
        FOR EACH ROW EXECUTE FUNCTION housing_ts_vector_update();
    """
    ),
)

event.listen(
    Transportation.__table__,
    "after_create",
    DDL(
        """
        CREATE OR REPLACE FUNCTION transportation_ts_vector_update() RETURNS trigger AS $$
        BEGIN
            NEW.ts_vector :=
                to_tsvector('english',
                    coalesce(NEW.stop_id, '') || ' ' ||
                    coalesce(NEW.stop_name, '') || ' ' ||
                    coalesce(NEW.stop_url, '') || ' ' ||
                    coalesce(NEW.map_embed_url, '') || ' ' ||
                    coalesce(NEW.street_view_url, '') || ' ' ||
                    coalesce(NEW.transport_type, '') || ' ' ||
                    coalesce(NEW.routes, '') || ' ' ||
                    coalesce(NEW.frequency, '') || ' ' ||
                    coalesce(NEW.num_routes::text, '') || ' ' ||
                    coalesce(NEW.wheelchair_accessible, '') || ' ' ||
                    coalesce(NEW.service_days, '') || ' ' ||
                    coalesce(NEW.travel_time_ut, '') || ' ' ||
                    coalesce(NEW.travel_time_downtown, '') || ' ' ||
                    coalesce(NEW.travel_time_domain, '') || ' ' ||
                    coalesce(NEW.zip_code, '')
                );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER transportation_ts_vector_trigger
        BEFORE INSERT OR UPDATE ON transportation
        FOR EACH ROW EXECUTE FUNCTION transportation_ts_vector_update();
    """
    ),
)
