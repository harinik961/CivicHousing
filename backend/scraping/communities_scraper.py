import requests
import pandas as pd
import os
import sys
from dotenv import load_dotenv

load_dotenv()

#census data 
CENSUS_KEY = os.getenv("CENSUS_KEY")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

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
print(census_df.head())
# austin data 
response = requests.get(austin_url)
data = response.json()
austin_df = pd.DataFrame(data) 
austin_df = austin_df[['zip', 'latitude', 'longitude']]
austin_df = austin_df.drop_duplicates(subset='zip')
print(austin_df.head())

merged_df = austin_df.merge(census_df, left_on='zip',right_on='zip code tabulation area', how='left')
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
# put in merged data 
merged_df = merged_df.merge(crime_counts[['zip', 'crime_index']], on='zip', how='left')
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
print(merged_df[['zip', 'park_count']].head())


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


