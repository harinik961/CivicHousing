const housingData = [
  {
  id: 1,
  name: "Westminster Manor",
  image: "https://res.cloudinary.com/caring-production/image/upload/c_fill,w_900,h_600,q_70/v1757361480/provider-portal/tbplsigtvwkkycxw6xpy.jpg",
  attributes: [
    { title: "Address", value: "4100 Jackson Ave, Austin, TX 78731", Description: "Westminster Manor is a senior living community located in Austin, Texas. It offers affordable housing options for seniors with income restrictions. The community provides various amenities and services to enhance the quality of life for its residents." },
    { title: "Unit Type", value: "Senior Living", Description: "The unit type at Westminster Manor is designed for senior living, providing a comfortable and supportive environment for older adults. The community offers various floor plans and amenities tailored to meet the needs of seniors." },
    { title: "Income Restriction Level", value: "50% AMI", Description: "The income restriction level at Westminster Manor is set at 50% of the Area Median Income (AMI). This means that to qualify for housing at this community, residents must have an income that does not exceed 50% of the median income for the Austin area." },
    { title: "Accessibility Score", value: "10", Description: "Westminster Manor has an accessibility score of 10, indicating that it is highly accessible for individuals with mobility challenges. The community features ramps, wide doorways, and other accommodations to ensure that residents can navigate the space comfortably." },
    { title: "Approximate Rent Cost", value: "$600.00", Description: "The approximate rent cost for housing at Westminster Manor is $600.00 per month. This affordable rent is designed to provide seniors with a cost-effective housing option while still offering a range of amenities and services." },
    { title: "Total Affordable Units", value: "2" , Description: "Westminster Manor has a total of 2 affordable units available for seniors who meet the income restrictions. These units provide an opportunity for low-income seniors to access quality housing in a supportive community setting." }
  ],
  mapEmbed: "https://www.google.com/maps?q=4100+Jackson+Ave+Austin+TX&output=embed"
}
,
  {
  id: 2,
  name: "3200 Duval Townhomes",
  image: "https://duvallvillage.com/assets/images/cache/p5-437b833234782d23873f27a0276a3af8.jpg",
  attributes: [
    { title: "Address", value: "3200 Duval St, Austin, TX 78705" },
    { title: "Unit Type", value: "Townhomes" },
    { title: "Income Restriction Level", value: "60% AMI" },
    { title: "Accessibility Score", value: "3" },
    { title: "Approximate Rent Cost", value: "$900.00" },
    { title: "Total Affordable Units", value: "20" }
  ],
  mapEmbed: "https://www.google.com/maps?q=3200+Duval+St+Austin+TX&output=embed"
}
,

    {
  id: 3,
  name: "La Cima Apartments",
  image: "https://www.therichmangroup.com/wp-content/uploads/2023/06/Community-Pool-Area-La-Cima-Apartments-970x647.jpg",
  attributes: [
    { title: "Address", value: "3200 Montopolis Dr, Austin, TX 78744" },
    { title: "Unit Type", value: "Apartments" },
    { title: "Income Restriction Level", value: "30% AMI" },
    { title: "Accessibility Score", value: "7" },
    { title: "Approximate Rent Cost", value: "$750.00" },
    { title: "Total Affordable Units", value: "25" }
  ],
  mapEmbed: "https://www.google.com/maps?q=3200+Montopolis+Dr+Austin+TX&output=embed"
}
];

export default housingData;

