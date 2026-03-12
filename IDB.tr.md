# CivicHousing Technical Report

## Motivations

Nearly half of Austin renters spend more than 30% of their income on rent. Housing is a basic right. Austin renters shouldn't have to break the bank just to keep a roof over their heads. But without clear, accessible data, inequality remains invisible and unaddressed. We built this website because affordable housing in Austin is not just a statistic; it affects real people trying to live and work in the city. As rent rises and neighborhoods change, it becomes harder to understand what options actually exist. We wanted to create something that brings housing, community, and transportation information together in one place so it feels less overwhelming and clearer. Our goal is to make this data easier to explore and more meaningful for anyone trying to navigate affordability in Austin.


## User Stories

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


## RESTful API

The CivicHousing API was designed using Postman and provides access to all three models. The API follows REST conventions and returns JSON for all endpoints.

**Base URL:** `https://api.civichousing.me/api`

No authentication is required. All endpoints are publicly accessible.

**Endpoints:**

- `GET /community` — Returns all community instances. Each object includes the community name, image, and a list of attributes such as county, zip code, median housing price, population, crime index, and public transit score.
- `GET /community/:id` — Returns a single community by ID. Used for retrieving detailed information about a specific Austin neighborhood.
- `GET /housing` — Returns all housing instances. Each object includes the property name, image, and attributes such as address, rent cost, unit type, and accessibility score.
- `GET /housing/:id` — Returns a single housing instance by ID. Used for retrieving detailed information about a specific affordable housing unit.
- `GET /transportation` — Returns all transportation instances. Each object includes the stop name, image, and attributes such as type, line, accessibility score, daily departures, and route count.
- `GET /transportation/:id` — Returns a single transportation instance by ID. Used for retrieving detailed information about a specific CapMetro bus or train stop.


## Models

Our three models are Communities, Housing, and Transportation.

The Communities model encapsulates the different neighborhoods within Austin. There are an estimated 10+ instances in the Communities model. The six attributes displayed on the Communities model cards are county, zip codes, median housing prices, population, crime index, and public transit score. The instances of this model display images and a Google Maps embed as the media sources.

The Housing model encapsulates the different affordable housing complexes within Austin. There are an estimated 100+ instances in the Housing model. The six attributes displayed on the Housing model cards are address, unit type, income restriction level, total ADA units, approximate rent cost, and total affordable units. The instances of this model display images and a Google Maps embed as the media sources.

The Transportation model encapsulates the different transit stops within Austin. There are an estimated 20+ instances in the Transportation model. The five attributes displayed on the Transportation model cards are type, route(s), service (frequency of transit through this stop), route count, and disability services.


## Tools

Our development tools include GitLab, React, Postman, and AWS.

**GitLab** — Used for Git repository management, CI/CD, and project management through issues.

**React** — Frontend framework used to build our dynamic and responsive web application.

**Postman** — API development platform used to design and document the RESTful API for this website.

**AWS** — Cloud platform used to host our website.


## Hosting

Our website is hosted on AWS cloud services. The frontend of the website is deployed as a static website using Amazon S3. Our website also uses Amazon CloudFront to provide HTTPS support via SSL/TLS certificates. The website domain, civichousing.me, was registered through Namecheap and configured to point to our CloudFront distribution.


## Architecture

The frontend of our website was built with React and Bootstrap and hosted with AWS S3. CloudFront was used to provide HTTPS support via SSL/TLS certificates. CI/CD is handled by GitLab Pipelines, and our RESTful API documentation was designed using Postman.


## Challenges

The main challenges we faced were learning and using new toolchains for the first time. Most of our project members had either limited or no experience working with tools such as Postman, AWS, and React. We overcame this challenge by using the Internet and AI to explain different toolchains and help with the website setup.

We also had trouble publishing the Postman API documentation. After a lot of troubleshooting and googling, we were able to figure out what settings were needed to publish the documentation by making sure we were using a public workspace and not utilizing an enterprise account.

A challenge we faced was how to design the instance page where all the information was organized in a clean way and worked well with the information from the other instance pages, since it was a template. We overcame this challenge by using the Material UI Masonry, which is a container that orders content by rows and adds items to the shortest column to optimize the space.