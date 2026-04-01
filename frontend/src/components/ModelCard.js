import { Link } from "react-router-dom";

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

        <h5
          className="mb-3"
          dangerouslySetInnerHTML={{
            __html: highlightText(item.name, query)
          }}
        />

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
              <span
               dangerouslySetInnerHTML={{
                  __html: highlightText(String(attr.value), query)
                }}
              />
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
    if (!text || !query) return text;

    const terms = query.trim().split(/\s+/);

    let result = text;

    terms.forEach(term => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "gi");
      result = result.replace(regex, "<mark>$1</mark>");
    });

    return result;
  }
}
