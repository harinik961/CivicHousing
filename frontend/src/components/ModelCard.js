import { Link } from "react-router-dom";

export default function ModelCard({ item, modelName }) {

  // build attribute rows using a for loop
  const attributeRows = [];

  for (let i = 0; i < item.attributes.length; i++) {
    const attr = item.attributes[i];
    const [label, value] = attr.split(":");

    attributeRows.push(
      <div
        key={i}
        className="d-flex justify-content-between border-bottom py-1"
      >
        <span className="text-muted">{label}</span>
        <span className="fw-semibold">{value}</span>
      </div>
    );
  }

  return (
    <div className="card h-100 shadow-sm">

      {/* IMAGE HEADER */}
      <div style={{ height: "300px", overflow: "hidden", padding: "20px" }}>
        <img
          src={item.image}
          alt={item.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      </div>

      {/* ATTRIBUTE SECTION */}
      <div className="card-body">

        <h5 className="mb-3">{item.name}</h5>

        {attributeRows}

        <Link
          to={`/${modelName}/${item.id}`}
          className="btn btn-primary mt-3"
        >
          View
        </Link>

      </div>

    </div>
  );
}
