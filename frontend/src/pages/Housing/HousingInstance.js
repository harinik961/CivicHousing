import InstancePage from "../../components/InstancePage";
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
    policies and planning decisions affecting this area.`

};
export default function HousingInstance() {
  return (
    <InstancePage
      apiEndpoint="/api/housing"
      fields={housingFields}
      attributeDescriptions={housingDescriptions}
      getImage={getImage}

    />
  );
}