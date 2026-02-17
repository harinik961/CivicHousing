import ModelCard from "./ModelCard";


// this component is used to display the list of items for each model 
// (Community, Housing, Transportation)
export default function ModelPage({ title, data, modelName }) {
  return (
    <div className="container mt-4">

      <h2 className="text-center mb-4">{title}</h2>

      <div className="row">
        {data.map(item => (
          <div className="col-lg-4 col-md-6 mb-4" key={item.id}>
            <ModelCard item={item} modelName={modelName} />
          </div>
        ))}
      </div>

    </div>
  );
}
