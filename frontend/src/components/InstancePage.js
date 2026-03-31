import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import InstanceCard from "./InstanceCard";
import ModelCard from "./ModelCard";

export default function InstancePage({
  apiEndpoint,
  fields,
  attributeDescriptions,
  getImage,
  relatedModels = [],
  item: itemProp
}) {

  const { id } = useParams();
  const [itemState, setItemState] = useState(null);

  const item = itemProp !== undefined ? itemProp : itemState;

  useEffect(() => {
    if (itemProp !== undefined) return;
    fetch(`https://api.civichousing.me/${apiEndpoint}/${id}`)
      .then(res => res.json())
      .then(res => setItemState(res))
      .catch(err => console.error("Error loading instance:", err));
  }, [id, apiEndpoint, itemProp]);

  if (!item) return <h2>Loading...</h2>;

  const attributes = fields
    .filter(key => item[key] !== undefined)
    .map(key => [key, item[key]]);

  const displayName =
    item.project_name ||
    item.stop_name ||
    item.zip_code ||
    item.name ||
    `Item ${item.id}`;

  const labelOverrides = {
    walk_score: "Walkability Score",
    transit_score: "Transit Score",
    last_synced_at: "Last Updated",
    map_embed_url: "Map View",
    walking_map_embed_url: "Walking Route to Transit",
    walking_distance: "Distance to Transit",
    closest_stop_frequency: "Transit Frequency",
    street_view_url: "Street View",
    street_view_image: "Street View",
    community_total_affordable_units: "Total Affordable Units (in this area)",
    community_housing_count: "Housing Projects (in this area)"
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

  function withStreetViewRadius(value, fallbackRadius = "500") {
    if (!value || typeof value !== "string") return null;

    const trimmed = value.trim();
    if (!trimmed.includes("/maps/api/streetview")) {
      return trimmed;
    }

    try {
      const parsed = new URL(trimmed);
      if (!parsed.searchParams.get("radius")) {
        parsed.searchParams.set("radius", fallbackRadius);
      }
      return parsed.toString();
    } catch (error) {
      return trimmed;
    }
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
      const radius = parsed.searchParams.get("radius") || "500";
      const heading = parsed.searchParams.get("heading") || "210";
      const pitch = parsed.searchParams.get("pitch") || "10";
      const fov = parsed.searchParams.get("fov") || "80";

      if (location && key) {
        const embed = new URL("https://www.google.com/maps/embed/v1/streetview");
        embed.searchParams.set("key", key);
        embed.searchParams.set("location", location);
        embed.searchParams.set("heading", heading);
        embed.searchParams.set("pitch", pitch);
        embed.searchParams.set("fov", fov);

        embed.searchParams.set("radius", radius);

        return embed.toString();
      }

      if (location) {
        return `https://www.google.com/maps?q=&layer=c&cbll=${encodeURIComponent(
          location
        )}`;
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function getStaticStreetViewImageUrl(value) {
    if (!value || typeof value !== "string") return null;

      const trimmed = withStreetViewRadius(value);

    try {
      const parsed = new URL(trimmed);
      const location = parsed.searchParams.get("location");
      const key = parsed.searchParams.get("key");
        const radius = parsed.searchParams.get("radius") || "500";

      if (!location || !key) return trimmed;

      const rebuilt = new URL("https://maps.googleapis.com/maps/api/streetview");
      rebuilt.searchParams.set("size", "600x400");
      rebuilt.searchParams.set("location", location);
      rebuilt.searchParams.set("key", key);

      if (radius) {
        rebuilt.searchParams.set("radius", radius);
      }

      return rebuilt.toString();
    } catch (error) {
      return trimmed;
    }
  }

  function getGoogleMapsLocationUrl() {
    if (item?.latitude != null && item?.longitude != null) {
      return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
    }

    if (item?.address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`;
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

    if ((key === "map_embed_url" || key === "walking_map_embed_url") && typeof value === "string") {
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

    if (
      (key === "street_view_url" || key === "street_view_image") &&
      typeof value === "string"
    ) {

      const cleanValue = value.trim();
      const streetReadyValue = withStreetViewRadius(cleanValue);
      const streetViewEmbedUrl = getStreetViewEmbedUrl(streetReadyValue);
      const imageSrc = streetReadyValue.includes("/maps/api/streetview")
        ? getStaticStreetViewImageUrl(streetReadyValue)
        : normalizeImage(streetReadyValue);
      const mapsLocationUrl = apiEndpoint === "/api/housing" ? getGoogleMapsLocationUrl() : null;

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

          {mapsLocationUrl ? (
            <a
              href={mapsLocationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="maps-link"
            >
              Get Directions
            </a>
          ) : null}
        </>
      );
    }

    return String(value);
  }

  return (
    <div className="container-fluid mt-4">

      <h1 className="instance-title">{displayName}</h1>

      {/* ATTRIBUTE CARDS */}
      <div className="masonry">

        {(attributes|| []).map(([key, value], i) => {

          const label =
            labelOverrides[key] ||
            key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

          return (
            <div className="masonry-item" key={i}>

              <InstanceCard>

                <div className="card-body">

                  <h5 className="attribute-key">{label}</h5>

                  {(key === "project_name" ||
                    key === "stop_name" ||
                    key === "zip_code") &&
                    getImage &&
                    getImage(item) && (
                      <img
                        src={normalizeImage(withStreetViewRadius(getImage(item)))}
                        alt={displayName}
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

                  {attributeDescriptions &&
                    attributeDescriptions[key] && (
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

       {/* RELATED MODELS */}
        {relatedModels.map(relation => {

          if (!item[relation.key] || item[relation.key].length === 0) return null;

          const relatedItem = item[relation.key][0];

          const formatted = {
            id: relatedItem.id,
            name:
              relatedItem.project_name ||
              relatedItem.stop_name ||
              relatedItem.zip_code ||
              relatedItem.name ||
              `Item ${relatedItem.id}`,
            image: normalizeImage(
              relatedItem.street_view_image ||
              relatedItem.street_view_url
            ),
            attributes: relation.attributes.map(attr => ({
              title: attr.title,
              value: relatedItem[attr.key]
            }))
          };

          return (
            <div key={relation.key} className="masonry-item">

              <InstanceCard>

                <div className="card-body">

                  <h5 className="attribute-key text-center mb-3">
                    {relation.title}
                  </h5>

                  <ModelCard
                    item={formatted}
                    modelName={relation.modelName}
                  />

                </div>

              </InstanceCard>

            </div>
          );

        })}
      </div>


    </div>

    
  );
}