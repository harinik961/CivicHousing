import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import InstanceCard from "./InstanceCard";

export default function InstancePage({ apiEndpoint, fields, attributeDescriptions, getImage }) {

  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    fetch(`https://api.civichousing.me/${apiEndpoint}/${id}`)
      .then(res => res.json())
      .then(res => setItem(res))
      .catch(err => console.error("Error loading instance:", err));
  }, [id, apiEndpoint]);

  if (!item) return <h2>Loading...</h2>;

  const attributes = fields
    .filter(key => item[key] !== undefined)
    .map(key => [key, item[key]]);

  const displayName = item.project_name || item.stop_name || item.zip_code || `Item ${item.id}`;
  const labelOverrides = {
    walk_score: "Walkability Score",
    last_synced_at: "Last Updated",
    map_embed_url: "Map View",
    street_view_url: "Street View",
    street_view_image: "Street View"
  };

  function normalizeImage(value) {
    if (!value || typeof value !== "string") return null;

    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("data:image")
    ) {
      return value;
    }

    return `data:image/jpeg;base64,${value}`;
  }

  function getStreetViewEmbedUrl(value) {
    if (!value || typeof value !== "string") return null;

    if (value.includes("/maps/embed/v1/streetview")) {
      return value;
    }

    try {
      const parsed = new URL(value);
      const location = parsed.searchParams.get("location");
      const key = parsed.searchParams.get("key");

      if (location && key) {
        return `https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(key)}&location=${encodeURIComponent(location)}&heading=210&pitch=10&fov=80`;
      }

      if (location) {
        return `https://www.google.com/maps?q=&layer=c&cbll=${encodeURIComponent(location)}`;
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function renderAttributeValue(key, value) {
    if (key === "last_synced_at" && typeof value === "string") {
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Chicago",
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZoneName: "short"
        }).format(parsed);
      }
    }

    if (key === "map_embed_url" && typeof value === "string") {
      return (
        <iframe
          src={value}
          title={`Map for ${displayName}`}
          width="100%"
          height="300"
          style={{ border: 0, borderRadius: "10px", marginBottom: "10px" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      );
    }

    if ((key === "street_view_url" || key === "street_view_image") && typeof value === "string") {
      const streetViewEmbedUrl = getStreetViewEmbedUrl(value);
      const imageSrc = normalizeImage(value);

      return (
        <>
          {streetViewEmbedUrl ? (
            <iframe
              src={streetViewEmbedUrl}
              title={`Street view for ${displayName}`}
              width="100%"
              height="300"
              style={{ border: 0, borderRadius: "10px", marginBottom: "10px" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : imageSrc ? (
            <img
              src={imageSrc}
              alt={`Street view for ${displayName}`}
              className="instance-image"
              style={{
                width: "100%",
                borderRadius: "10px",
                marginBottom: "10px"
              }}
            />
          ) : null}
        </>
      );
    }

    return String(value);
  }

  return (
    <div className="container-fluid mt-4">
      <h1 className="instance-title">
        {displayName}
      </h1>

      <div className="masonry">

        {attributes.map(([key, value], i) => {

          const label = labelOverrides[key] || key
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());

          return (
            <div className="masonry-item" key={i}>
              <InstanceCard>

                <div className="card-body">

                  <h5 className="attribute-key">{label}</h5>

                  {/* Show image inside the Project Name card */}
                  {(key === "project_name" ||key === "stop_name" || key === "zip_code") && getImage && getImage(item) && (
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
                    {renderAttributeValue(key, value)}
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