import { useEffect, useState, useRef } from "react";
import ModelCard from "./ModelCard";

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

const API_BASE = "https://api.civichousing.me";

async function fetchAllHousingPages() {
  const all = [];
  let page = 1;
  let pages = 1;
  do {
    const res = await fetch(`${API_BASE}/api/housing?page=${page}&per_page=50`);
    const data = await res.json();
    const list = data.data || [];
    all.push(...list);
    pages = data.pages ?? 1;
    page += 1;
  } while (page <= pages);
  return all;
}

function buildHousingStatsByZip(housingList) {
  const byZip = {};
  for (const h of housingList || []) {
    const zip = h.zip_code ?? "";
    if (!byZip[zip]) {
      byZip[zip] = { community_total_affordable_units: 0, community_housing_count: 0 };
    }
    byZip[zip].community_total_affordable_units += Number(h.total_affordable_units) || 0;
    byZip[zip].community_housing_count += 1;
  }
  return byZip;
}

export default function ModelPage({ title, apiEndpoint, modelName, attributes, query, sortOptions = [], filterOptions = [] }) {

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const initialFilterValues = {};
  for (const f of filterOptions) {
    const filterKey = f.parameter || f.min_parameter;
    initialFilterValues[filterKey] = f.buckets[0];
  }
  const [filterValues, setFilterValues] = useState(initialFilterValues);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [housingStatsByZip, setHousingStatsByZip] = useState(null);

  const [sort, setSort] = useState("");
  const [order, setOrder] = useState("asc");
  const [sortValue, setSortValue] = useState("");

  const attributesRef = useRef(attributes);
  const filterOptionsRef = useRef(filterOptions);

  // Keep refs in sync so the page-change effect always has latest values
  const sortRef = useRef(sort);
  const orderRef = useRef(order);
  const filterValuesRef = useRef(filterValues);
  const housingStatsByZipRef = useRef(housingStatsByZip);
  const isCommunityRef = useRef(apiEndpoint === "/api/community");

  useEffect(() => { sortRef.current = sort; }, [sort]);
  useEffect(() => { orderRef.current = order; }, [order]);
  useEffect(() => { filterValuesRef.current = filterValues; }, [filterValues]);
  useEffect(() => { housingStatsByZipRef.current = housingStatsByZip; }, [housingStatsByZip]);

  const PER_PAGE = 50;
  const isCommunity = apiEndpoint === "/api/community";

  function buildParams(pageNum) {
    const params = new URLSearchParams({
      page: pageNum,
      per_page: PER_PAGE
    });

    if (sortRef.current) params.append("sort", sortRef.current);
    if (orderRef.current) params.append("order", orderRef.current);

    for (const f of filterOptionsRef.current) {
      const filterKey = f.parameter || f.min_parameter;
      const bucket = filterValuesRef.current[filterKey];
      if (!bucket) continue;

      if (f.parameter) {
        if (bucket.value !== null)
          params.append(f.parameter, bucket.value);
      } else {
        if (bucket.min !== null)
          params.append(f.min_parameter, bucket.min);
        if (bucket.max !== null)
          params.append(f.max_parameter, bucket.max);
      }
    }

    return params;
  }

  function mergeAndFormat(raw, zipMap) {
    if (isCommunityRef.current && zipMap) {
      const defaults = { community_total_affordable_units: 0, community_housing_count: 0 };
      const merged = raw.map(c => ({ ...c, ...defaults, ...(zipMap[c.zip_code] || {}) }));
      return merged.map(item => formatItem(item, attributesRef.current));
    }
    return raw.map(item => formatItem(item, attributesRef.current));
  }

  // Fires on sort, filter, or apiEndpoint changes — always resets to page 1
  useEffect(() => {

    setLoading(true);
    setPage(1);
    setHousingStatsByZip(null);

    const params = buildParams(1);

    if (isCommunity) {
      Promise.all([
        fetch(`${API_BASE}${apiEndpoint}?${params}`).then(r => r.json()),
        fetchAllHousingPages()
      ])
        .then(([data, housingList]) => {
          const zipMap = buildHousingStatsByZip(housingList);
          setHousingStatsByZip(zipMap);
          housingStatsByZipRef.current = zipMap;
          const raw = data.data || [];
          const formatted = mergeAndFormat(raw, zipMap);
          setTotal(data.total ?? 0);
          setPages(data.pages ?? 1);
          setItems(formatted);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error loading community/housing data:", err);
          setLoading(false);
        });
    } else {
      fetch(`${API_BASE}${apiEndpoint}?${params}`)
        .then(res => res.json())
        .then(data => {
          const raw = data.data || [];
          const formatted = mergeAndFormat(raw, null);
          setTotal(data.total ?? 0);
          setPages(data.pages ?? 1);
          setItems(formatted);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error loading model data:", err);
          setLoading(false);
        });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiEndpoint, isCommunity, sort, order, filterValues]);

  // Fires ONLY on page changes — reads sort/filter from refs so it's always current
  useEffect(() => {

    if (page === 1) return;

    window.scrollTo(0, 0);
    setLoading(true);

    const params = buildParams(page);

    fetch(`${API_BASE}${apiEndpoint}?${params}`)
      .then(res => res.json())
      .then(data => {
        const raw = data.data || [];
        const formatted = mergeAndFormat(raw, housingStatsByZipRef.current);
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

      <p className="text-muted small text-center mb-1">
        Showing {start}-{end} of {total}
      </p>

      <h2 className="text-center mb-4">{title}</h2>

      {filterOptions.map((f) => (
        (() => {
          const filterKey = f.parameter || f.min_parameter;
          return (
            <select
              key={filterKey}
              id={`filter-${filterKey}`}
              className="form-select mb-2"
              style={{ width: "200px" }}
              onChange={(e) => {
                setFilterValues(prev => ({
                  ...prev,
                  [filterKey]: f.buckets[Number(e.target.value)]
                }));
                setPage(1);
              }}
            >
              {f.buckets.map((b, i) => (
                <option key={i} value={i}>{b.label}</option>
              ))}
            </select>
          );
        })()
      ))}

      <div className="d-flex justify-content-end mb-3">
        <select
          id="select"
          name="select"
          className="form-select"
          style={{ width: "260px" }}
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

      <div className="row">
        {cards}
      </div>

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