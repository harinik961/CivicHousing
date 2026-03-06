import { useEffect, useState } from "react";
import ModelCard from "./ModelCard";

export default function ModelPage({ title, apiEndpoint, modelName, data }) {

  const [items, setItems] = useState(data || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (!apiEndpoint) return;

    fetch(`http://localhost:5000${apiEndpoint}`)
      .then(res => res.json())
      .then(res => {

        const raw = res.data || res;

        const formatted = raw.map(h => ({
          id: h.id,
          name: h.project_name || "Housing Project",
          image: h.street_view_image,
          attributes: [
            { title: "Address", value: h.address },
            { title: "Zip Code", value: h.zip_code },
            { title: "Affordable Units", value: h.total_affordable_units },
            {title : "Unit Type", value: h.unit_type},
            {title : "Housing Tenure", value: h.housing_tenure},
            {title : "Income Restriction Level", value: h.income_restriction_level},
            {title: "Total Affordable Units", value: h.total_affordable_units},
          ]
        }));

        setItems(formatted);
        setLoading(false);

      });

  }, [apiEndpoint]);

  const cards = items.map(item => (
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4" key={item.id}>
      <ModelCard
        item={item}
        modelName={modelName}
        linkPath={`/${modelName}/${item.id}`}
      />
    </div>
  ));

if (loading) {
  return (
    <div className="container mt-4 text-center">
      <h2>{title}</h2>
      <p>Loading housing data...</p>
    </div>
  );

}  return (
    <div className="container mt-4">

      <p className="text-muted small text-center mb-1">
        {items.length} instances
      </p>

      <h2 className="text-center mb-4">{title}</h2>

      <div className="row">
        {cards}
      </div>

    </div>
  );
}