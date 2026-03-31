import { useEffect, useState, useCallback } from "react";
import ModelCard from "../components/ModelCard";
import { MODEL_ATTRIBUTES } from "../config/modelAttributes";

const API_BASE = "https://api.civichousing.me";
const PER_PAGE = 12;

function normalizeImage(item) {
  const candidate = item.street_view_url || item.street_view_image || item.image || null;
  if (!candidate) return null;

  if (
    candidate.startsWith("http://") ||
    candidate.startsWith("https://") ||
    candidate.startsWith("data:image")
  ) {
    return candidate;
  }
  return `data:image/jpeg;base64,${candidate}`;
}

function formatItem(item) {
  const attrs = (MODEL_ATTRIBUTES[item.type] || []).map((attr) => ({
    title: attr.title,
    value: item[attr.key] ?? "",
  }));

  return {
    id: item.id,
    name: item.name || item.project_name || item.stop_name || `Item ${item.id}`,
    image: normalizeImage(item),
    attributes: attrs,
    type: item.type,
  };
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const fetchResults = useCallback(async () => {
    if (!searchTerm) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/search?q=${encodeURIComponent(searchTerm)}&page=${page}&per_page=${PER_PAGE}`
      );
      const data = await res.json();

      const formatted = (data.data || []).map(formatItem);
      setItems(formatted);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      console.error("Error fetching global search results:", err);
      setItems([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchTerm(query.trim());
  };

  const cards = items.map((item) => (
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4" key={`${item.type}-${item.id}`}>
      <ModelCard item={item} modelName={item.type} />
    </div>
  ));

  const start = (page - 1) * PER_PAGE + 1;
  const end = Math.min(page * PER_PAGE, total);

  return (
    <div className="container mt-4">
      {/* Search Bar */}
      <form className="d-flex mb-4 justify-content-center" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          className="form-control"
          placeholder="Search for housing, communities, or transportation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: "500px" }}
        />
        <button type="submit" className="btn btn-primary ms-2">
          Search
        </button>
      </form>

      {loading && (
        <div className="text-center">
          <p>Loading results...</p>
        </div>
      )}

      {!loading && searchTerm && (
        <>
          <p className="text-muted small text-center mb-1">
            Showing {start}-{end} of {total} results
          </p>

          <h2 className="text-center mb-4">Search Results for "{searchTerm}"</h2>

          <div className="row">{cards}</div>

          {/* Pagination */}
          <div className="d-flex justify-content-center mt-4 gap-3">
            <button className="btn btn-primary" disabled={page === 1} onClick={() => setPage(1)}>
              First
            </button>
            <button className="btn btn-primary" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span className="align-self-center">
              Page {page} of {pages}
            </span>
            <button className="btn btn-primary" disabled={page === pages} onClick={() => setPage(page + 1)}>
              Next
            </button>
            <button className="btn btn-primary" disabled={page === pages} onClick={() => setPage(pages)}>
              Last
            </button>
          </div>
        </>
      )}
    </div>
  );
}