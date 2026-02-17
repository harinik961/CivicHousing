import InstancePage from "../../components/InstancePage";
import transportationData from "../../data/TRANSPORTATION/transportationModelData";

export default function HousingInstance() {
  return <InstancePage data={transportationData} modelName="transportation" />;
}
