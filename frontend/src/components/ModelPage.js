import { useEffect, useState } from "react";
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

export default function ModelPage({ title, apiEndpoint, modelName, attributes, query}) {

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [housingStatsByZip, setHousingStatsByZip] = useState(null);

  const PER_PAGE = 50;
  const isCommunity = apiEndpoint === "/api/community";

  // Fetch data only when apiEndpoint or attributes change
  useEffect(() => {

    setLoading(true);
    setPage(1);
    setHousingStatsByZip(null);

    if (isCommunity) {
      Promise.all([
        fetch(`${API_BASE}${apiEndpoint}?page=1&per_page=${PER_PAGE}`).then(r => r.json()),
        fetchAllHousingPages()
      ])
        .then(([data, housingList]) => {
          const zipMap = buildHousingStatsByZip(housingList);
          setHousingStatsByZip(zipMap);
          const raw = data.data || [];
          const defaults = { community_total_affordable_units: 0, community_housing_count: 0 };
          const merged = raw.map(c => ({ ...c, ...defaults, ...(zipMap[c.zip_code] || {}) }));
          const formatted = merged.map(item => formatItem(item, attributes));
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
      fetch(`${API_BASE}${apiEndpoint}?page=1&per_page=${PER_PAGE}`)
        .then(res => res.json())
        .then(data => {
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
    }

  }, [apiEndpoint, attributes, isCommunity]);

  // Handle page changes - fetch new page from server
  useEffect(() => {

    if (page === 1) return;

    window.scrollTo(0, 0);
    setLoading(true);

    const mergeAndFormat = (raw) => {
      if (isCommunity && housingStatsByZip) {
        const defaults = { community_total_affordable_units: 0, community_housing_count: 0 };
        const merged = raw.map(c => ({ ...c, ...defaults, ...(housingStatsByZip[c.zip_code] || {}) }));
        return merged.map(item => formatItem(item, attributes));
      }
      return raw.map(item => formatItem(item, attributes));
    };

    fetch(`${API_BASE}${apiEndpoint}?page=${page}&per_page=${PER_PAGE}`)
      .then(res => res.json())
      .then(data => {
        const raw = data.data || [];
        const formatted = mergeAndFormat(raw);
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
