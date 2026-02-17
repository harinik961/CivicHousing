import ModelPage from "../../components/ModelPage";
import housingData from "../../data/HOUSING/housingModelData";

export default function Housing() {
  return (
    <ModelPage
      title="Housing"
      data={housingData}
      modelName="housing"
    />
  );
}
