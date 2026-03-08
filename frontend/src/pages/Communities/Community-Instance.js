import InstancePage from "../../components/InstancePage";
const getImage = (item) => item.street_view_url;

const communityFields = [
  "county",
  "zip_code",
  "median_housing_price",
  "population",
  "crime_index",
  "park_count",
  "map_embed_url",
  "street_view_url",
  "health_count"
];

const communityDescriptions = {

  county: (value, item) =>
    `This community is located in ${value} County. 
    The county is part of the Austin metropolitan area and contributes to the overall community dynamics and resources available to residents.`,
  zip_code: (value, item) =>
    `The community falls within the zip code ${value}. 
    This zip code area encompasses a diverse range of neighborhoods, amenities, and services that contribute to the quality of life for residents in this community.`,

  median_housing_price: (value, item) =>
    `The median housing price in this community is approximately $${value}. 
    This figure represents the midpoint of housing prices in the area, indicating the affordability and market conditions for potential homebuyers and renters.`,

  population: (value, item) =>
    `This Community has a population of around ${value} residents. 
    This population size reflects the community's scale and diversity, contributing to the social fabric and vibrancy of the area.`,

  crime_index: (value, item) =>
    `The crime index for this community is currently at ${value}. 
    This index provides insight into the safety and security of the community, helping residents and potential movers understand the local crime trends and conditions.`,

  park_count: (value, item) =>
    `This community boasts ${value} parks and recreational areas. 
    These green spaces offer residents opportunities for outdoor activities, community gatherings, and access to nature, enhancing the overall livability of the community.`, 

  health_count: (value, item) =>
    `This community has ${value} healthcare facilities, including hospitals, clinics, and medical centers. 
    This availability of healthcare resources is crucial for the well-being and health outcomes of residents in the community.`
};
export default function CommunityInstance() {
  return (
    <InstancePage
      apiEndpoint="/api/community"
      fields={communityFields}
      attributeDescriptions={communityDescriptions}
      getImage={getImage}

    />
  );
}
