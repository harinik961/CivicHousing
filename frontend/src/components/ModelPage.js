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

  const [allData, setAllData] = useState(null); // Cache full dataset
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [isPaginated, setIsPaginated] = useState(false);

  const PER_PAGE = 50;

  // Fetch data only when apiEndpoint or attributes change
  useEffect(() => {

    setLoading(true);
    setPage(1); // Reset to page 1 on new data source

    fetch(`https://api.civichousing.me/${apiEndpoint}?page=1&per_page=${PER_PAGE}`)
      .then(res => res.json())
      .then(data => {

        if (Array.isArray(data)) {
          // Old API: returns full array, cache it
          setAllData(data);
          setTotal(data.length);
          setPages(Math.ceil(data.length / PER_PAGE));
          setIsPaginated(false);
          
          // Format and show first page immediately
          const firstPage = data.slice(0, PER_PAGE);
          const formatted = firstPage.map(item => formatItem(item, attributes));
          setItems(formatted);
        } else {
          // New API: server-side pagination
          setAllData(null);
          setTotal(data.total ?? 0);
          setPages(data.pages ?? 1);
          setIsPaginated(true);
          
          // Format and show data from response
          const raw = data.data || [];
          const formatted = raw.map(item => formatItem(item, attributes));
          setItems(formatted);
        }

        setLoading(false);

      })
      .catch(err => {
        console.error("Error loading model data:", err);
        setLoading(false);
      });

  }, [apiEndpoint, attributes]);

  // Handle page changes (client-side slice or server fetch)
  useEffect(() => {

    if (loading) return;
    if (!isPaginated && !allData) return;

    // Scroll to top when page changes
    window.scrollTo(0, 0);

    if (isPaginated) {
      // Server-side pagination: fetch new page
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
    } else if (allData) {
      // Client-side pagination: slice cached data
      const start = (page - 1) * PER_PAGE;
      const end = start + PER_PAGE;
      const raw = allData.slice(start, end);
      const formatted = raw.map(item => formatItem(item, attributes));
      setItems(formatted);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, allData, isPaginated]);

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
