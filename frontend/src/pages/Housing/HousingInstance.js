import InstancePage from "../../components/InstancePage";

const housingDescriptions = {

  income_restriction_level: (value) =>
    `This unit is restricted to households earning up to ${value} of the Area Median Income (AMI) for the Austin area. 
    This ensures that the housing remains affordable for families within this income bracket.`,

  total_affordable_units: (value) =>
    `This development includes ${value} affordable unit${value === 1 ? "" : "s"} that are reserved for qualifying households.`,

  total_ada_units: (value) =>
    `This property includes ${value} unit${value === 1 ? "" : "s"} that are accessible and compliant with ADA (Americans with Disabilities Act) standards.`,

  council_district: (value) =>
    `This housing project is located in Austin City Council District ${value}. The council district determines the local representative responsible for housing policy and development decisions in this area.`,

  latitude: (value, item) =>
    `Latitude (${value}) identifies the north–south geographic coordinate of the housing project "${item.project_name}". 
    This coordinate helps map the exact location of the development.`,

  longitude: (value, item) =>
    `Longitude (${value}) identifies the east–west geographic coordinate of the housing project "${item.project_name}". 
    When combined with latitude, it allows the property to be displayed accurately on maps.`

};

export default function HousingInstance() {
  return (
    <InstancePage
      apiEndpoint="/api/housing"
      attributeDescriptions={housingDescriptions}
    />
  );
}