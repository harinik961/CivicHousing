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
  const filterOptions = [
    {
      min_parameter: "population_min",
      max_parameter: "population_max",
      label: "Population",
      buckets: [
        { label: "All", min: null, max: null },
        { label: "Under 15k pop. ", min: null, max: 15000 },
        { label: "15-25k pop. ", min: 15000, max: 25000 },
        { label: "25k+ pop. ", min: 25000, max: null },
      ],
    },
  ];

  return (
      <ModelPage
      title="Communities"
      apiEndpoint="/api/community"
      modelName="community"
      attributes={MODEL_ATTRIBUTES.community}
      sortOptions={sortOptions}
      filterOptions={filterOptions}

    />
  );

}

