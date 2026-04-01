# CivicHousing Technical Report

## Motivations

Nearly half of Austin renters spend more than 30% of their income on rent. Housing is a basic right. Austin renters shouldn't have to break the bank just to keep a roof over their heads. But without clear, accessible data, inequality remains invisible and unaddressed. We built this website because affordable housing in Austin is not just a statistic; it affects real people trying to live and work in the city. As rent rises and neighborhoods change, it becomes harder to understand what options actually exist. We wanted to create something that brings housing, community, and transportation information together in one place so it feels less overwhelming and clearer. Our goal is to make this data easier to explore and more meaningful for anyone trying to navigate affordability in Austin.

## Frontend

Our frontend server is hosted on AWS Amplify, which automatically redeploys whenever a push to the main branch in our GitLab repository occurs. Our frontend is a React-based application, which uses React Router for navigation. Our navigation layout contains our home/splash page, the housing model page, the communities model page, the transportation model page, and the about page. We created the cards on the model and instance pages using Bootstrap and maintained a responsive design with Masonry. Our frontend consumes the RESTful API implemented in the backend to populate the information displayed on each model and instance page. 

## Backend

Our backend server is hosted on AWS Elastic Beanstalk. Our backend is a Flask-based RESTful API that provides structured data to the frontend through JSON API endpoints and integrates multiple data sources to populate and update the PostgreSQL database. Our backend also uses Flask CORS to enable cross-origin resource sharing and SQLAlchemy as an ORM. Our backend has 3 different scripts to populate and update the data in the database for each of the models: community, housing, and transportation. Additionally, we also have the associations.py script to build the associations between each of these models. 

## Database

Our PostgreSQL database is hosted on AWS RDS. Each model is represented by a table, so we have tables for the Community, Housing, and Transportation models. We also have an association table between each of the models, so community_housing, community_transportation, and housing_transportation have a many-to-many relationship to maintain the relationship between the three models. These tables are populated by our data scraping and associations scripts in our backend. 

## User Stories Phase 1

### Affordable Housing Units Statistic
As a city council staffer researching transit equity, I want the Communities instance pages to clearly show the ratio of affordable housing units to total housing in that neighborhood alongside its transit score. A community might look well-served by buses, but if there are only 3 affordable units in the whole area, that transit access isn't really helping the people who need it most.

**How we handled it:**

### Transparent Route Distance + Frequency
As a single parent working two jobs near the Domain, I want to see which affordable housing units are within a short walk of a bus stop that actually has frequent service, not just "near transit." A half-mile walk to a stop where the bus comes once an hour at 6 AM isn't real transit access. Show me the walking distance and the route frequency together on the housing instance page so I can make a real decision.

**How we handled it:**

### Transportation page - distance to major locations
As a UT student who's never lived off-campus before, I want the Transportation model page to show me roughly how long it would take to get from each stop to major destinations like campus or downtown, not just the stop's location. Knowing a bus stop exists on Riverside doesn't help me unless I know whether that's a 15-minute ride to UT or an hour-long odyssey with two transfers.

**How we handled it:**

### Walkability score
As someone apartment hunting in Austin without a car, I want the Housing model page to show me a quick visual indicator of how walkable the surrounding area is. Something like a walkability score badge or a sidewalk coverage stat right on the card. I shouldn't have to click into every single listing to figure out if I'll be stranded in a car-dependent area.

**How we handled it:** For this user story, we retrieved the walkability score for each Housing instance, stored it in our database, and then retrieved it via our API to display it as an attribute on the Housing model card and on the Housing instance page. We obtained our walkability scores from the Walk Score API; scores range from 0 to 100, where 0 indicates low walkability, and 100 indicates high walkability.

### Display Recency of Housing Listing Update
As a social worker helping clients find housing, I want the Housing instance pages to show me when a listing was last updated or verified so I know if the information is still current. Affordable units in Austin get snapped up fast. If a listing hasn't been refreshed in 6 months, I could be sending a client to chase a unit that's been filled since last summer.

**How we handled it:** For this user story, we added a last_synced_at column to the Housing model. Each time the housing data scraping script runs, last_synced_at is updated for all instances in the Housing model database to reflect the date and time of the run, and the data for those instances is updated accordingly. The date and time of the last update for each Housing instance are also displayed on its page. 

### Eye-Catching Splash Page Statistic
As a community organizer advocating before the city council, I want the splash page to lead with a compelling, data-driven statement about housing inequity in Austin (such as the number of cost-burdened households) so the platform immediately communicates civic urgency rather than feeling like a generic school project.

**How we handled it:** For this user story, we modified our splash page to include a text blurb about the percentage of Austin renters who spend more than 30% of their income on rent. We also added smaller text as a call to action for users to pay more attention to affordable housing availability.


### Transit Accessibility Indicators
As a wheelchair user, I want housing instance pages to clearly indicate whether connected transit stops are ADA accessible (e.g., ramp or platform availability) so I can determine accessibility without repeatedly navigating back and forth between pages.

**How we handled it:** For this user story, we added an attribute to the Transportation instances called Disability Services. This attribute describes the ADA accessibility features available at the given transit stop, such as ramps or lifts.


### Neighborhood Visual Context
As an Austin resident unfamiliar with neighborhood boundaries, I want each Communities model card to include a small map preview or recognizable landmark image so I can quickly identify the area being referenced rather than relying on text alone.

**How we handled it:** For this user story, we embedded a map highlighting the community they were looking at, and also added a picture of the community.


### Transit Stop Route Frequency Information
As a daily bus rider, I want each transit stop instance page to list the routes that serve the stop and provide an overview of service frequency so I can understand whether the stop is a high-access hub or a limited-service location. An embedded map should also clearly show where the stop is located.

**How we handled it:** For this user story, we added an attribute called Service that shows how often a transportation medium arrives at a stop. We also added another attribute called Routes that shows you the route the medium takes and a map of where the stop is located.


### Affordable Housing Income Qualification Details
As a single parent searching for affordable housing, I want each housing instance page to clearly display the specific income restriction levels (e.g., 30% or 60% of Area Median Income) so I can quickly determine whether I qualify rather than relying on a vague "affordable" label.

**How we handled it:** For this user story, we added an attribute called Income Restriction Level, which displays the percentage of the Average Median Income (AMI score of a housing unit).

## Data Scraping

We populated our three models by combining data from several public APIs and datasets. For the communities model, we started with Austin affordable housing zip code data from data.austintexas.gov and enriched it with population data from the US Census ACS5 API, median housing prices from Zillow, crime index data from Austin DataHub, park counts from the Austin DataHub, park counts from the Austin parks dataset, and healthcare establishment counts from the US Census Business Patterns API. We also used the Walk Score API for transit and walkability scores and the Google Maps API to generate map embeds and street view images for each community.

For the Housing model, we queried the Austin Open Data Portal using the SODA 2 API, filtering for completed projects with at least one affordable unit. We merged records by project name to remove duplicates and enriched each record with a street view image from the Google Maps Street View API and a walkability score from the Walk Score API.

For the Transportation model, we downloaded the CapMetro GTFS dataset containing stops, routes, trips, and service calendars. From this we calculated service frequency at each stop by averaging arrival time gaps across active service IDs and identified wheelchair accessibility and service days. We also used the Google Maps Direction API to estimate transit travel times from each stop to UT campus, downtown, and the Domain

## Model Association

Communities, Housing, and Transportation are linked by many-to-many relationships stored in three association tables: `community_housing`, `community_transportation`, and `housing_transportation`. The script `associations.py` builds these links by geographic proximity: it clears the association tables, then runs SQL that finds, for each community, housing, and transit stop (with valid lat/lon), the nearest entity of each other type and inserts the pairs. The script only updates association tables, not the entity data, and is run after scraping. The API exposes related entities when fetching a single instance (e.g. `include_relations=True`), so the frontend can show linked housing and transit on community pages, and linked communities and transit on housing and transportation pages.


## RESTful API

The CivicHousing API was designed using Postman and provides access to all three models. The API follows REST conventions and returns JSON for all endpoints.

**Base URL:** `https://api.civichousing.me/api`

No authentication is required. All endpoints are publicly accessible.

**Endpoints:**

- `GET https://api.civichousing.me/api/community` — Returns all community instances. Each object includes the community name, image, and a list of attributes such as county, zip code, median housing price, population, crime index, and public transit score.
- `GET https://api.civichousing.me/api/community/:id` — Returns a single community by ID. Used for retrieving detailed information about a specific Austin neighborhood.
- `GET https://api.civichousing.me/api/housing` — Returns all housing instances. Each object includes the property name, image, and attributes such as address, rent cost, unit type, and accessibility score.
- `GET https://api.civichousing.me/api/housing/:id` — Returns a single housing instance by ID. Used for retrieving detailed information about a specific affordable housing unit.
- `GET https://api.civichousing.me/api/transportation` — Returns all transportation instances. Each object includes the stop name, image, and attributes such as type, line, accessibility score, daily departures, and route count.
- `GET https://api.civichousing.me/api/transportation/:id` — Returns a single transportation instance by ID. Used for retrieving detailed information about a specific CapMetro bus or train stop.


## Models & Instances

Our three models are Communities, Housing, and Transportation.

The Communities model encapsulates the different neighborhoods within Austin. There are 28 instances in the Communities model. The attributes displayed on the Communities model cards are zip codes, county, median housing prices, population, crime index, number of parks, number of healthcare facilities, transit score, total affordable units, and housing projects. The same attributes can also be seen with an extended description on each Community instance page. The instances of this model display images, a Google Maps embed, and a street view embed as the media sources.

The Housing model represents the various affordable housing complexes in Austin. There are 403 instances in the Housing model. The attributes displayed on the Housing model cards are address, ZIP code, affordable units, unit type, housing tenure, and walkability score. The same attributes can also be seen with an extended description on each Housing instance page. The instances of this model display images, a Google Maps embed with a walking route to the nearest transit stop, and a street view embed as the media sources.

The Transportation model represents the transit stops in Austin. There are an estimated 2342 instances in the Transportation model. The attributes displayed on the Transportation model cards are transport type, route(s), frequency, travel time to UT, travel time to downtown, service (frequency of transit through this stop), number of routes, and the status of wheelchair accessibility. The same attributes can also be seen with an extended description on each Transportation instance page. The instances of this model display images, a Google Maps embed, and a street view embed as the media sources.

## Tools

Our development tools include GitLab, React, Postman, and AWS.

**GitLab** — Used for Git repository management, CI/CD, and project management through issues.

**React** — Frontend framework used to build our dynamic and responsive web application.

**Postman** — API development platform used to design and document the RESTful API for this website
.
**AWS Amplify** — Cloud platform used to host our website frontend.

**AWS Elastic Beanstalk** — Cloud platform used to host our website backend.

**AWS RDS** — Cloud platform used to host our database.

**Flask** — Web framework for our backend server.

**Docker** — Containerization platform used to package the backend application and its dependencies into reproducible environments.

**Jest** — JavaScript testing framework used for running frontend unit tests.

**unittest** — Python testing framework used to write and run backend unit tests.

**Selenium** — Browser automation tool used for end-to-end testing of the web application interface.


## Hosting

Our website is hosted on AWS cloud services. The frontend server is deployed via AWS Amplify. Our website uses AWS Amplify’s hosted zone through Route 53 to provide HTTPS and create subdomains, such as api.civichousing.me. The website domain, civichousing.me, was registered through Namecheap and is now managed through the Route 53 hosted zone. Our backend server is hosted and deployed via AWS Elastic Beanstalk. The backend server provides a managed environment to run our Flask application, and exposes our REST API through the domain api.civichousing.me for our frontend to retrieve data from. Our database server is hosted on the cloud with AWS RDS, which provides a managed PostgreSQL database instance on the cloud. Our backend scripts update the information stored in our database server, our backend server retrieves information from the database when API requests are made, and our frontend server uses the API to fetch and display the data on our website. 


## Architecture

The frontend of our website was built with React and Bootstrap and hosted with AWS Amplify. AWS’s hosted zone provided HTTPS support for our website. Our backend uses Flask, Flask-CORS, and SQLAlchemy. Our backend server is hosted via AWS Elastic Beanstalk. Our PostgreSQL database is hosted on AWS RDS. Our CI/CD is handled by GitLab Pipelines and does an automated build in addition to running the backend and frontend unit tests we’ve created. Our RESTful API documentation was designed using Postman. Our backend unit tests use Python’s unittest as a testing framework, our backend API tests were created with Postman, our frontend acceptance tests use Selenium, and our frontend unit tests use Jest. 


## Challenges

The main challenges we faced were learning and using new toolchains for the first time. Most of our project members had either limited or no experience working with tools such as Postman, AWS, and React. We overcame this challenge by using the Internet and AI to explain different toolchains and help with the website setup.

We also had trouble publishing the Postman API documentation. After a lot of troubleshooting and googling, we were able to figure out what settings were needed to publish the documentation by making sure we were using a public workspace and not utilizing an enterprise account.

A challenge we faced was how to design the instance page where all the information was organized in a clean way and worked well with the information from the other instance pages, since it was a template. We overcame this challenge by using the Material UI Masonry, which is a container that orders content by rows and adds items to the shortest column to optimize the space.

Additionally, during Phase II, one of the main challenges we faced was finding the appropriate data sources to scrape our data from. One of our user stories asked for walk scores and transit scores. The Walk Score API we wanted and ended up using only gave API keys to accounts that had email addresses in the same domain as their website domains. This added an extra layer of work just to access that API key since we needed ot set up email services with AWS and store the email inbox contents in an AWS S3 bucket to access this API. 

During Phase III, one of the main challenges we faced was implementing the search feature and properly aligning it with the ts_vector in the database. We encountered issues where search results were incomplete or not ranked correctly due to inconsistencies in how the ts_vector was generated and updated across models. To fix this, we recreated the triggers to ensure all relevant fields were included and debugged migration issues that caused missing functions. We also refined the ranking logic by combining ts_rank with both plain and phrase queries to improve accuracy. This process gave us a deeper understanding of PostgreSQL full-text search and the importance of keeping database logic consistent.

Alongside this struggle, we also struggled a bit with creating associations between instances. Austin’s transit system is a bit lacking, and as a result, not all ZIP codes actually contain transit stops or even affordable housing units. As a result, when no affordable housing units or transit stops were available within a ZIP code, we would have to associate it with the nearest affordable housing unit or transit stop. 

## Implementations of Phase II Features

Model associations — Many-to-many links via `community_housing`, `community_transportation`, and `housing_transportation`, built by `associations.py` using nearest-neighbor distance (lat/lon).

Data scraping — Three scripts:
- Communities: Austin Open Data, Census, Zillow, crime, parks, healthcare, Walk Score API, Google Maps.
- Housing: Austin SODA 2 API, merged by project name; Walk Score, Street View, income restriction from MFI; `last_synced_at` and optional street-view refresh.
- Transportation: CapMetro GTFS (stops, routes, frequency, wheelchair accessibility, service days); Google Directions API for travel times to UT, downtown, and the Domain.

API enhancements — Housing detail endpoint returns nearest stop, walking distance, `closest_stop_frequency`, and optional walking-route map; list endpoints support pagination and housing filters (`zip`, `district`); community instance enriched on frontend with aggregated affordable units and housing count.

Frontend — Instance pages show Phase II fields (walk score, last updated, transit score, affordable-units/housing count, routes, frequency, travel times, disability services, walking route/distance/frequency for housing).

Backend — Phase II backend work includes the `associations.py` script (run separately to rebuild community–housing–transportation links), the three scraping scripts (communities, housing, transportation) that upsert and refresh entity and association data, and Flask route logic: the housing detail endpoint computes the nearest transit stop (haversine or Google Directions), walking distance, and `closest_stop_frequency`; list endpoints use pagination and, for housing, optional `zip` and `district` query filters. Environment variables (e.g. `DATABASE_URL`, `GOOGLE_MAPS_API_KEY`, `WALK_SCORE_API_KEY`, `GTFS_URL`) drive external API and DB access.


## Pagination

All three list endpoints (`/api/community`, `/api/housing`, `/api/transportation`) support pagination. The backend accepts a `page` query parameter (default 1) and uses a fixed `per_page` of 50; it uses SQLAlchemy’s `query.paginate()` with `error_out=False` so out-of-range pages return an empty list instead of a 404. Each response includes `data` (the current page of items), `total` (total count), `page` (current page number), and `pages` (total number of pages). On the frontend, the model pages (Communities, Housing, Transportation) use this payload to display a pagination bar with first, previous, next, and last controls, and show “Page X of Y” plus the range of items (e.g. “1–50 of 403”). When the user changes page, the frontend fetches the new page from the API and updates the list. The community instance page also uses pagination when loading all housing in a zip code (requesting `page` and `per_page=50` in a loop until all pages are fetched) to compute aggregated affordable-units and housing-count stats.


## User Stories (Phase II)

### Transparent Route Distance + Frequency
As a single parent working two jobs near the Domain, I want to see which affordable housing units are within a short walk of a bus stop that actually has frequent service, not just "near transit." A half-mile walk to a stop where the bus comes once an hour at 6 AM isn't real transit access. Show me the walking distance and the route frequency together on the housing instance page so I can make a real decision.

**How we handled it:** For this user story, we made the housing detail API compute the nearest transit stop to each housing location and return both the walking distance (using Google Directions when available, or a straight-line estimate) and the stop’s service frequency. On the Housing instance page we display these together, along with an optional embedded map of the walking route to the stop, so users can judge real transit access at a glance.


### Walkability Score
As someone apartment hunting in Austin without a car, I want the Housing model page to show me a quick visual indicator of how walkable the surrounding area is. Something like a walkability score badge or a sidewalk coverage stat right on the card. I shouldn't have to click into every single listing to figure out if I'll be stranded in a car-dependent area.

**How we handled it:** For this user story, we retrieve the walkability score for each Housing instance from the Walk Score API, store it in our database, and expose it via our API. We display it as an attribute on the Housing model cards and on each Housing instance page so users can see how walkable an area is without opening every listing. Scores range from 0 to 100, with higher values indicating better walkability.


### Affordable Housing Units Statistic
As a city council staffer researching transit equity, I want the Communities instance pages to clearly show the ratio of affordable housing units to total housing in that neighborhood alongside its transit score. A community might look well-served by buses, but if there are only 3 affordable units in the whole area, that transit access isn't really helping the people who need it most.

**How we handled it:** For this user story, we made each Community instance page fetch all housing in that community’s zip code and aggregate the total number of affordable units and the number of housing projects. We display these totals alongside the transit score on the Communities instance page so staffers can see both transit service and affordable housing supply in one place.


### Transportation Page — Distance to Major Locations
As a UT student who's never lived off-campus before, I want the Transportation model page to show me roughly how long it would take to get from each stop to major destinations like campus or downtown, not just the stop's location. Knowing a bus stop exists on Riverside doesn't help me unless I know whether that's a 15-minute ride to UT or an hour-long odyssey with two transfers.

**How we handled it:** For this user story, we added travel-time attributes to each Transportation instance: travel time to UT, to downtown Austin, and to the Domain. Our transportation scraper uses the Google Directions API (transit mode) to compute these from each stop’s coordinates. We display these travel times on the Transportation model cards and on each transit stop instance page so students can compare stops by how long it takes to reach campus or downtown.


### Display Recency of Housing Listing Update
As a social worker helping clients find housing, I want the Housing instance pages to show me when a listing was last updated or verified so I know if the information is still current. Affordable units in Austin get snapped up fast. If a listing hasn't been refreshed in 6 months, I could be sending a client to chase a unit that's been filled since last summer.

**How we handled it:** For this user story, we added a `last_synced_at` column to the Housing model. Each time the housing data scraping script runs, we update this timestamp for every Housing record that was synced, and we display the last-updated date and time on each Housing instance page so case workers can see how current the listing is.

## PHASE III


## Implementations of Phase III Features

MModel associations: Many-to-many links via community_housing, community_transportation, and housing_transportation, built through association logic connecting models based on shared attributes and relationships.

Search, sorting, and filtering: Implemented in Phase III using search.py for handling full-text search queries and ranking logic, and models.py for defining and maintaining ts_vector fields with triggers to keep them updated. Search supports both plain and phrase queries with relevance-based ranking, while list endpoints now include dynamic sorting and filtering through query parameters such as sort, order, and model-specific filters.

API enhancements: All model endpoints now support integrated search, sorting, and filtering, allowing users to query data more efficiently. Pagination remains supported, and search results include highlighted matches using PostgreSQL full-text search functions.

Frontend: Model pages were updated to include interactive search bars, sorting options, and filter controls, enabling users to dynamically refine and explore data across housing, community, and transportation models.

Backend: Phase III backend work focused on integrating full-text search with PostgreSQL using ts_vector, implementing trigger functions in models.py to keep search indexes updated, and building reusable query logic in search.py. Additional improvements include consistent handling of query parameters for sorting and filtering, ensuring efficient and scalable data retrieval across all endpoints.


## User Stories (Phase III)

### Communities : Show number of connected transit stops on neighborhood cards
As a car free renter, I want each neighborhood card to display how many transit stops serve that area so I can quickly gauge transit access while browsing. A neighborhood with 2 bus or transit stops is very different from one with 20 in terms of transportability and quality of life. 

**How we handled it:** 
For this user story, we used our existing many-to-many associations between communities and transportation stops to count how many transit stops are linked to each community. This count is computed on the backend and returned through the API, then displayed directly on each community card so users can quickly compare transit access across neighborhoods.


### Housing : Show income restriction levels on Housing Cards
As a single parent browsing the housing model page, I want each housing card to show the income restriction tier, like 30% AMI, or 60% AMI for example. That way, I can immediately tell which properties I might qualify for without clicking into every listing. 

**How we handled it:**
 For this user story, we included the income_restriction_level attribute in our Housing model and ensured it is returned in the housing list API. We then displayed this value directly on each housing card and instance page so users can immediately identify which properties match their eligibility without needing to click into each listing.


### Housing : Link to Google Maps directions from housing instance pages
As a prospective tenant visiting a property in person, I want a "Get Directions" link on each housing instance page that opens Google Maps with the property address pre-filled, so I don't have to copy-paste the address manually. 

**How we handled it:**
For this user story, we generated a Google Maps directions URL using each housing instance’s address and exposed it through the API. On the Housing instance page, we added a “Get Directions” button that opens Google Maps with the destination pre-filled, allowing users to easily navigate to the property without manual input.


### Transportation : Color Code Transit routes by type or frequency
As a daily bus rider, I want transit route cards to have a visual indicator, like maybe a colored badge or icon, distinguishing high frequency routes from infrequent ones, so I can spot the reliable routes at a glance while browsing the model page. 

**How we handled it:** 
For this user story, we implemented frontend-based styling for the frequency field on transportation cards. The frequency text is displayed with different colors and includes an emoji indicator to visually distinguish high-frequency routes from less frequent ones. This allows users to quickly identify more reliable transit options at a glance without needing to interpret the raw numbers.


### Model Pages : Data Freshness badge (date) on model pages
As a social services coordinator, I want to see a "Data as of [date]" badge on each model page so that I know whether I'm working with current information before I start recommending housing or transit options to clients. 

**How we handled it:** 
For this user story, we tracked a last_synced_at timestamp for our data during scraping and exposed it through the API. On the frontend, we displayed a “Data as of” badge on model and instance pages using this timestamp so users can easily understand how current the data is before making decisions.