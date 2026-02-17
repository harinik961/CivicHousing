import InstancePage from "../../components/InstancePage";
import communityData from "../../data/COMMUNITY/communityModelData";
export default function CommunityInstance() {
  return <InstancePage data={communityData} modelName="community" />;
}
