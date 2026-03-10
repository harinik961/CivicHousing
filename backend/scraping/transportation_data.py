import os
import sys
import requests
import io
from dotenv import load_dotenv
import zipfile
import pandas as pd
from datetime import datetime
from collections import defaultdict
import json

# Add backend folder to path so we can import models
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from flask import Flask
from models import db, Transportation

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

GTFS_URL = os.getenv("GTFS_URL")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# ----------------------------------------
# SETUP FLASK APP AND DB CONNECTION
# ----------------------------------------
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)
DAY_ORDER = {
  "Monday": 0, 
  "Tuesday": 1, 
  "Wednesday": 2, 
  "Thursday": 3, 
  "Friday": 4, 
  "Saturday": 5, 
  "Sunday": 6, 
}
DESTINATIONS = {
  "ut": (30.2849, -97.7341), 
  "downtown": (30.2672, -97.7431), 
  "domain": (30.4015968, -97.7269361),
}

# ----------------------------------------
# HELPER FUNCTIONS
# ----------------------------------------

def get_transit_time(origin_lat, origin_lon, dest_lat, dest_lon):
  try:
    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
      "origin": f"{origin_lat},{origin_lon}",
      "destination": f"{dest_lat},{dest_lon}",
      "mode": "transit",
      "key": GOOGLE_MAPS_API_KEY
    }
    response = requests.get(url, params=params, timeout=10)
    if response.status_code == 200:
      data = response.json()
      if data["routes"]:
        duration = data["routes"][0]["legs"][0]["duration"]["text"]
        return duration

  except Exception as e:
    print("Transit lookup failed:", e)
  return None

# ----------------------------------------
# SEED FUNCTION - UPSERT LOGIC
# ----------------------------------------
def seed_transportation(transportation_data):
    """
    Upsert transportation data: update existing records, insert new ones.
    Uses stop_id as the unique identifier.
    No downtime window, only changes what's different.
    Removes stale records that no longer exist in the API.
    """
    print("Syncing transportation data with database (upsert)...")
    
    inserted = 0
    updated = 0
    skipped = 0
    seen_stop_ids = set()

    for record in transportation_data:
        stop_id = str(record.get("stop_id", "")).strip()
        
        if not stop_id:
            skipped += 1
            continue

        seen_stop_ids.add(stop_id)

        # Check if transportation with this stop_id already exists
        existing = Transportation.query.filter_by(stop_id=stop_id).first()
        
        if existing:
            # Update existing record
            existing.stop_name = record.get("stop_name", "")
            existing.latitude = record.get("latitude")
            existing.longitude = record.get("longitude")
            existing.stop_url = record.get("stop_url", "")
            existing.map_embed_url = record.get("map_embed_url", "")
            existing.street_view_url = record.get("street_view_url", "")
            existing.transport_type = record.get("transport_type", "")
            existing.routes = record.get("routes", "")
            existing.frequency = record.get("frequency", "")
            existing.num_routes = record.get("num_routes", 0)
            existing.wheelchair_accessible = record.get("wheelchair_accessible", "")
            existing.service_days = record.get("service_days", "")
            existing.travel_time_ut = record.get("travel_time_ut", "")
            existing.travel_time_downtown = record.get("travel_time_downtown", "")
            existing.travel_time_domain = record.get("travel_time_domain", "")
            updated += 1
        else:
            # Insert new record
            transportation = Transportation(
                stop_id=stop_id,
                stop_name=record.get("stop_name", ""),
                latitude=record.get("latitude"),
                longitude=record.get("longitude"),
                stop_url=record.get("stop_url", ""),
                map_embed_url=record.get("map_embed_url", ""),
                street_view_url=record.get("street_view_url", ""),
                transport_type=record.get("transport_type", ""),
                routes=record.get("routes", ""),
                frequency=record.get("frequency", ""),
                num_routes=record.get("num_routes", 0),
                wheelchair_accessible=record.get("wheelchair_accessible", ""),
                service_days=record.get("service_days", ""),
                travel_time_ut=record.get("travel_time_ut", ""),
                travel_time_downtown=record.get("travel_time_downtown", ""),
                travel_time_domain=record.get("travel_time_domain", ""),
            )
            db.session.add(transportation)
            inserted += 1

    # Remove stale records that no longer exist in the API
    deleted = Transportation.query.filter(Transportation.stop_id.notin_(seen_stop_ids)).delete(synchronize_session=False)
    
    db.session.commit()
    print(f"Inserted {inserted} new records, updated {updated}, deleted {deleted} stale records, skipped {skipped}")

def extract_data(): 
  try: 
    print(f"Querying CapMetro for GTFS ZIP file data")
    response = requests.get(GTFS_URL)
    response.raise_for_status()
    print(f"Successfully received ZIP data")

    #Download and Extract GTFS
    data_dir = "../data"
    import os as os_module
    os_module.makedirs(data_dir, exist_ok=True)
    
    zip_content = zipfile.ZipFile(io.BytesIO(response.content))
    zip_content.extractall(f"{data_dir}/capmetro_data")

    #Load CSV Data
    stops = pd.read_csv(f"{data_dir}/capmetro_data/stops.txt")
    stop_times = pd.read_csv(f"{data_dir}/capmetro_data/stop_times.txt")
    routes = pd.read_csv(f"{data_dir}/capmetro_data/routes.txt")
    trips = pd.read_csv(f"{data_dir}/capmetro_data/trips.txt")
    calendar_dates = pd.read_csv(f"{data_dir}/capmetro_data/calendar_dates.txt")

    # Get All Active Services
    # Get all service_ids that are active (exception_type = 1)
    service_runs = calendar_dates[calendar_dates['exception_type'] == 1]
    weekday_service_ids = set(service_runs['service_id'].unique())
    
    print(f"Found {len(weekday_service_ids)} active service(s) (all days)")

    # Build Lookup Maps
    route_type_map = dict(zip(routes.route_id, routes.route_type))
    route_name_map = dict(zip(routes.route_id, routes.route_short_name))
    trip_route_map = dict(zip(trips.trip_id, trips.route_id))
    trip_service_map = dict(zip(trips.trip_id, trips.service_id))
    trip_wheelchair_map = dict(zip(trips.trip_id, trips.wheelchair_accessible)) if 'wheelchair_accessible' in trips.columns else {}
    service_days_map = defaultdict(set)

    for _, row in calendar_dates.iterrows(): 
      if row["exception_type"] == 1: 
        date_obj = datetime.strptime(str(row["date"]), "%Y%m%d")
        weekday = date_obj.strftime("%A")
        service_days_map[row["service_id"]].add(weekday)

    # Process Stop-Level Data
    stop_routes = defaultdict(set)                      # distinct route_ids at each stop
    stop_route_types = defaultdict(set)                 # route types (0=Rail, 3=Bus)
    stop_trip_times_by_service = defaultdict(lambda: defaultdict(list))  # service_id -> arrival times
    stop_wheelchair_accessible = defaultdict(bool)     # wheelchair accessibility at trip level
    stop_service_days = defaultdict(set)

    for _, row in stop_times.iterrows(): 
      stop_id = row["stop_id"]
      trip_id = row["trip_id"]
      arrival_time = row.get("arrival_time", "00:00:00")

      route_id = trip_route_map.get(trip_id)
      service_id = trip_service_map.get(trip_id)
      
      # Data Point 1 & 2: Type and Routes
      if route_id:
        stop_routes[stop_id].add(route_id)  # distinct routes
        route_type = route_type_map.get(route_id)
        stop_route_types[stop_id].add(route_type)  # route types (0 or 3)
      
      # Data Point 3: Service Frequency (all days) - organize by service
      if service_id in weekday_service_ids:
        stop_trip_times_by_service[stop_id][service_id].append(arrival_time)
      
      # Data Point 5: Disability Services from trips
      wheelchair_accessible = trip_wheelchair_map.get(trip_id, 0)
      if wheelchair_accessible == 1:
        stop_wheelchair_accessible[stop_id] = True

      # Data Point 6: Service Days
      if service_id in service_days_map: 
        stop_service_days[stop_id].update(service_days_map[service_id])

    # Calculate Frequency Per Service
    def calculate_frequency_for_times(times_list):
      """
      Calculate average minutes between consecutive arrivals for a single service.
      Returns frequency in minutes or None if insufficient data.
      """
      if len(times_list) < 2:
        return None
      
      try:
        # Convert time strings to minutes since midnight
        minutes = []
        for time_str in times_list:
          h, m, s = map(int, time_str.split(':'))
          minutes.append(h * 60 + m)
        
        minutes.sort()
        gaps = [minutes[i+1] - minutes[i] for i in range(len(minutes) - 1)]
        
        avg_gap = sum(gaps) / len(gaps) if gaps else None
        return avg_gap
      except:
        return None

    def calculate_average_frequency(services_dict):
      """
      Calculate frequency for each service separately, then average them.
      Returns the average frequency or None if no valid frequencies found.
      """
      if not services_dict:
        return None
      
      frequencies = []
      for service_id, times_list in services_dict.items():
        freq = calculate_frequency_for_times(times_list)
        if freq is not None:
          frequencies.append(freq)
      
      if frequencies:
        return round(sum(frequencies) / len(frequencies), 2)
      return None

    # Assemble Final Data
    transportation_data = []
    
    for _, stop in stops.iterrows(): 
      stop_id = stop["stop_id"]
      
      # Data Point 1: Type of Transportation
      route_types = stop_route_types.get(stop_id, set())
      transport_type = "Rail" if 0 in route_types else "Bus"
      if 0 in route_types and 3 in route_types:
        transport_type = "Rail and Bus"  # mixed

      # Data Point 2: Routes Serving This Stop
      routes_at_stop = stop_routes.get(stop_id, set())
      route_names = [str(route_name_map.get(r, r)) for r in routes_at_stop]
      routes_str = ", ".join(sorted(route_names)) if route_names else "None"

      # Data Point 3: Service Frequency
      service_frequencies = stop_trip_times_by_service.get(stop_id, {})
      frequency = calculate_average_frequency(service_frequencies)
      frequency_str = f"Every {round(frequency)} Minutes" if frequency else "Unknown"

      # Data Point 4: How Many Routes
      num_routes = len(routes_at_stop)

      # Skip stops with no routes
      if num_routes == 0:
        continue

      # Data Point 5: Disability Services
      wheelchair_boarding = int(stop.get("wheelchair_boarding", 0))
      wheelchair_trip_accessible = stop_wheelchair_accessible.get(stop_id, False)

      # Data Point 6: Service Days
      days_served = sorted(list(stop_service_days.get(stop_id, [])), key=lambda d: DAY_ORDER[d])
      days_served_str = ", ".join(days_served) if days_served else "Unknown"
      
      if wheelchair_boarding == 1 or wheelchair_trip_accessible:
        disability_services = "Wheelchair Accessible"
      elif wheelchair_boarding == 2:
        disability_services = "Not Wheelchair Accessible"
      else:
        disability_services = "No Information Available"

      lat = stop["stop_lat"]
      lon = stop["stop_lon"]

      travel_time_ut = get_transit_time(lat, lon, *DESTINATIONS["ut"])
      travel_time_downtown = get_transit_time(lat, lon, *DESTINATIONS["downtown"])
      travel_time_domain = get_transit_time(lat, lon, *DESTINATIONS["domain"])

      # Append to Results
      transportation_data.append({
        "stop_id": stop_id,
        "stop_name": stop["stop_name"],
        "latitude": lat,
        "longitude": lon,
        "stop_url": stop.get("stop_url", ""),
        "map_embed_url": f"https://www.google.com/maps/embed/v1/place?q={lat},{lon}&key={GOOGLE_MAPS_API_KEY}",
        "street_view_url": f"https://maps.googleapis.com/maps/api/streetview?size=400x300&location={lat},{lon}&key={GOOGLE_MAPS_API_KEY}",

        "transport_type": transport_type,           # Data Point 1
        "routes": routes_str,                       # Data Point 2
        "frequency": frequency_str,                 # Data Point 3
        "num_routes": num_routes,                   # Data Point 4
        "wheelchair_accessible": disability_services,  # Data Point 5
        "service_days": days_served_str,            # Daya Point 6
      })

    return transportation_data

  except requests.exceptions.RequestException as error: 
    print(f"An error occurred: {error}")

if __name__ == "__main__": 
  data = extract_data()
  print(f"\nSuccessfully processed {len(data)} stops\n")
  print("Sample of first 5 stops:")
  print("=" * 80)
  for stop in data[:5]:
    print(f"Stop ID: {stop['stop_id']}")
    print(f"Stop Name: {stop['stop_name']}")
    print(f"Location: ({stop['latitude']}, {stop['longitude']})")
    print(f"Transport Type: {stop['transport_type']}")
    print(f"Routes: {stop['routes']}")
    print(f"Number of Routes: {stop['num_routes']}")
    print(f"Frequency: {stop['frequency']}")
    print(f"Wheelchair Accessible: {stop['wheelchair_accessible']}")
    print("-" * 80) 
  
  # Seed database with transportation data
  with app.app_context():
    db.create_all()
    
    # Alter existing columns to accommodate longer strings
    from sqlalchemy import text
    with db.engine.connect() as conn:
      conn.execute(text("ALTER TABLE transportation ALTER COLUMN routes TYPE varchar(500)"))
      conn.execute(text("ALTER TABLE transportation ALTER COLUMN service_days TYPE varchar(200)"))
      conn.commit()
    
    seed_transportation(data)
    print("Done!")