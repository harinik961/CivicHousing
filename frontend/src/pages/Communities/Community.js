
import ModelPage from "../../components/ModelPage";
import { MODEL_ATTRIBUTES } from "../../config/modelAttributes";
export default function Community() {

  return (
      <ModelPage
      title="Communities"
      apiEndpoint="/api/community"
      modelName="community"
      attributes={MODEL_ATTRIBUTES.community}
    />
  );

}