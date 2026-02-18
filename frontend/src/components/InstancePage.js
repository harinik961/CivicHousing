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

      {/* PAGE TITLE */}
      <h1 className="instance-title">{item.name}</h1>
      {item.description && (
        <p className="instance-description">{item.description}</p>
      )}

      <div className="masonry">

        {/* HERO IMAGE CARD */}
        <div className="masonry-item">
          <InstanceCard className="overflow-hidden">
            <img
              src={item.image}
              alt={item.name}
              className="instance-image"
            />
          </InstanceCard>
        </div>

        {/* ATTRIBUTE CARDS */}
        {attributes.map((attr, i) => (
          <div className="masonry-item" key={i}>
            <InstanceCard>
              <div className="card-body">
                <h5 className="attribute-key">{attr.title}</h5>
                <div className="attribute-value">{attr.value}</div>
                <p className="description">{attr.Description}</p>
              </div>
            </InstanceCard>
          </div>
        ))}

        {/* MAP CARD */}
        <div className="masonry-item">
          <InstanceCard>
            <div className="card-body">
              <h5 className="attribute-key">Map</h5>
              <iframe
                src={item.mapEmbed}
                className="map-frame"
                loading="lazy"
                title="map"
              />
            </div>
          </InstanceCard>
        </div>

        {/* RELATED MODELS */}
        {relatedModels.map((model, i) => {
          const dataset =
            model === "housing"
              ? housingData
              : model === "community"
              ? communityData
              : transportationData;

          const relatedItem = dataset.find(d => d.id === item.id);

          if (!relatedItem) return null;

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
