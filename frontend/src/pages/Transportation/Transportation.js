import ModelPage from "../../components/ModelPage";
import { MODEL_ATTRIBUTES } from "../../config/modelAttributes";
export default function Transportation() {


  const sortOptions = [
  { value: "num_routes|desc", label: "Num Routes: High to Low" },
  { value: "num_routes|asc", label: "Num Routes: Low to High" },
];

  return (
    <ModelPage
  title="Transportation"
  apiEndpoint="/api/transportation"
  modelName="transportation"
  sortOptions={sortOptions}
  attributes={MODEL_ATTRIBUTES.transportation}
/>
  );

}
