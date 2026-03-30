import ModelPage from "../../components/ModelPage";
import { MODEL_ATTRIBUTES } from "../../config/modelAttributes";
export default function Housing() {


  const sortOptions = [
    { value: "", label: "Featured" },
    { value: "walk_score|asc", label: "Walkability: Low to High" },
    { value: "walk_score|desc", label: "Walkability: High to Low" },
    { value: "income_restriction_level|asc", label: "Income: Low to High" },
    { value: "income_restriction_level|desc", label: "Income: High to Low" },
    { value: "total_ada_units|asc", label: "ADA Units: Low to High" },
    { value: "total_ada_units|desc", label: "ADA Units: High to Low" }
  ];
  const filterOptions = [
    {
      parameter: "unit_type",
      label: "Unit Type",
      buckets: [
        { label: "All", value: null },
        { label: "Single Family", value: "Single Family" },
        { label: "Multifamily", value: "Multifamily" }
      ]
    },
    {
      parameter: "housing_tenure",
      label: "Housing Tenure",
      buckets: [
        { label: "All", value: null },
        { label: "Ownership", value: "Ownership" },
        { label: "Rental", value: "Rental" }
      ]
    }
  ];
  return (
    <ModelPage
  title="Housing"
  apiEndpoint="/api/housing"
  modelName="housing"
  attributes={MODEL_ATTRIBUTES.housing}
  sortOptions={sortOptions}
  filterOptions={filterOptions}

/>
  );
}