import { useEffect, useState } from "react";
import ModelCard from "./ModelCard";

export default function ModelPage({ title, apiEndpoint, modelName, attributes }) {

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const PER_PAGE = 50;

  useEffect(() => {

    setLoading(true);

    fetch(`https://api.civichousing.me/${apiEndpoint}`)
      .then(res => res.json())
      .then(data => {

        const raw = data.data || [];

        const formatted = raw.map(item => ({
          id: item.id,

          name:
            item.project_name ||
            item.stop_name ||
            item.zip_code ||
            item.name ||
            `Item ${item.id}`,

          image: item.street_view_url || item.street_view_image || null,

          attributes: attributes.map(attr => ({
            title: attr.title,
            value: item[attr.key]
          }))
        }));

        setItems(formatted);
        setTotal(data.total || raw.length);
        setPages(data.pages || 1);

        setLoading(false);

      })
      .catch(err => {
        console.error("Error loading model data:", err);
        setLoading(false);
      });

  }, [apiEndpoint, attributes, page]);



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
        <p>Loading data...</p>
      </div>
    );
  }



  const start = (page - 1) * PER_PAGE + 1;
  const end = Math.min(page * PER_PAGE, total);



  return (
    <div className="container mt-4">

      {/* SHOWING COUNT */}
      <p className="text-muted small text-center mb-1">
        Showing {start}-{end} of {total}
      </p>

      <h2 className="text-center mb-4">{title}</h2>



      <div className="row">
        {cards}
      </div>



      {/* PAGINATION */}
      <div className="d-flex justify-content-center mt-4 gap-3">

        <button
          className="btn btn-primary"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>

        <span className="align-self-center">
          Page {page} of {pages}
        </span>

        <button
          className="btn btn-primary"
          disabled={page === pages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>

      </div>

    </div>
  );
}