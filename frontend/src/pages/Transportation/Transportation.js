import ModelPage from "../../components/ModelPage";
import { MODEL_ATTRIBUTES } from "../../config/modelAttributes";
export default function Transportation() {


  const sortOptions = [
  { value: "", label: "Featured" },
  { value: "num_routes|desc", label: "Num Routes: High to Low" },
  { value: "num_routes|asc", label: "Num Routes: Low to High" },
  { value: "travel_time_ut_minutes|asc", label: "Closest to UT (Travel Time)" },
  { value: "travel_time_downtown_minutes|asc", label: "Closest to Downtown (Travel Time)" },
  { value: "travel_time_domain_minutes|asc", label: "Closest to The Domain (Travel Time)" },
];

  const filterOptions = [
    {
      parameter: "transport_type",
      label: "Transport Type",
      buckets: [
        { label: "All", value: null },
        { label: "Bus", value: "Bus" },
        { label: "Rail", value: "Rail" }
      ]
    },
    {
      parameter: "wheelchair_accessible",
      label: "Wheelchair Accessibility",
      buckets: [
        { label: "All", value: null },
        { label: "Wheelchair Accessible", value: "Wheelchair Accessible" },
        { label: "Not Wheelchair Accessible", value: "Not Wheelchair Accessible" }
      ]
    }
  ];

  return (
    <ModelPage
  title="Transportation"
  apiEndpoint="/api/transportation"
  modelName="transportation"
  sortOptions={sortOptions}
  filterOptions={filterOptions}
  attributes={MODEL_ATTRIBUTES.transportation}
/>
  );

}
