import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import InstanceCard from "./InstanceCard";

export default function InstancePage({ apiEndpoint, fields, attributeDescriptions, getImage }) {

  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000${apiEndpoint}/${id}`)
      .then(res => res.json())
      .then(res => setItem(res))
      .catch(err => console.error("Error loading instance:", err));
  }, [id, apiEndpoint]);

  if (!item) return <h2>Loading...</h2>;

  const attributes = fields
    .filter(key => key !== "street_view_image" && item[key] !== undefined)
    .map(key => [key, item[key]]);

  return (
    <div className="container-fluid mt-4">
      <h1 className="instance-title">
        {item.project_name || item.line || item.county || `Item ${item.id}`}
      </h1>

      <div className="masonry">

        {attributes.map(([key, value], i) => {

          const label = key
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());

          return (
            <div className="masonry-item" key={i}>
              <InstanceCard>

                <div className="card-body">

                  <h5 className="attribute-key">{label}</h5>

                  {/* Show image inside the Project Name card */}
                  {key === "project_name" && getImage && getImage(item) && (
                    <img
                      src={getImage(item)}
                      alt={item.project_name}
                      className="instance-image"
                      style={{
                        width: "100%",
                        borderRadius: "10px",
                        marginBottom: "15px"
                      }}
                    />
                  )}

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