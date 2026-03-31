export const MODEL_ATTRIBUTES = {

  community: [
    { title: "Zipcode", key: "zip_code" },
    { title: " County", key: "county" },
    { title: "Median Housing Price", key: "median_housing_price" },
    { title: "Population", key: "population" },
    { title: "Crime Index", key: "crime_index" },
    { title: "Num Parks", key: "park_count" },
    { title: "Num Healthcare Facilities", key: "health_count" },
    { title: "Transit Score", key: "transit_score" },
    { title: "Total Affordable Units", key: "community_total_affordable_units" },
    { title: "Housing Projects", key: "community_housing_count" }, 
    { title: "Transportation Count", key: "transportation_count"},
  ],

  housing: [
    { title: "Address", key: "address" },
    { title: "Zip Code", key: "zip_code" },
    { title: "Affordable Units", key: "total_affordable_units" },
    { title: "Unit Type", key: "unit_type" },
    { title: "Housing Tenure", key: "housing_tenure" },
    { title: "Walkability Score", key: "walk_score" },
    { title: "Income Restriction Level", key: "income_restriction_level" }
  ],

  transportation: [
    { title: "Transport Type", key: "transport_type" },
    { title: "Routes", key: "routes" },
    { title: "Frequency", key: "frequency" },
    { title: "Travel time to UT", key: "travel_time_ut" },
    { title: "Travel time to Downtown", key: "travel_time_downtown" },
    { title: "Travel time to The Domain", key: "travel_time_domain" },
    { title: "Service", key: "service_days" },
    { title: "Num of Routes", key: "num_routes" },    
    { title : "Accessible?", key: "wheelchair_accessible" }
  ]

};