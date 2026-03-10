import ModelPage from "../../components/ModelPage";
export default function Housing() {

  return (
    <ModelPage
  title="Housing"
  apiEndpoint="/api/housing"
  modelName="housing"
  attributes={[
    { title: "Address", key: "address" },
    { title: "Zip Code", key: "zip_code" },
    { title: "Affordable Units", key: "total_affordable_units" },
    { title: "Unit Type", key: "unit_type" },
    { title: "Housing Tenure", key: "housing_tenure" },
    { title: "Walkability Score", key: "walk_score" }
  ]}
/>
  );

}