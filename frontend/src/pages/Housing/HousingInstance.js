import InstancePage from "../../components/InstancePage";
import housingData from "../../data/HOUSING/housingModelData";

export default function HousingInstance() {
  return <InstancePage data={housingData} modelName="housing" />;
}
