import { useParams } from "react-router-dom";
import InstanceCard from "./InstanceCard";
import ModelCard from "./ModelCard";

import housingData from "../data/HOUSING/housingModelData";
import communityData from "../data/COMMUNITY/communityModelData";
import transportationData from "../data/TRANSPORTATION/transportationModelData";

export default function InstancePage({ data, modelName }) {

  const { id } = useParams();
  const item = data.find(d => d.id === parseInt(id));

  if (!item) return <h2>Instance not found</h2>;

  const attributes = item.attributes;

  const allModels = ["housing", "community", "transportation"];
  const relatedModels = allModels.filter(m => m !== modelName);

  return (
    <div className="container-fluid mt-4">

      <h1 className="mb-4">{item.name}</h1>{
          item.description && <p className="mb-4">{item.description}</p>
      }

      <div className="masonry">

        {/* IMAGE CARD */}
        <div className="masonry-item">
          <InstanceCard title={item.name}>
            <img
              src={item.image}
              alt={item.name}
              className="related-image"
            />
          </InstanceCard>
        </div>

        {/* ATTRIBUTE CARDS */}
        {attributes.map((attr, i) => (
          <div className="masonry-item" key={i}>
            <InstanceCard title={attr.title}>
              <p>{attr.value}</p>
            </InstanceCard>
          </div>
        ))}

        {/* MAP CARD */}
        <div className="masonry-item">
          <InstanceCard title="Map">
            <iframe
              src={item.mapEmbed}
              width="100%"
              height="240"
              style={{ border: 0 }}
              loading="lazy"
              title="map"
            />
          </InstanceCard>
        </div>

        {/* RELATED MODEL CARDS (FIXED) */}
        {relatedModels.map((model, i) => {

          const dataset =
            model === "housing"
              ? housingData
              : model === "community"
              ? communityData
              : transportationData;

          const relatedItem = dataset.find(d => d.id === item.id);

          return (
            <div className="masonry-item" key={i}>
              <ModelCard
                item={relatedItem}
                modelName={model}
              />
            </div>
          );
        })}

      </div>

    </div>
  );
}
