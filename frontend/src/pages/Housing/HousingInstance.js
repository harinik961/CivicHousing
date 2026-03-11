import InstancePage from "../../components/InstancePage";
import { MODEL_ATTRIBUTES } from "../../config/modelAttributes";
const getImage = (item) => item.street_view_image;

const housingFields = [
  "project_name",
  "street_view_image",
  "address",
  "unit_type",
  "housing_tenure",
  "income_restriction_level",
  "total_affordable_units",
  "total_ada_units",
  "council_district",
  "walk_score",
  "last_synced_at",
];

const housingDescriptions = {

  address: (value, item) =>
    `${item.project_name} is a housing development located at ${value}. 
    This property provides affordable housing opportunities for residents in the Austin area. 
    The location allows residents to access nearby transportation, services, and community resources.`,

  unit_type: (value, item) =>
    `The unit type at ${item.project_name} is categorized as ${value}. 
    This classification helps define the housing structure and the type of residents the development is designed to serve.`,

  income_restriction_level: (value, item) =>
    `The income restriction level for ${item.project_name} is set at ${value} of the Area Median Income (AMI). 
    This means households applying to live in this development must earn at or below this income threshold 
    in order to qualify for affordable housing.`,

  total_ada_units: (value, item) =>
    `${item.project_name} includes ${value} ADA-accessible unit${value === 1 ? "" : "s"} designed to accommodate 
    residents with mobility or accessibility needs. These units comply with accessibility standards 
    established by the Americans with Disabilities Act.`,

  total_affordable_units: (value, item) =>
    `${item.project_name} offers ${value} affordable housing unit${value === 1 ? "" : "s"} for qualifying residents. 
    These units are intended to provide housing options for households that meet specific income requirements.`,

  housing_tenure: (value, item) =>
    `The housing tenure for ${item.project_name} is classified as ${value}. 
    Housing tenure describes whether the property is intended for rental, ownership, 
    or another type of housing arrangement.`,

  council_district: (value, item) =>
    `${item.project_name} is located in Austin City Council District ${value}. 
    This district determines the local elected representative responsible for 
    policies and planning decisions affecting this area.`,

  walk_score: (value, item) =>
    `${item.project_name} has a walkability Score of ${value}. This score reflects how walkable the surrounding area is, 
    based on the proximity of amenities like grocery stores, schools, parks, and public transit. A higher score indicates a more walkable environment.`,

  last_synced_at: (value, item) => {
    const parsed = new Date(value);
    const centralTime = Number.isNaN(parsed.getTime())
      ? value
      : new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Chicago",
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZoneName: "short"
        }).format(parsed);

    return `The information for ${item.project_name} was last updated on ${centralTime}. This indicates the most recent date when 
    the housing data was synchronized with the source system.`;
  }

};
export default function HousingInstance() {
  return (
    <InstancePage
      apiEndpoint="/api/housing"
      fields={housingFields}
      attributeDescriptions={housingDescriptions}
      getImage={getImage}
      relatedModels={[

          {
            key: "transportation",
            title: "Transportation Nearby",
            modelName: "transportation",
            attributes: MODEL_ATTRIBUTES.transportation
          },

          {
            key : "community",
            title: "Community Information",
            modelName: "community",
            attributes: MODEL_ATTRIBUTES.community
          }

        ]}

    />
  );
}