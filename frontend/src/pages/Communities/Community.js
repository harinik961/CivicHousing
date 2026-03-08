
import ModelPage from "../../components/ModelPage";
export default function Community() {

  return (
      <ModelPage
      title="Communities"
      apiEndpoint="/api/community"
      modelName="community"
      attributes={[
        { title: "Zipcode", key: "zip_code" },
        { title: " County", key: "county" },
        { title: "Median Housing Price", key: "median_housing_price" },
        { title: "Population", key: "population" },
        { title: "Crime Index", key: "crime_index" },
        { title: "Num Parks", key: "park_count" },
        { title: "Num Healthcare Facilities", key: "health_count" }
      ]}
    />
  );

}