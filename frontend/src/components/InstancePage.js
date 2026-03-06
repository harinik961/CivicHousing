import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import InstanceCard from "./InstanceCard";

export default function InstancePage({ apiEndpoint, attributeDescriptions }) {

  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000${apiEndpoint}/${id}`)
      .then(res => res.json())
      .then(res => setItem(res))
      .catch(err => console.error("Error loading instance:", err));
  }, [id, apiEndpoint]);

  if (!item) return <h2>Loading...</h2>;

  const attributes = Object.entries(item);

  return (
    <div className="container-fluid mt-4">

      {/* PAGE TITLE */}
      <h1 className="instance-title">
        {item.project_name || item.line || item.county || `Item ${item.id}`}
      </h1>

      <div className="masonry">

        {/* ATTRIBUTE CARDS */}
        {attributes.map(([key, value], i) => {

          if (key === "id") return null;

          return (
            <div className="masonry-item" key={i}>
              <InstanceCard>
                <div className="card-body">

                  <h5 className="attribute-key">{key}</h5>
                  <div className="attribute-value">
                    {String(value)}
                  </div>

                   {attributeDescriptions && attributeDescriptions[key] && (
                    <p className="description">
                      {typeof attributeDescriptions[key] === "function"
                        ? attributeDescriptions[key](value, item)
                        : attributeDescriptions[key]}
                    </p>
                  )}

                </div>
              </InstanceCard>
            </div>
          );
        })}

      </div>

    </div>
  );
}