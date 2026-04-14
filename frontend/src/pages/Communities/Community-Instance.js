import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import InstancePage from "../../components/InstancePage";

const API_BASE = "https://api.civichousing.me";

const getImage = (item) => item.street_view_url;

const communityFields = [
  "zip_code",
  "county",
  "median_housing_price",
  "population",
  "crime_index",
  "park_count",
  "map_embed_url",
  "street_view_url",
  "health_count",
  "transit_score",
  "community_total_affordable_units",
  "community_housing_count", 
  "transportation_count",
];

async function fetchAllHousingByZip(zipCode) {
  const all = [];
  let page = 1;
  let pages = 1;
  do {
    const res = await fetch(
      `${API_BASE}/api/housing?zip=${encodeURIComponent(zipCode)}&page=${page}&per_page=50`
    );
    const data = await res.json();
    const list = data.data || [];
    all.push(...list);
    pages = data.pages ?? 1;
    page += 1;
  } while (page <= pages);
  return all;
}

function aggregateHousingStats(housingList) {
  const totalAffordable = (housingList || []).reduce(
    (sum, h) => sum + (Number(h.total_affordable_units) || 0),
    0
  );
  const count = housingList.length;
  
  return {
    community_total_affordable_units: totalAffordable,
    community_housing_count: count
  };
}

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
    `This community has a population of around ${value} residents. 
    This population size reflects the community's scale and diversity, contributing to the social fabric and vibrancy of the area.`,

  crime_index: (value, item) =>
    `The crime index for this community is currently at ${value}. 
    This index provides insight into the safety and security of the community, helping residents and potential movers understand the local crime trends and conditions.`,

  park_count: (value, item) =>
    `This community boasts ${value} parks and recreational areas. 
    These green spaces offer residents opportunities for outdoor activities, community gatherings, and access to nature, enhancing the overall livability of the community.`,

  health_count: (value, item) =>
    `This community has ${value} healthcare facilities, including hospitals, clinics, and medical centers. 
    This availability of healthcare resources is crucial for the well-being and health outcomes of residents in the community.`,

  transit_score: (value) =>
    `The transit score for this community is ${value ?? "—"}. 
    This score reflects how well the area is served by public transit, with higher values indicating better access to buses, rail, and other transit options.`,

  community_total_affordable_units: (value) =>
    `This community has ${value} affordable housing units in total across all listed housing projects in the area. 
    This figure helps assess how much affordable housing is available for residents who need it.`,

  community_housing_count: (value) =>
    `There are ${value} housing projects in this community that are tracked in the dataset. 
    Together with affordable unit counts, this indicates the scale of affordable housing supply in the neighborhood.`,

  transportation_count: (value) =>
    `There are ${value} transit stops that serve this community. 
    Higher numbers of available transportation stops indicate a greater availability of buses, rail, and other transit options.`,
};

export default function CommunityInstance() {
  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    setItem(null);
    fetch(`${API_BASE}/api/community/${id}`)
      .then((res) => res.json())
      .then((data) => setItem(data))
      .catch((err) => console.error("Error loading community:", err));
  }, [id]);

  useEffect(() => {
    if (!item?.zip_code) return;
    fetchAllHousingByZip(item.zip_code)
      .then((housingList) => {
        const stats = aggregateHousingStats(housingList);
        setItem((prev) => (prev ? { ...prev, ...stats } : prev));
      })
      .catch((err) => console.error("Error loading housing by zip:", err));
  }, [item?.zip_code]);

  const itemReady =
    item &&
    (item.community_total_affordable_units !== undefined || !item.zip_code);

  return (
    <InstancePage
      apiEndpoint="/api/community"
      fields={communityFields}
      attributeDescriptions={communityDescriptions}
      getImage={getImage}
      item={itemReady ? item : undefined}
      relatedModels={[
          {
            key: "housing",
            title: "Housing in This Community",
            modelName: "housing",
            attributes: [
              { title: "Address", key: "address" },
              { title: "Zip Code", key: "zip_code" },
              { title: "Affordable Units", key: "total_affordable_units" },
              { title: "Unit Type", key: "unit_type" },
              { title: "Housing Tenure", key: "housing_tenure" },
              { title: "Walkability Score", key: "walk_score" }, 
              { title: "Income Restriction Level", key: "income_restriction_level"}
            ]
          },
          {
            key: "transportation",
            title: "Transportation Nearby",
            modelName: "transportation",
            attributes: [
              { title: "Transit Type", key: "transport_type" },
              { title: "Routes", key: "routes" },
              { title: "Frequency", key: "frequency" },
              { title: "Travel Time to UT", key: "travel_time_ut" },
              { title: "Travel Time to Downtown", key: "travel_time_downtown" },
              { title: "Travel Time to The Domain", key: "travel_time_domain" },
              { title: "Service Days", key: "service_days" },
              { title: "Number of Routes", key: "num_routes" },
              { title: "Wheelchair Accessible?", key: "wheelchair_accessible" }
            ]
          }
        ]}
      />
  );
}

