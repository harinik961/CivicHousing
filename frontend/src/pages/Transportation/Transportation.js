import ModelPage from "../../components/ModelPage";
import { MODEL_ATTRIBUTES } from "../../config/modelAttributes";
export default function Transportation() {


  const sortOptions = [
  { value: "", label: "Featured" },

  { value: "num_routes|desc", label: "Num Routes: High to Low" },
  { value: "num_routes|asc", label: "Num Routes: Low to High" },

  { value: "frequency|asc", label: "Frequency: Faster (Lower Wait)" },
  { value: "frequency|desc", label: "Frequency: Slower (Higher Wait)" },

  { value: "travel_time_ut|asc", label: "Commute to UT: Shortest Time" },
  { value: "travel_time_ut|desc", label: "Commute to UT: Longest Time" },

  { value: "travel_time_downtown|asc", label: "Commute to Downtown: Closest" },
  { value: "travel_time_downtown|desc", label: "Commute to Downtown: Farthest" }
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
