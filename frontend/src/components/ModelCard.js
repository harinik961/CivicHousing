import { Link } from "react-router-dom";

function FrequencyBadge({frequency}) {
  let minutes = null;
  if (frequency && frequency.startsWith("Every")) {
    minutes = parseInt(frequency.replace("Every ", ""));
  }

  if (minutes === null)
    return null;
  const isHighFreq = minutes <= 15;
  const color = isHighFreq ? "green": "orange";

  return (
    <span style={{ color, fontWeight:600, fontSize: "0.8rem"}}>
      {isHighFreq ? "⚡️ High Frequency":"🐢 Low Frequency"}
    </span>
  )
}


export default function ModelCard({ item, modelName, query }) {
  return (
    <div className="card h-100 shadow-sm">

      {/* IMAGE HEADER */}
      <div style={{ height: "300px", overflow: "hidden" , padding: "20px"}}>
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f5f5f5",
              color: "#777"
            }}
          >
            No image
          </div>
        )}
      </div>

      {/* ATTRIBUTE SECTION */}
      <div className="card-body">

        <h5 className="mb-3" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {highlightText(item.name, query)}
          {modelName === "transportation" && <FrequencyBadge frequency={item.frequency} />}
        </h5>

        {item.attributes.map((attr, index) => (
          <div
            key={index}
            className="border-bottom py-2"
            style={{
              display: "grid",
              gridTemplateColumns: "130px 1fr",
              columnGap: "16px",
              alignItems: "start"
            }}
          >
            <span className="text-muted">{attr.title}</span>
            <span
              className="fw-semibold"
              style={{
                textAlign: "right",
                wordBreak: "break-word"
              }}
            >
              <span>
                {highlightText(String(attr.value), query)}
              </span>
            </span>
          </div>
        ))}

       <Link to={`/${modelName}/${item.id}`} className="btn btn-primary mt-3">
        View
      </Link>

      </div>

    </div>

    
  );

  function highlightText(text, query) {
    if (!text || !query) 
      return text;
    const trimmed = query.trim();
    if (!trimmed) 
      return text;

    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const terms = trimmed.split(/\s+/).map(escape);
    const pattern = [escape(trimmed), ...terms].join("|");
    const regex = new RegExp(`(${pattern})`, "gi");

    const result = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = regex.lastIndex;

      if (start > lastIndex) {
        result.push(text.slice(lastIndex, start));
      }
      result.push(
        <mark key={start} style={{ display: "inline", padding: 0, margin: 0 }}>
          {text.slice(start, end)}
        </mark>
      );
      lastIndex = end;
    }

    if (lastIndex < text.length)
      result.push(text.slice(lastIndex));

    return result;
  }
}