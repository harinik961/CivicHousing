import ModelPage from "../../components/ModelPage";
import { MODEL_ATTRIBUTES } from "../../config/modelAttributes";
export default function Housing() {

  return (
    <ModelPage
  title="Housing"
  apiEndpoint="/api/housing"
  modelName="housing"
  attributes={MODEL_ATTRIBUTES.housing}
/>
  );

}