const housingData = [
{
  id: 1,
  name: "Alexander Oaks Apartments",
  image: "https://picsum.photos/400/250",

  attributes: [
    { title: "Address", value: "6119 Valiant Cir, Austin, TX 78749" },
    { title: "Housing Program", value: "Income-restricted affordable housing" },
    { title: "Property Type", value: "Multi-family apartments" },
    { title: "City", value: "Austin" },
    { title: "Parking", value: "On-site parking available" }
  ],

  mapEmbed: "https://www.google.com/maps?q=6119+Valiant+Cir+Austin+TX&output=embed"
},

  {
    id: 2,
    name: "Affordable Apt B",
    image: "https://picsum.photos/400/300",
    attributes: [
      {title: "Address", value: "123 Main St"},
      {title: "Rent", value: "$2000"},
      {title: "Accessibility Score", value: "80"},
      {title: "Location", value: "Mueller"},
      {title: "Parking", value: "Yes"}
    ],
      mapEmbed: "https://www.google.com/maps?q=6119+Valiant+Cir+Austin+TX&output=embed"
  },

  {
    id: 3,
    name: "Affordable Apt C",
    image: "https://picsum.photos/400/",
    attributes: [
      {title: "Address", value: "450 Riverside Dr"},
      {title: "Rent", value: "$1100"},
      {title: "Bedrooms", value: "1"},
      {title: "Transit Score", value: "85"},
      {title: "Parking", value: "No"}
    ],
     mapEmbed: "https://www.google.com/maps?q=6119+Valiant+Cir+Austin+TX&output=embed"
  }
];

export default housingData;
