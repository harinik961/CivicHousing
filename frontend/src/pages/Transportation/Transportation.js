import ModelPage from "../../components/ModelPage";
import transportationData from "../../data/TRANSPORTATION/transportationModelData";

export default function Transportation() {
  return (
    <ModelPage
      title="Transportation"
      data={transportationData}
      modelName="transportation"
    />
  );
}