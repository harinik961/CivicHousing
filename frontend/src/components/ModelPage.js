import { useEffect, useState } from "react";
import ModelCard from "./ModelCard";

// Helper function to normalize image URLs/base64 data
function normalizeImage(item) {
  const candidate = item.street_view_url || item.street_view_image || null;

  if (!candidate) return null;

  if (
    candidate.startsWith("http://") ||
    candidate.startsWith("https://") ||
    candidate.startsWith("data:image")
  ) {
    return candidate;
  }

  // Backend sometimes returns raw base64 without a data URI prefix
  return `data:image/jpeg;base64,${candidate}`;
}

// Helper function to format items
function formatItem(item, attributes) {
  return {
    id: item.id,
    name:
      item.project_name ||
      item.stop_name ||
      item.zip_code ||
      item.name ||
      `Item ${item.id}`,
    image: normalizeImage(item),
    attributes: attributes.map(attr => ({
      title: attr.title,
      value: item[attr.key]
    }))
  };
}

export default function ModelPage({ title, apiEndpoint, modelName, attributes }) {

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const PER_PAGE = 50;

  // Fetch data only when apiEndpoint or attributes change
  useEffect(() => {

    setLoading(true);
    setPage(1); // Reset to page 1 on new data source

    fetch(`https://api.civichousing.me/${apiEndpoint}?page=1&per_page=${PER_PAGE}`)
      .then(res => res.json())
      .then(data => {
        // All endpoints now return paginated format: {data: [...], total: X, page: Y, pages: Z}
        const raw = data.data || [];
        const formatted = raw.map(item => formatItem(item, attributes));
        
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
        setItems(formatted);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading model data:", err);
        setLoading(false);
      });

  }, [apiEndpoint, attributes]);

  // Handle page changes - fetch new page from server
  useEffect(() => {

    if (page === 1) return; // Skip initial load (handled by first useEffect)

    // Scroll to top when page changes
    window.scrollTo(0, 0);

    // Fetch new page from server
    setLoading(true);
    fetch(`https://api.civichousing.me/${apiEndpoint}?page=${page}&per_page=${PER_PAGE}`)
      .then(res => res.json())
      .then(data => {
        const raw = data.data || [];
        const formatted = raw.map(item => formatItem(item, attributes));
        setItems(formatted);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading page:", err);
        setLoading(false);
      });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
