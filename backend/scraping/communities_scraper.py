import requests
import pandas as pd
import os
import sys
from dotenv import load_dotenv
from flask import Flask

# Add backend folder to path so we can import models
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from models import db, Community

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))
load_dotenv()

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

#census data 
CENSUS_KEY = os.getenv("CENSUS_KEY")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
WALK_SCORE_API_KEY = os.getenv("WALK_SCORE_API_KEY")
WALKABILITY_URL = "https://api.walkscore.com/score"

def fetch_walkability_score(address, lat, lon): 
    """
    Fetches walkability score, transit score, and bike score of a given
    location using the Walk Score API. 
    Returns None, None, None upon failure.
    """
    try: 
        url = WALKABILITY_URL
        params = {
            "format": "json", 
            "address": address, 
            "lat": lat, 
            "lon": lon, 
            "transit": 1, 
            "bike": 1, 
            "wsapikey": WALK_SCORE_API_KEY
        }
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200: 
            data = response.json()
            if data.get("status") == 1: 
                walk_score = data.get("walkscore")
                transit_score = data.get("transit", {}).get("score")
                bike_score = data.get("bike", {}).get("score")
                return walk_score, transit_score, bike_score
    except Exception as e: 
        print(f"Walk Score fetch failed for {address}: {e}")
    return None, None, None

austin_url = "https://data.austintexas.gov/resource/ifzc-3xz8.json"
census_url = "https://api.census.gov/data/2024/acs/acs5"
params = {
    "get": "B01003_001E",
    "for": "zip code tabulation area:*",
    "key": CENSUS_KEY
}
census_response = requests.get(census_url, params=params)
census_data = census_response.json()

census_df = pd.DataFrame(census_data[1:], columns=census_data[0])
census_df = census_df[['zip code tabulation area', 'B01003_001E' ]]
census_df['B01003_001E'] = census_df['B01003_001E'].astype(int)
print(census_df.head())
# austin data 
response = requests.get(austin_url)
data = response.json()
austin_df = pd.DataFrame(data)
austin_df = austin_df[['zip']].drop_duplicates()

zip_geo = pd.read_csv("https://gist.githubusercontent.com/erichurst/7882666/raw/5bdc46db47d9515269ab12ed6fb2850377fd869e/US%20Zip%20Codes%20from%202013%20Government%20Data")
zip_geo.columns = ['zip', 'latitude', 'longitude']
zip_geo['zip'] = zip_geo['zip'].astype(str)

austin_df = austin_df.merge(zip_geo, on='zip', how='left')
print(austin_df.head())

merged_df = austin_df.merge(census_df, left_on='zip', right_on='zip code tabulation area', how='left')
merged_df = merged_df.drop(columns=['zip code tabulation area'])
merged_df = merged_df.rename(columns={'B01003_001E': 'population'})

print(merged_df)

#zillow
zillow_df = pd.read_csv('https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv?t=1772589687')
zillow_df = zillow_df[zillow_df['State'] == 'TX']
zillow_df = zillow_df[['RegionName', zillow_df.columns[-1]]]
zillow_df.columns = ['zip', 'median_housing_price']
zillow_df['zip'] = zillow_df['zip'].astype(str)
merged_df = merged_df.merge(zillow_df, on='zip', how='left')
merged_df['median_housing_price'] = merged_df['median_housing_price'].round(2)
print(merged_df.head())

print(len(merged_df))

# crime data from austin 
crime_url = "https://datahub.austintexas.gov/resource/i7fg-wrk5.json"
crime_response = requests.get(crime_url)
crime_data = crime_response.json()

crime_df = pd.DataFrame(crime_data)
# count crimes 
crime_counts = {}
for zip_code in crime_df['zip_code']:
    if zip_code in crime_counts:
        crime_counts[zip_code] +=1
    else:
        crime_counts[zip_code] = 1


crime_counts = pd.DataFrame(list(crime_counts.items()), columns=['zip', 'crime_count'])

crime_counts = crime_counts.merge(merged_df[['zip', 'population']], on='zip', how='left')
crime_counts['population'] = pd.to_numeric(crime_counts['population'])
# get crime index
crime_counts['crime_rate'] = (crime_counts['crime_count'] / crime_counts['population'] * 1000)
# normalize crime index 
crime_counts['crime_index'] = (
    (crime_counts['crime_rate'] - crime_counts['crime_rate'].min()) /
    (crime_counts['crime_rate'].max() - crime_counts['crime_rate'].min()) * 100
).round(2)
crime_counts['crime_index'] = crime_counts['crime_index'].fillna(0)
# put in merged data 
merged_df = merged_df.merge(crime_counts[['zip', 'crime_index']], on='zip', how='left').fillna(0)
print(merged_df.head())
#print(crime_df.columns.tolist())
#print(crime_df.head(2))

# parks per zipcode 
parks_url = "https://data.austintexas.gov/resource/v8hw-gz65.json"
parks_response = requests.get(parks_url)
parks_data = parks_response.json()

parks_df = pd.DataFrame(parks_data)
print(parks_df.columns.tolist())

park_counts = {}
for zip_code in parks_df['zipcode']:
    if zip_code in park_counts:
        park_counts[zip_code] +=1
    else:
        park_counts[zip_code] = 1
park_counts = pd.DataFrame(list(park_counts.items()), columns=['zip', 'park_count'])

merged_df = merged_df.merge(park_counts[['zip', 'park_count']], on='zip', how='left')
merged_df['park_count'] = merged_df['park_count'].fillna(0).astype(int)
print(merged_df[['zip', 'park_count']].head())

#healthcare per zipcode
health_params = {
    "get": "ESTAB,NAICS2017",
    "for": "zipcode:*",
    "NAICS2017": "62",
    "key": CENSUS_KEY
}
health_response = requests.get("https://api.census.gov/data/2023/cbp", params=health_params)
health_data = health_response.json()

health_df = pd.DataFrame(health_data[1:], columns=health_data[0])
health_df = health_df.rename(columns={'zip code': 'zip', 'ESTAB': 'health_count'})
health_df['health_count'] = health_df['health_count'].astype(int)

merged_df = merged_df.merge(health_df[['zip', 'health_count']], on='zip', how='left')
merged_df['health_count'] = merged_df['health_count'].fillna(0).astype(int)

# transit score
walk_scores = []

for _, row in merged_df.iterrows():
    lat = row["latitude"]
    lon = row["longitude"]
    zip_code = row["zip"]

    if pd.notna(lat) and pd.notna(lon):
        address = f"{zip_code}, Austin, TX"
        walk, transit, bike = fetch_walkability_score(address, lat, lon)
        walk_scores.append({
            "zip": zip_code,
            "walk_score": walk,
            "transit_score": transit,
            "bike_score": bike
        })
    else:
        walk_scores.append({
            "zip": zip_code,
            "walk_score": None,
            "transit_score": None,
            "bike_score": None
        })
walk_scores_df = pd.DataFrame(walk_scores)
walk_scores_df = walk_scores_df.fillna(0)
merged_df = merged_df.merge(walk_scores_df, on="zip", how="left")

# google maps street view images and map embed 
map_urls = []

for _, row in merged_df.iterrows():
    lat = row['latitude']
    lon = row['longitude']
    zip_code = row['zip']

    map_urls.append({
        "zip": zip_code,
        "map_embed_url": f"https://www.google.com/maps/embed/v1/place?q={lat},{lon}&key={GOOGLE_MAPS_API_KEY}",
        "street_view_url": f"https://maps.googleapis.com/maps/api/streetview?size=400x300&location={lat},{lon}&key={GOOGLE_MAPS_API_KEY}",
    })

map_urls_df = pd.DataFrame(map_urls)
merged_df = merged_df.merge(map_urls_df, on='zip', how='left')

print(merged_df.columns.tolist())
print(merged_df.head())

def seed_communities(df):
    inserted = 0
    updated = 0
    skipped = 0

    for _, row in df.iterrows():
        if not row.get('zip'):
            skipped += 1
            continue
        

        existing = Community.query.filter_by(zip_code=row['zip']).first()
        
        if existing:
            existing.population = row['population']
            existing.median_housing_price = row['median_housing_price']
            existing.crime_index = row['crime_index']
            existing.park_count = row['park_count']
            existing.health_count = row['health_count'] 
            existing.map_embed_url = row['map_embed_url']
            existing.street_view_url = row['street_view_url']
            existing.transit_score = row['transit_score']
            updated += 1
        else: 
            community = Community(
                zip_code=row['zip'],
                county="Travis County",
                population=row['population'],
                median_housing_price=row['median_housing_price'],
                crime_index=row['crime_index'],
                park_count=row['park_count'],
                health_count = row['health_count'], #health count 
                map_embed_url=row['map_embed_url'], 
                street_view_url=row['street_view_url'],
                transit_score=row['transit_score'],
            )
            db.session.add(community)
            inserted += 1

    db.session.commit()
    print(f"Inserted {inserted} communities, skipped {skipped}")   

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        seed_communities(merged_df)
        print("Done!")



