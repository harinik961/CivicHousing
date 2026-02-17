import ModelPage from "../../components/ModelPage";
import communityData from "../../data/COMMUNITY/communityModelData";

export default function Housing() {
  return (
    <ModelPage
      title="Community"
      data={communityData}
      modelName="community"
    />
  );
}
