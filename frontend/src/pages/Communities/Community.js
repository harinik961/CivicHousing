
import ModelPage from "../../components/ModelPage";
import { MODEL_ATTRIBUTES } from "../../config/modelAttributes";
export default function Community() {

const sortOptions = [
    { value: "", label: "Featured" },
    { value: "median_housing_price|asc", label: "Median Housing Price: Low to High" },
    { value: "median_housing_price|desc", label: "Median Housing Price: High to Low" },
    { value: "health_count|asc", label: "Health Index: Low to High" },
    { value: "health_count|desc", label: "Health Index: High to Low" },
    { value: "crime_index|asc", label: "Crime Index: Low to High" },
    { value: "crime_index|desc", label: "Crime Index: High to Low" },
    { value: "park_count|asc", label: "Park Count: Low to High" },
    { value: "park_count|desc", label: "Park Count: High to Low" },

  ];
  return (
      <ModelPage
      title="Communities"
      apiEndpoint="/api/community"
      modelName="community"
      attributes={MODEL_ATTRIBUTES.community}
      sortOptions={sortOptions}

    />
  );

}