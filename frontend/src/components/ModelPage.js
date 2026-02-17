import ModelCard from "./ModelCard";

export default function ModelPage({ title, data, modelName }) {

  const cards = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    cards.push(
      //col-lg-4 for large screens, col-md-6 for medium screens, col-sm-12 for small screens
      <div className="col-lg-4 col-md-6 col-sm-12 mb-4" key={item.id}>
        <ModelCard item={item} modelName={modelName} 
          linkPath={`/${modelName}/${item.id}`}
        />

      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="text-center mb-4">{title}</h2>

      <div className="row">
        {cards}
      </div>
    </div>
  );
}
