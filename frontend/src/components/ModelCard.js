import { Link } from "react-router-dom";

export default function ModelCard({ item, modelName }) {
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

        <h5 className="mb-3">{item.name}</h5>

        {item.attributes.map((attr, index) => (
          <div
            key={index}
            className="d-flex justify-content-between border-bottom py-1"
          >
            <span className="text-muted">{attr.title}</span>
            <span className="fw-semibold">{attr.value}</span>
          </div>
        ))}

       <Link to={`/${modelName}/${item.id}`} className="btn btn-primary mt-3">
        View
      </Link>

      </div>

    </div>
  );
}
