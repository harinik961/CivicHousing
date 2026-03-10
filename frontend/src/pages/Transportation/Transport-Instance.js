import InstancePage from "../../components/InstancePage";
const getImage = (item) => item.street_view_url;

const transportFields = [
    "transport_type",
    "routes",
     "frequency",
    "service_days",
    "num_routes",    
    "wheelchair_accessible",
    "stop_name",
    "stop_id",
  "map_embed_url",
  "street_view_url",
    "travel_time_ut",
    "travel_time_downtown",
    "travel_time_domain"
];

const transportDescriptions = {

  stop_name: (value, item) =>
    `The transportation stop is named ${value}. 
    This stop serves as a key access point for residents and commuters, providing connectivity to various routes and transportation options in the area.`,
  routes : (value, item) =>
    `The transportation stop serves the following routes: ${value}. 
    These routes provide residents with access to different parts of the city, facilitating convenient travel and connectivity to key destinations such as employment centers, educational institutions, and recreational areas.`,
  frequency: (value, item) =>
    `The transportation stop has a frequency of ${value}. 
    This indicates how often transportation services are available at this stop, which can impact the convenience and accessibility for residents relying on public transit for their daily commutes and travel needs.`,
  service_days: (value, item) =>
    `The transportation stop operates on the following service days: ${value}. 
    This information helps residents plan their travel and understand when they can access transportation services at this stop, ensuring they can effectively utilize public transit for their mobility needs.`,
  num_routes: (value, item) =>
    `The transportation stop serves ${value} routes. 
    This number reflects the level of connectivity and accessibility provided by this stop, as more routes typically indicate greater options for residents to reach various destinations across the city.`,
  wheelchair_accessible: (value, item) =>
    `The transportation stop is ${value ? "wheelchair accessible" : "not wheelchair accessible"}. 
    This information is crucial for residents with mobility challenges, as it indicates whether they can access transportation services at this stop using a wheelchair or other mobility aids.`,

  travel_time_ut: (value, item) =>
    `From this stop, it takes approximately ${value} to reach the UT Austin campus. This estimate helps students understand how long their commute to class will take using this route.`,

  travel_time_downtown: (value, item) =>
    `From this stop, it takes approximately ${value} to reach downtown Austin. This gives riders a sense of how convenient this stop is for accessing jobs, entertainment, and other activities in the city center.`,

  travel_time_domain: (value, item) =>
    `From this stop, it takes approximately ${value} to reach The Domain area. This helps riders gauge how practical this stop is for reaching major shopping, dining, and employment destinations in North Austin.`
};
export default function TransportationInstance() {
  return (
    <InstancePage
      apiEndpoint="/api/transportation"
      fields={transportFields}
      attributeDescriptions={transportDescriptions}
      getImage={getImage}

    />
  );
}