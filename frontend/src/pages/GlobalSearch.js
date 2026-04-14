import { useEffect, useState, useCallback } from "react";
import ModelCard from "../components/ModelCard";
import { MODEL_ATTRIBUTES } from "../config/modelAttributes";

const LOCAL_API_BASE = "http://localhost:5000";
const PROD_API_BASE = "https://api.civichousing.me";
const isLocalFrontend = window.location.hostname === "localhost";
const API_BASE = isLocalFrontend ? LOCAL_API_BASE : PROD_API_BASE;
const PER_PAGE = 12;

function normalizeImage(item) {
  const candidate =
    item.street_view_url || item.street_view_image || item.image || null;

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

function formatItem(result) {
  const type = result.type;
  const item = result.data;
  const attrs = MODEL_ATTRIBUTES[type] || [];

  return {
    id: item.id,
    type,
    name:
      item.project_name ||
      item.stop_name ||
      item.zip_code ||
      `Item ${item.id}`,
    image: normalizeImage(item),
    attributes: attrs.map((attr) => ({
      title: attr.title,
      value: item[attr.key] ?? "",
    })),
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
        `${API_BASE}/api/search?q=${encodeURIComponent(
          searchTerm
        )}&page=${page}&per_page=${PER_PAGE}`
      );
      const data = await res.json();

      const formatted = (data.results || []).map(formatItem);
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
    <div
      className="col-lg-4 col-md-6 col-sm-12 mb-4"
      key={`${item.type}-${item.id}`}
    >
      <ModelCard
        item={item}
        modelName={item.type}
        query={searchTerm}
      />
    </div>
  ));

  const start = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const end = Math.min(page * PER_PAGE, total);

  return (
    <div className="container mt-5 mb-5">
      {/* Title */}
      <h1 className="text-center fw-bold mb-3">Global Search</h1>

      {/* Search Bar */}
      <form
        className="d-flex justify-content-center mb-5"
        onSubmit={handleSearchSubmit}
      >
        <div className="d-flex w-100" style={{ maxWidth: "600px" }}>
          <input
            type="text"
            className="form-control rounded-start-pill px-4 py-2"
            placeholder="Search communities, housing, transportation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <button
            type="submit"
            className="btn btn-primary rounded-end-pill px-4"
          >
            Search
          </button>
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div className="text-center">
          <p className="text-muted">Searching...</p>
        </div>
      )}

      {/* Results */}
      {!loading && searchTerm && (
        <>
          <p className="text-center text-muted mb-3">
            Showing <strong>{start}-{end}</strong> of{" "}
            <strong>{total}</strong> results
          </p>

          <h4 className="text-center mb-4">
            Results for <span className="text-primary">"{searchTerm}"</span>
          </h4>

          {/* Empty state */}
          {items.length === 0 && (
            <div className="text-center mt-5">
              <h5>No results found</h5>
              <p className="text-muted">
                Try a different keyword or check spelling.
              </p>
            </div>
          )}

          {/* Cards */}
          <div className="row g-4">{cards}</div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="d-flex justify-content-center mt-5 gap-2 flex-wrap">
              <button
                className="btn btn-outline-primary"
                disabled={page === 1}
                onClick={() => setPage(1)}
              >
                First
              </button>

              <button
                className="btn btn-outline-primary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>

              <span className="align-self-center px-3">
                Page <strong>{page}</strong> of <strong>{pages}</strong>
              </span>

              <button
                className="btn btn-outline-primary"
                disabled={page === pages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>

              <button
                className="btn btn-outline-primary"
                disabled={page === pages}
                onClick={() => setPage(pages)}
              >
                Last
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}