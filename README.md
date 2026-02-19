Canvas / Discord group number: 
- 53380_06

Names of the team members: 
- Coco Zhou, Sri Harini Kolluru, Aarshi Khatiwada, Matthew Pham, Alexander Nguyen

Name of the project: 
- CivicHousing 

The proposed project: 
CivicHousing is a data-driven web platform that highlights affordable housing availability and transportation accessibility gaps across Austin, Texas. It integrates public housing inventory data, transit infrastructure data, sidewalk and walkability metrics, and community-level indicators to reveal where affordability and mobility intersect, or fail to.
By mapping the relationship between lower-income housing, public transportation density, and neighborhood accessibility, the platform empowers residents, planners, and policymakers to identify transit-accessible affordable housing, evaluate safety and walkability, and uncover inequities in urban development.

At least three models: 
- Model 1: Communities
- Model 2: Housing
- Model 3: Transportation

URLs of at least three data sources that you will programmatically scrape: 
- Google Maps API: https://mapsplatform.google.com/lp/maps-apis/ 
- Census API: https://www.census.gov/data/developers/data-sets.html#accordion-a8ec3eb6f0-item-3c3bf7b7cd 
- Austin Affordable Housing Data: https://data.austintexas.gov/Housing-and-Real-Estate/Affordable-Housing-Inventory/ifzc-3xz8/about_data 
- CapMetro Data: https://data.texas.gov/dataset/CapMetro-GTFS/r4v4-vz24/about_data

An estimate of the number of instances of each model:
- Communities: 10+
- Housing: 100+
- Transportation: 20+

Affordable Housing in ATX

Model 1 - Communities (county, zip, median housing prices, population, crime index, public transit score)
- Instances: Neighborhoods (muller, domain etc)
- Attributes: 
    - County
    - Zip Codes
    - Median Housing Prices
    - Population
    - Crime Index
    - Public Transit Score
- Connections: 
    - Model connects to Housing and Transit Stops

Model 2 - Housing 
- Instances: Apartments, Rentals, etc. 
- Attributes: 
    - Address
    - Unit Type
    - Income Restriction Level
    - Total ADA Units
    - Approximate Rent Cost
    - Total Affordable Units
- Connections:
    - Model connects to Communities and Transit Stops

Model 3 - Transportation (bus stations, train stations, sidewalk/trails score)
- Instances: Specific bus or train station stops (TRANSIT STOPS)
- Attributes:
    - Bus/Train Line
    - Type
    - Accessibility Score
    - Frequency
    - Total Daily Departures
    - Route Counts
- Connections: 
    - Model connects to Housing and Communities Stops

- MEDIA FOR ALL: 
    - Google Maps embed
    - Data visualization charts (Chart.js)
    - Images

- 3 Questions: 
    - Where can I find affordable housing in Austin? 
    - Is the path between my 'affordable' apartment and the bus stop actually safe and accessible?"
    - What affordable housing options are available and closest to reliable transit options?

