import { useParams, Link } from "react-router-dom";
import InstanceCard from "./InstanceCard";

export default function InstancePage({ data, modelName }) {

  const { id } = useParams();

  const item = data.find(d => d.id === parseInt(id));

  if (!item) return <h2>Instance not found</h2>;

  // build attributes array (works even if your data uses attr1..attr5)
  const attributes = [
    { title: item.attr1Title, value: item.attr1 },
    { title: "Attribute 2", value: item.attr2 },
    { title: "Attribute 3", value: item.attr3 },
    { title: "Attribute 4", value: item.attr4 },
    { title: "Attribute 5", value: item.attr5 }
  ];

  const allModels = ["housing", "community", "transportation"];

  const relatedModels = allModels.filter(m => m !== modelName);


  return (
    <div className="container mt-4">

      <h1 className="mb-4">{item.name}</h1>

      {/* ATTRIBUTE GRID */}
      <div className="row g-3">
        {attributes.map((attr, i) => (
          <div className="col-md-4" key={i}>
            <InstanceCard title={attr.title}>
              <p>{attr.value}</p>
            </InstanceCard>
          </div>
        ))}
      </div>

      {/* FINAL ROW (MEDIA + RELATED MODELS) */}
      <div className="row g-3 mt-3">

        <div className="col-md-4">
          <InstanceCard title="Map">
            <iframe src={item.mapEmbed} width="100%" height="250" />
          </InstanceCard>
        </div>

        {relatedModels.map((model, i) => (
        <div className="col-md-4" key={i}>
            <InstanceCard title={model.charAt(0).toUpperCase() + model.slice(1)}>
            <Link to={`/${model}/${item.id}`}>
                View {model}
            </Link>
            </InstanceCard>
        </div>
        ))}




      </div>

    </div>
  );
}
