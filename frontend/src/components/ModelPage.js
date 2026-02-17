import ModelCard from "./ModelCard";

export default function ModelPage({ title, data, modelName }) {

  const cards = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    cards.push(
      <div className="col-lg-4 col-md-6 col-sm-12 mb-4" key={item.id}>
        <ModelCard
          item={item}
          modelName={modelName}
          linkPath={`/${modelName}/${item.id}`}
        />
      </div>
    );
  }

  return (
    <div className="container mt-4">

      {/* instance count */}
      <p className="text-muted small text-center mb-1">
        {data.length} instances
      </p>

      {/* title */}
      <h2 className="text-center mb-4">{title}</h2>

      <div className="row">
        {cards}
      </div>

    </div>
  );
}
