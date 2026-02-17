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
    name: "North Point",
    image: "https://images.unsplash.com/photo-1618768083770-309776478953?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y29tbXVuaXR5JTIwaG91c2VzfGVufDB8fDB8fHww",
    mapEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d27555.584749832728!2d-97.67890350194469!3d30.309769776212054!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8644c82697dd2a87%3A0x836c240a09aed7da!2sNorth%20Point%2C%20Austin%2C%20TX%2078724!5e0!3m2!1sen!2sus!4v1771365673808!5m2!1sen!2sus",
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
    name: "Colony Park",
    mapEmbed:  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13778.797495377565!2d-97.64854415717866!3d30.302618849177968!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8644b7d82513dd8b%3A0x326f4875811183be!2sColony%20Park%2C%20Austin%2C%20TX%2078724!5e0!3m2!1sen!2sus!4v1771366960949!5m2!1sen!2sus",
    image: "https://images.unsplash.com/photo-1618768083770-309776478953?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y29tbXVuaXR5JTIwaG91c2VzfGVufDB8fDB8fHww",
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
    name: "Meadows Of Walnut Creek",
    image: "https://images.unsplash.com/photo-1515959182800-919d4a5ad9fd?q=80&w=1742&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    mapEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13778.58979766621!2d-97.64972834056907!3d30.30409663920241!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8644b7d8978d7c4d%3A0x83f95f7e1a6722a8!2sMeadows%20Of%20Walnut%20Creek%2C%20Austin%2C%20TX%2078724!5e0!3m2!1sen!2sus!4v1771364936297!5m2!1sen!2sus",
    attributes: [
      {title: "County", value: "Travis County"},
      {title: "Zip Codes", value: "78724"},
      {title: "Median Housing Price", value: "$400,000"},
      {title: "Population", value: "16900"},
      {title: "Crime Index", value: "62"},
      {title: "Public Transit Score", value: "79"}
    ]
  }
];

export default communityData;

