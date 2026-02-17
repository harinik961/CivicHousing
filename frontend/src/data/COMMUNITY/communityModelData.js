const communityData = [
  {
    /*
    Instances: Neighborhoods (muller, domain etc)
Attributes: 
County
Zip Codes
Median Housing Prices
Population
Crime Index
Public Transit Score
Connections: 
Model connects to Housing and Transit Stops
*/


    id: 1,
    name: "Neighborhood A",
    image: "https://images.unsplash.com/photo-1618768083770-309776478953?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y29tbXVuaXR5JTIwaG91c2VzfGVufDB8fDB8fHww",
    attributes: [
      {title: "County", value: "Travis County"},
      {title: "Zip Codes", value: "78723"},
      {title: "Median Housing Price", value: "$550,000"},
      {title: "Population", value: "6900"},
      {title: "Crime Index", value: "32"},
      {title: "Public Transit Score", value: "78"}  
    ]
  },

  {
    id: 2,
    name: "Neighborhood B",
    image: "https://images.unsplash.com/photo-1721388468916-78b8878b7a92?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8Y29tbXVuaXR5JTIwaG91c2VzfGVufDB8fDB8fHww",
    attributes: [
      {title: "County", value: "Travis County"},
      {title: "Zip Codes", value: "78743"},
      {title: "Median Housing Price", value: "$250,000"},
      {title: "Population", value: "500"},
      {title: "Crime Index", value: "2"},
      {title: "Public Transit Score", value: "38"}
    ]
  },

  {
    id: 3,
    name: "Neighborhood C",
    image: "https://images.unsplash.com/photo-1515959182800-919d4a5ad9fd?q=80&w=1742&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    attributes: [
      {title: "County", value: "Travis County"},
      {title: "Zip Codes", value: "78723, 78724"},
      {title: "Median Housing Price", value: "$450,000"},
      {title: "Population", value: "16900"},
      {title: "Crime Index", value: "62"},
      {title: "Public Transit Score", value: "79"}
    ]
  }
];

export default communityData;
