import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ModelCard from "./ModelCard";
import DataBadge from "./DataBadge";

// Inject radius=500 into Google Static Street View URLs that are missing a radius,
// so images resolve for locations where an exact-point panorama doesn't exist.
function withStreetViewRadius(url, fallbackRadius = "500") {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/maps/api/streetview")) return url;

  try {
    const parsed = new URL(url.trim());
    if (!parsed.searchParams.get("radius")) {
      parsed.searchParams.set("radius", fallbackRadius);
    }
    return parsed.toString();
  } catch (e) {
    return url;
  }
}

// Helper function to normalize image URLs/base64 data
function normalizeImage(item) {
  const candidate = item.street_view_url || item.street_view_image || null;

  if (!candidate) return null;

  if (
    candidate.startsWith("http://") ||
    candidate.startsWith("https://") ||
    candidate.startsWith("data:image")
  ) {
    return withStreetViewRadius(candidate);
  }

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
    attributes: attributes.map((attr) => ({
      title: attr.title,
      value: item[attr.key],
    })),
    last_synced_at: item.last_synced_at,
    frequency: item.frequency,
  };
}

const LOCAL_API_BASE = "http://localhost:8000";
const PROD_API_BASE = "https://api.civichousing.me";
const isLocalFrontend =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (isLocalFrontend ? LOCAL_API_BASE : PROD_API_BASE);

function bucketsEqual(a, b, f) {
  if (!a || !b) return false;
  if (f.parameter) return a.value === b.value;
  return a.min === b.min && a.max === b.max;
}

function isAllBucket(bucket, f) {
  if (!bucket) return true;
  if (f.parameter) return bucket.value === null;
  return bucket.min === null && bucket.max === null;
}

function filterSelectionsEqual(draft, applied, filterOptions) {
  for (const opt of filterOptions) {
    const key = opt.parameter || opt.min_parameter;
    if (!bucketsEqual(draft[key], applied[key], opt)) return false;
  }
  return true;
}

function buildActiveFilterLines(applied, filterOptions) {
  const lines = [];
  for (const f of filterOptions) {
    const key = f.parameter || f.min_parameter;
    const bucket = applied[key];
    if (!bucket || isAllBucket(bucket, f)) continue;
    lines.push(`${f.label}: ${bucket.label}`);
  }
  return lines;
}

function findLastSyncedAt(rawItems) {
  for (const item of rawItems || []) {
    const candidate = item?.data
      ? item.data.last_synced_at
      : item?.last_synced_at;
    if (candidate) return candidate;
  }
  return null;
}

function appendFiltersToParams(params, filterOptions, filterValues) {
  for (const f of filterOptions) {
    const filterKey = f.parameter || f.min_parameter;
    const bucket = filterValues[filterKey];
    if (!bucket) continue;

    if (f.parameter) {
      if (bucket.value !== null) params.append(f.parameter, bucket.value);
    } else {
      if (bucket.min !== null) params.append(f.min_parameter, bucket.min);
      if (bucket.max !== null) params.append(f.max_parameter, bucket.max);
    }
  }
}

function buildStatsParams(filterOptions, filterValues, activeSearch) {
  const params = new URLSearchParams();
  const q = activeSearch.trim();
  if (q) params.set("q", q);
  appendFiltersToParams(params, filterOptions, filterValues);
  return params;
}

function formatInt(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString();
}

function formatFixed(n, digits = 1) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function ModelPage({
  title,
  apiEndpoint,
  modelName,
  attributes,
  query,
  sortOptions = [],
  filterOptions = [],
  defaultSort = "",
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(location.search);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const urlSort = urlParams.get("sort");
  const urlOrder = urlParams.get("order");
  const urlSearch = urlParams.get("q");
  const urlPage = parseInt(urlParams.get("page") || "1");

  const initialFilterValues = {};
  for (const f of filterOptions) {
    const filterKey = f.parameter || f.min_parameter;
    initialFilterValues[filterKey] = f.buckets[0];
  }

  const urlFilterValues = { ...initialFilterValues };
  for (const f of filterOptions) {
    const key = f.parameter || f.min_parameter;

    if (f.parameter) {
      const val = urlParams.get(f.parameter);
      if (val !== null) {
        urlFilterValues[key] =
          f.buckets.find((b) => String(b.value) === val) ||
          initialFilterValues[key];
      }
    } else {
      const min = urlParams.get(f.min_parameter);
      const max = urlParams.get(f.max_parameter);

      urlFilterValues[key] =
        f.buckets.find(
          (b) =>
            String(b.min ?? "") === String(min ?? "") &&
            String(b.max ?? "") === String(max ?? "")
        ) || initialFilterValues[key];
    }
  }
 
  const [filterValues, setFilterValues] = useState(urlFilterValues);
  const [draftFilterValues, setDraftFilterValues] =
    useState(urlFilterValues);
  const [page, setPage] = useState(urlPage);
  let defaultSortField = "";
  let defaultSortOrder = "asc";
  let defaultSortValue = "";
  if (defaultSort) {
    const parts = defaultSort.split("|");
    defaultSortField = parts[0];
    defaultSortOrder = parts[1];
    defaultSortValue = defaultSort;
  }

  const [sort, setSort] = useState(urlSort || defaultSortField);
  const [order, setOrder] = useState(urlOrder || defaultSortOrder);
  const [sortValue, setSortValue] = useState(
    urlSort && urlOrder ? `${urlSort}|${urlOrder}` : defaultSortValue
  );

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(urlSearch || "");
  const [activeSearch, setActiveSearch] = useState(urlSearch || "");

  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [summary, setSummary] = useState(null);

  const attributesRef = useRef(attributes);
  const filterOptionsRef = useRef(filterOptions);

  const PER_PAGE = 50;

  useEffect(() => {
    const params = new URLSearchParams();

    if (page > 1) params.set("page", page);
    if (sort) params.set("sort", sort);
    if (order) params.set("order", order);
    if (activeSearch) params.set("q", activeSearch);

    for (const f of filterOptionsRef.current) {
      const key = f.parameter || f.min_parameter;
      const bucket = filterValues[key];
      if (!bucket) continue;

      if (f.parameter) {
        if (bucket.value !== null) params.set(f.parameter, bucket.value);
      } else {
        if (bucket.min !== null) params.set(f.min_parameter, bucket.min);
        if (bucket.max !== null) params.set(f.max_parameter, bucket.max);
      }
    }

    const newSearch = params.toString();
    const currentSearch = location.search.replace(/^\?/, "");

    if (newSearch !== currentSearch) {
      navigate(`?${newSearch}`, { replace: true });
    }
  }, [page, sort, order, filterValues, activeSearch, navigate, location.search]);

  useEffect(() => {
    fetch(`${API_BASE}/api/data-as-of`)
      .then((res) => res.json())
      .then((data) => {
        setLastSyncedAt(data?.last_synced_at || null);
      })
      .catch(() => {
        setLastSyncedAt(null);
      });
  }, [apiEndpoint]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setSummary(null);

    const params = new URLSearchParams({
      page: 1,
      per_page: PER_PAGE,
    });

    if (sort) params.append("sort", sort);
    if (order) params.append("order", order);

    appendFiltersToParams(params, filterOptionsRef.current, filterValues);

    const isSearching = activeSearch.trim();
    if (isSearching) {
      params.set("q", activeSearch.trim());
    }

    const url = isSearching
      ? `${API_BASE}/api/search/${modelName}?${params.toString()}`
      : `${API_BASE}${apiEndpoint}?${params}`;

    const statsParams = buildStatsParams(
      filterOptionsRef.current,
      filterValues,
      activeSearch
    );
    const statsUrl = `${API_BASE}${apiEndpoint}/stats?${statsParams.toString()}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const raw = data.results || data.data || [];
        const formatted = raw
          .map((item) => {
            const actual = item.data ? item.data : item;
            if (!actual) return null;

            return {
              ...formatItem(actual, attributesRef.current),
              highlight: item.highlight || null,
            };
          })
          .filter(Boolean);

        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
        setItems(formatted);
        setLastSyncedAt((prev) => prev || findLastSyncedAt(raw));
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(statsUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((s) => setSummary(s))
      .catch(() => setSummary(null));
  }, [apiEndpoint, modelName, sort, order, filterValues, activeSearch]);

  // Handle page changes - fetch new page from server
  useEffect(() => {
    if (page === 1) return;

    window.scrollTo(0, 0);
    setLoading(true);

    const params = new URLSearchParams({
      page: page,
      per_page: PER_PAGE,
    });

    if (sort) params.append("sort", sort);
    if (order) params.append("order", order);

    appendFiltersToParams(params, filterOptionsRef.current, filterValues);

    const isSearching = activeSearch.trim();
    if (isSearching) {
      params.set("q", activeSearch.trim());
    }
    const url = isSearching
      ? `${API_BASE}/api/search/${modelName}?${params}`
      : `${API_BASE}${apiEndpoint}?${params}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const raw = data.results || data.data || [];
        const formatted = raw
          .map((item) => {
            const actual = item.data ? item.data : item;

            if (!actual) return null; // safety

            return {
              ...formatItem(actual, attributesRef.current),
              highlight: item.highlight || null,
            };
          })
          .filter(Boolean);

        setItems(formatted);
        setLastSyncedAt((prev) => prev || findLastSyncedAt(raw));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading page:", err);
        setLoading(false);
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort, order, filterValues, activeSearch]);

  const cards = items.map((item) => (
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4" key={item.id}>
      <ModelCard
        item={item}
        modelName={modelName}
        linkPath={`/${modelName}/${item.id}`}
        query={activeSearch}
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

  const activeFilterLines = buildActiveFilterLines(filterValues, filterOptions);
  const applyDisabled =
    filterOptions.length === 0 ||
    filterSelectionsEqual(draftFilterValues, filterValues, filterOptions);

  return (
    <div className="container mt-4">
      <p className="text-muted small text-center mb-1">
        Showing {start}-{end} of {total}
      </p>

      <h2 className="text-center mb-2">{title}</h2>

      {summary && modelName === "housing" && (
        <p className="text-center mb-3" aria-live="polite">
          <span className="fw-semibold">{formatInt(summary.count)} projects</span>
          {" · "}
          <span>
            {formatInt(summary.total_affordable_units)} total affordable units
          </span>
          {" · "}
          <span>avg walk score {formatFixed(summary.avg_walk_score)}</span>
        </p>
      )}

      {summary && modelName === "community" && (
        <>
          <p className="text-center mb-1" aria-live="polite">
            <span className="fw-semibold">{formatInt(summary.count)} communities</span>
            {" · "}
            <span>
              {formatInt(summary.population_sum)} population in tracked areas
            </span>
            {" · "}
            <span>
              avg transit score {formatFixed(summary.avg_transit_score)}
            </span>
          </p>
          <p className="text-center small text-muted mb-3">
            Affordable-unit figures here are area rollups; use Housing for
            project-level inventory.
          </p>
        </>
      )}

      {summary && modelName === "transportation" && (
        <p className="text-center mb-3" aria-live="polite">
          <span className="fw-semibold">{formatInt(summary.count)} transit stops</span>
          {" · "}
          <span>avg {formatFixed(summary.avg_num_routes)} routes per stop</span>
          {" · "}
          <span>
            avg {formatFixed(summary.avg_travel_time_ut_minutes)} min to UT
          </span>
          {" · "}
          <span>
            avg {formatFixed(summary.avg_travel_time_downtown_minutes)} min to
            downtown
          </span>
        </p>
      )}

      <div className="d-flex justify-content-center mb-3 gap-2">
        <input
          type="text"
          className="form-control"
          style={{ maxWidth: "400px" }}
          placeholder={`Search ${modelName}`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <button
          className="btn btn-primary"
          onClick={() => {
            setActiveSearch(searchQuery);
            setPage(1);
          }}
        >
          Search
        </button>

        {searchQuery && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchQuery("");
              setActiveSearch("");
              setPage(1);
            }}
          >
            Clear
          </button>
        )}
      </div>

      {activeSearch && (
        <p className="text-center mb-2">
          Showing results for "<strong>{activeSearch}</strong>"
        </p>
      )}

      {filterOptions.length > 0 && (
        <>
          {activeFilterLines.length > 0 && (
            <p className="text-center small mb-2">
              <span className="text-muted">Active filters: </span>
              {activeFilterLines.join("; ")}
            </p>
          )}

          <div className="card mb-3 mx-auto" style={{ maxWidth: "760px" }}>
            <div className="card-body py-2">
              <button
                type="button"
                className="btn btn-outline-secondary w-100 d-flex justify-content-between align-items-center"
                onClick={() => setShowFilters((prev) => !prev)}
                aria-expanded={showFilters}
              >
                <span>Filters</span>
                <span className="small">{showFilters ? "Hide" : "Show"}</span>
              </button>

              {showFilters && (
                <div className="pt-3">
                  {filterOptions.map((f) => {
                    const filterKey = f.parameter || f.min_parameter;
                    return (
                      <div key={filterKey} className="mb-3">
                        <div className="fw-semibold small mb-2">{f.label}</div>
                        <div className="row row-cols-1 row-cols-md-2 g-1">
                          {f.buckets.map((b, i) => {
                            const selected = draftFilterValues[filterKey];
                            const checked = bucketsEqual(selected, b, f);
                            const inputId = `filter-${filterKey}-${i}`;
                            return (
                              <div key={inputId} className="col">
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={inputId}
                                    checked={checked}
                                    onChange={() => {
                                      setDraftFilterValues((prev) => ({
                                        ...prev,
                                        [filterKey]: b,
                                      }));
                                    }}
                                  />
                                  <label
                                    className="form-check-label"
                                    htmlFor={inputId}
                                  >
                                    {b.label}
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="btn btn-primary w-100"
                    disabled={applyDisabled}
                    onClick={() => {
                      setFilterValues({ ...draftFilterValues });
                      setPage(1);
                    }}
                  >
                    Apply filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <DataBadge lastSyncedAt={lastSyncedAt} />
        </div>
        <select
          id="select"
          name="select"
          className="form-select"
          style={{ maxWidth: "260px" }}
          value={sortValue}
          onChange={(e) => {
            const value = e.target.value;
            setSortValue(value);

            if (!value) {
              setSort("");
              setOrder("asc");
              setPage(1);
              return;
            }

            const [newSort, newOrder] = value.split("|");
            setSort(newSort);
            setOrder(newOrder);
            setPage(1);
          }}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="row">{cards}</div>

      {/* PAGINATION */}
      <div className="d-flex justify-content-center mt-4 gap-3">
        <button
          className="btn btn-primary"
          disabled={page === 1}
          onClick={() => setPage(1)}
        >
          First
        </button>

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

        <button
          className="btn btn-primary"
          disabled={page === pages}
          onClick={() => setPage(pages)}
        >
          Last
        </button>
      </div>
    </div>
  );
}
