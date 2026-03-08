import ModelPage from "../../components/ModelPage";
export default function Transportation() {

  return (
    <ModelPage
  title="Transportation"
  apiEndpoint="/api/transportation"
  modelName="transportation"
  attributes={[
    { title: "Transport Type", key: "transport_type" },
    { title: "Routes", key: "routes" },
    { title: "Frequency", key: "frequency" },
    { title: "Service", key: "service_days" },
    { title: "Num of Routes", key: "num_routes" },    
    { title : "Accessible?", key: "wheelchair_accessible" }
  ]}
/>
  );

}