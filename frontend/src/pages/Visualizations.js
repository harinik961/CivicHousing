import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://api.civichousing.me");
const TRANSPORTATION_ENDPOINT = "/api/transportation";
const COMMUNITY_ENDPOINT = "/api/community";
const PAGE_FETCH_CONCURRENCY = 6;
const TRANSPORTATION_PAGE_SIZE = 500;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_ROUTE_EDGE_DISTANCE_KM = 1.75;
const MAX_NEIGHBORS_PER_ROUTE = 4;

const MIN_ROUTES = 2;
const TOP_DEGREE_PCT = 0.25;
const GRID_ROWS = 14;
const GRID_COLS = 14;
const PER_CELL_KEEP = 1;
const MIN_NODES = 220;
const MAX_NODES = 360;
const LABEL_COUNT = 18;
const ZOOM_ALL_STOPS = 11;
const ZOOM_FULL_LINKS = 13;
const ZOOM_LABELS = 13;

// Fixed Austin viewport for the non-interactive community choropleth.
const AUSTIN_BOUNDS_LATLNG = [
  [30.1, -97.95],
  [30.52, -97.56],
];
const TEXAS_ZIP_GEOJSON_URL =
  "https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/tx_texas_zip_codes_geo.min.json";

const normalizeZip = (value) => String(value ?? "").trim().padStart(5, "0");

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function buildNodeFromStop(stop) {
  const lat = Number(stop.latitude);
  const lon = Number(stop.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const routes = parseRoutes(stop.routes);
  const frequencyMinutes = parseFrequencyMinutes(stop.frequency);
  return {
    id: String(stop.id ?? stop.stop_id),
    stopId: String(stop.stop_id ?? stop.id),
    name: stop.stop_name || stop.stopId || stop.stop_id,
    lat,
    lon,
    routeSet: routes,
    degree: 0,
    routeCount: routes.size || Number(stop.num_routes) || 0,
    frequency: stop.frequency || "Unknown",
    frequencyMinutes,
    frequencyNormalized: 0,
    centrality: 0,
    connectivity: 0,
    combinedScore: 0,
  };
}

function parseRoutes(routes) {
  if (!routes) return new Set();
  return new Set(
    String(routes)
      .split(/[;,|]/)
      .map((route) => route.trim())
      .filter(Boolean)
  );
}

function parseFrequencyMinutes(frequency) {
  if (!frequency || frequency === "Unknown") return null;
  const match = String(frequency).match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function fetchAllTransportation() {
  const fetchPage = async (page) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(
        `${API_BASE}${TRANSPORTATION_ENDPOINT}?page=${page}&per_page=${TRANSPORTATION_PAGE_SIZE}`,
        { signal: controller.signal }
      );
      if (!res.ok) {
        throw new Error(`transportation page ${page} failed (${res.status})`);
      }
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  const first = await fetchPage(1);
  const all = [...(first.data || first.results || [])];
  const pages = Math.max(1, Number(first.pages || 1));

  if (pages > 1) {
    for (let start = 2; start <= pages; start += PAGE_FETCH_CONCURRENCY) {
      const end = Math.min(pages, start + PAGE_FETCH_CONCURRENCY - 1);
      const pagePromises = [];
      for (let p = start; p <= end; p++) {
        pagePromises.push(fetchPage(p));
      }

      const rest = await Promise.all(pagePromises);
      for (const pageData of rest) {
        all.push(...(pageData.data || pageData.results || []));
      }
    }
  }

  return all;
}

async function fetchAllCommunities() {
  const fetchPage = async (page) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE}${COMMUNITY_ENDPOINT}?page=${page}&per_page=50`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`community page ${page} failed (${res.status})`);
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  const first = await fetchPage(1);
  const all = [...(first.data || first.results || [])];
  const pages = Math.max(1, Number(first.pages || 1));

  if (pages > 1) {
    for (let start = 2; start <= pages; start += PAGE_FETCH_CONCURRENCY) {
      const end = Math.min(pages, start + PAGE_FETCH_CONCURRENCY - 1);
      const jobs = [];
      for (let p = start; p <= end; p++) jobs.push(fetchPage(p));
      const rest = await Promise.all(jobs);
      for (const pageData of rest) all.push(...(pageData.data || pageData.results || []));
    }
  }

  return all;
}

function computeApproxCloseness(nodeIds, adjacency, sampleCount = 28) {
  const shuffled = d3.shuffle([...nodeIds]);
  const samples = shuffled.slice(0, Math.min(sampleCount, shuffled.length));
  const score = new Map(nodeIds.map((id) => [id, 0]));

  for (const source of samples) {
    const dist = new Map([[source, 0]]);
    const q = [source];
    let i = 0;

    while (i < q.length) {
      const cur = q[i++];
      const curD = dist.get(cur);
      const neighbors = adjacency.get(cur) || new Set();
      for (const nb of neighbors) {
        if (dist.has(nb)) continue;
        dist.set(nb, curD + 1);
        q.push(nb);
      }
    }

    for (const [id, d] of dist.entries()) {
      if (id === source || d === 0) continue;
      score.set(id, score.get(id) + 1 / d);
    }
  }

  const maxVal = d3.max([...score.values()]) || 1;
  for (const id of score.keys()) score.set(id, score.get(id) / maxVal);
  return score;
}

function geoCellKey(node, latMin, lonMin, latStep, lonStep) {
  const r = Math.max(
    0,
    Math.min(GRID_ROWS - 1, Math.floor((node.lat - latMin) / latStep))
  );
  const c = Math.max(
    0,
    Math.min(GRID_COLS - 1, Math.floor((node.lon - lonMin) / lonStep))
  );
  return `${r},${c}`;
}

async function loadTransportationGraph() {
  const stops = await fetchAllTransportation();

  const nodeById = new Map();
  for (const stop of stops) {
    const node = buildNodeFromStop(stop);
    if (node) nodeById.set(node.id, node);
  }

  const allNodes = [...nodeById.values()];

  // Build route index from the stored routes string.
  const routeIndex = new Map();
  for (const node of allNodes) {
    for (const route of node.routeSet) {
      if (!routeIndex.has(route)) routeIndex.set(route, []);
      routeIndex.get(route).push(node.id);
    }
  }

  const adjacency = new Map();
  const edgeMap = new Map();
  const addAdj = (a, b) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a).add(b);
  };

  const addEdge = (a, b, route, distanceKm) => {
    if (a === b) return;
    const k = pairKey(a, b);
    const source = nodeById.get(a);
    const target = nodeById.get(b);
    if (!source || !target) return;

    if (!edgeMap.has(k)) {
      edgeMap.set(k, {
        id: k,
        source: a,
        target: b,
        sharedRoutes: new Set(),
        weight: 0,
        minDistanceKm: distanceKm,
      });
    }

    const edge = edgeMap.get(k);
    edge.weight += 1;
    edge.sharedRoutes.add(route);
    edge.minDistanceKm = Math.min(edge.minDistanceKm, distanceKm);

    addAdj(a, b);
    addAdj(b, a);
  };

  for (const [route, ids] of routeIndex.entries()) {
    for (const id of ids) {
      const node = nodeById.get(id);
      if (!node) continue;

      const neighbors = ids
        .filter((otherId) => otherId !== id)
        .map((otherId) => {
          const other = nodeById.get(otherId);
          const distanceKm = haversineKm(
            node.lat,
            node.lon,
            other.lat,
            other.lon
          );
          return { otherId, distanceKm };
        })
        .filter(({ distanceKm }) => distanceKm <= MAX_ROUTE_EDGE_DISTANCE_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, MAX_NEIGHBORS_PER_ROUTE);

      for (const { otherId, distanceKm } of neighbors) {
        addEdge(id, otherId, route, distanceKm);
      }
    }
  }

  for (const n of allNodes) {
    n.degree = (adjacency.get(n.id) || new Set()).size;
    n.routeCount = n.routeSet.size || Number(n.routeCount) || 0;
  }

  const closeness = computeApproxCloseness(
    allNodes.map((n) => n.id),
    adjacency,
    30
  );
  for (const n of allNodes) {
    n.centrality = closeness.get(n.id) || 0;
    n.connectivity =
      0.55 * n.centrality +
      0.3 * Math.min(1, n.degree / 12) +
      0.15 * Math.min(1, n.routeCount / 6);
  }

  const freqValues = allNodes
    .map((n) => n.frequencyMinutes)
    .filter((v) => Number.isFinite(v));
  const freqMin = d3.min(freqValues);
  const freqMax = d3.max(freqValues);
  for (const n of allNodes) {
    n.frequencyNormalized =
      Number.isFinite(n.frequencyMinutes) && freqMax > freqMin
        ? 1 - (n.frequencyMinutes - freqMin) / (freqMax - freqMin)
        : 0;
    n.combinedScore = 0.6 * n.connectivity + 0.4 * n.frequencyNormalized;
  }

  for (const n of allNodes) {
    const direct = adjacency.get(n.id) || new Set();
    const second = new Set();
    direct.forEach((nb) => {
      const nbDirect = adjacency.get(nb) || new Set();
      nbDirect.forEach((cand) => {
        if (cand !== n.id && !direct.has(cand)) second.add(cand);
      });
    });
    n.directNeighborCount = direct.size;
    n.secondHopCount = second.size;
    n.localReach = n.routeCount + 0.6 * n.directNeighborCount + 0.35 * n.secondHopCount;
  }

  const topCount = Math.ceil(allNodes.length * TOP_DEGREE_PCT);
  const topByDegree = new Set(
    [...allNodes]
      .sort((a, b) => b.degree - a.degree)
      .slice(0, topCount)
      .map((n) => n.id)
  );
  const hubs = new Set(
    allNodes.filter((n) => n.routeCount >= MIN_ROUTES).map((n) => n.id)
  );

  const latExtent = d3.extent(allNodes, (d) => d.lat);
  const lonExtent = d3.extent(allNodes, (d) => d.lon);
  const latMin = latExtent[0] ?? 0;
  const lonMin = lonExtent[0] ?? 0;
  const latStep = ((latExtent[1] ?? latMin) - latMin) / GRID_ROWS || 1;
  const lonStep = ((lonExtent[1] ?? lonMin) - lonMin) / GRID_COLS || 1;

  const byCell = d3.group(
    allNodes,
    (n) => geoCellKey(n, latMin, lonMin, latStep, lonStep)
  );
  const coverage = new Set();
  for (const [, arr] of byCell.entries()) {
    arr.sort((a, b) => b.combinedScore - a.combinedScore);
    for (let i = 0; i < Math.min(PER_CELL_KEEP, arr.length); i++) {
      coverage.add(arr[i].id);
    }
  }

  let keep = new Set([...hubs, ...topByDegree, ...coverage]);
  if (keep.size < MIN_NODES) {
    const ranked = [...allNodes].sort((a, b) => b.combinedScore - a.combinedScore);
    for (const n of ranked) {
      keep.add(n.id);
      if (keep.size >= MIN_NODES) break;
    }
  }

  if (keep.size > MAX_NODES) {
    const mustKeep = new Set([...coverage, ...hubs]);
    const optional = [...keep]
      .filter((id) => !mustKeep.has(id))
      .map((id) => nodeById.get(id))
      .sort((a, b) => b.combinedScore - a.combinedScore);
    keep = new Set([...mustKeep]);
    for (const n of optional) {
      if (keep.size >= MAX_NODES) break;
      keep.add(n.id);
    }
  }

  const retainedSet = new Set(keep);
  const nodes = [...retainedSet].map((id) => ({ ...nodeById.get(id) }));
  const links = [];
  for (const e of edgeMap.values()) {
    if (retainedSet.has(e.source) && retainedSet.has(e.target)) {
      links.push({
        id: e.id,
        source: e.source,
        target: e.target,
        weight: e.weight,
        routeCount: e.sharedRoutes.size,
        synthetic: false,
      });
    }
  }

  const hiddenNeighbors = new Map();
  for (const id of retainedSet) {
    const hidden = [];
    for (const nb of adjacency.get(id) || []) {
      if (!retainedSet.has(nb)) hidden.push(nb);
    }
    hiddenNeighbors.set(id, hidden);
  }

  return {
    nodes,
    links,
    allNodes: allNodes.map((n) => ({ ...n })),
    allLinks: [...edgeMap.values()].map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      weight: e.weight,
      routeCount: e.sharedRoutes.size,
      synthetic: false,
    })),
    retainedNodeIds: new Set(nodes.map((n) => n.id)),
    full: { nodeById, edgeMap, adjacency },
    hiddenNeighbors,
  };
}

export default function Visualizations() {
  const mapRef = useRef(null);
  const choroplethMapRef = useRef(null);
  const barChartRef = useRef(null);


  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [choroplethError, setChoroplethError] = useState("");
  const [choroplethLoading, setChoroplethLoading] = useState(true);
  const [communityMode, setCommunityMode] = useState("median_housing_price");

  // =========================================================
  // Visualization 1 Hook: CapMetro Connectivity Map
  // =========================================================
  useVisualizationOneMap({ mapRef, setError, setLoading });

  // =========================================================
  // Visualization 2 Hook: Community Choropleth (Voronoi)
  // =========================================================
  useVisualizationTwoCommunityChoropleth({
    mapRef: choroplethMapRef,
    mode: communityMode,
    setError: setChoroplethError,
    setLoading: setChoroplethLoading,
  });

  // =========================================================
  // Visualization 3 Hook Placeholder
  // =========================================================
  // useVisualizationThree(...)
    useVisualizationThreeBarChart({containerRef: barChartRef, setError, setLoading});


  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 4, textAlign: "center" }}>Visualizations</h1>

      {renderVisualizationOne({ mapRef, loading, error })}

      {renderVisualizationTwo({
        mapRef: choroplethMapRef,
        loading: choroplethLoading,
        error: choroplethError,
        mode: communityMode,
        onModeChange: setCommunityMode,
      })}

      {
      <section style={{marginTop: 18}}>
        <h2>Price vs Amenities</h2>
        <div ref={barChartRef}
          style={{
            width: "100%",
            height: 500,
            border: "1px solid #d2d9ef",
            borderRadius: 8
          }}
          />

        <h2 style={{ marginTop: 16 }}>Critiques</h2>

        <div
          style={{
            width: "100%",
            height: 500,
            border: "1px solid #d2d9ef",
            borderRadius: 8,
            padding: 12,
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gridTemplateRows: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {[
            {
              question: "What did we do well?",
              answer:
                "As a group, we were able to communicate very well through Discord whether it be short messages updating each other about what we were working on or full on discussions about certain implementations of the project. Also, since our schedules as students fluctuate from busy weeks to less busy weeks, whenever a member was not able to do as much one week, they always picked up more to work on the next.",
            },
            {
              question: "What did we learn?",
              answer:
                "Through this project we learned a lot about full stack development and skills we can bring into industry level software engineering. We learned a lot about the frontend through technologies such as JavaScript and Node.js, the backend through Flask, databases through PostgreSQL, the CI/CD pipeline, and bringing these all together through hosting our website and database through AWS.",
            },
            {
              question: "What did we teach each other?",
              answer:
                "We were able to bridge gaps in understanding whenever a teammate did not understand something. Learning about all these technologies in a short amount of time is quite hard for just a single person, so luckily we had a group we could discuss and bounce ideas around. Through talking about our misunderstandings we were able to learn all the technologies and apply them to our project efficiently.",
            },
            {
              question: "What can we do better?",
              answer:
                "Overall we did a pretty good job on working together as a team but if we had to pick something it would be having more accurate photos for certain transportation, housing, or community cards since the Google Maps API was not always the best in showing an accurate depiction of each respective card.",
            },
            {
              question: "What effect did the peer reviews have?",
              answer:
                "We think the peer reviews had a generally good effect on us. It for sure kept us on task because we all wanted to work for a good peer review but for each of us as well. We were able to get good feedback as well on our work styles and where we can improve for each other whether it be through our communication or timeliness.",
            },
            {
              question: "What puzzles us?",
              answer:
                "We were really intrigued by the problem of affordable housing in Austin so we built this website in order to combat this inequality. Being able to tackle all this while learning the ins and outs of new technologies really puzzled us but in a good way that kept us motivated.",
            },
          ].map(({ question, answer }) => (
            <div
              key={question}
              style={{
                border: "1px solid #d2d9ef",
                borderRadius: 8,
                background: "#fafcff",
                padding: 10,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#1f2f59",
                  marginBottom: 8,
                }}
              >
                {question}
              </div>
              {answer && (
                <div
                  style={{
                    fontSize: 15.5,
                    lineHeight: 1.45,
                    color: "#2f3d63",
                  }}
                >
                  {answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    }
  </div>
);
}


function renderVisualizationOne({ mapRef, loading, error }) {
  return (
    <section>
      <h2 style={{ marginBottom: 8 }}>CapMetro Connectivity Map</h2>
      <p style={{ marginTop: 0, color: "#6c7aa4", marginBottom: 10 }}>
        CapMetro transportation connectivity mapped directly over Austin basemap
      </p>

      {loading && !error && (
        <div style={{ color: "#394f8f", marginBottom: 10 }}>
          Loading transportation data for the map...
        </div>
      )}

      {error && <div style={{ color: "#b23a3a", marginBottom: 10 }}>{error}</div>}

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: 760,
          border: "1px solid #d2d9ef",
          borderRadius: 8,
          overflow: "hidden",
        }}
      />
    </section>
  );
}

function renderVisualizationTwo({ mapRef, loading, error, mode, onModeChange }) {
  const activeButtonStyle = {
    background: "#253b72",
    color: "#fff",
    border: "1px solid #253b72",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  };
  const buttonStyle = {
    background: "#fff",
    color: "#253b72",
    border: "1px solid #9eb2de",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  };

  return (
    <section style={{ marginTop: 18 }}>
      <h2 style={{ marginBottom: 8 }}>Community Choropleth</h2>
      <p style={{ marginTop: 0, color: "#6c7aa4", marginBottom: 10 }}>
        Austin communities shaded by median housing price or transit score
      </p>

      {loading && !error && (
        <div style={{ color: "#394f8f", marginBottom: 10 }}>
          Loading community choropleth...
        </div>
      )}

      {error && <div style={{ color: "#b23a3a", marginBottom: 10 }}>{error}</div>}

      <div
        style={{
          position: "relative",
          width: "100%",
          height: 620,
          border: "1px solid #d2d9ef",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 1000,
            display: "flex",
            gap: 8,
            background: "rgba(255,255,255,0.88)",
            border: "1px solid #d6dff3",
            borderRadius: 8,
            padding: 8,
            backdropFilter: "blur(1px)",
          }}
        >
          <button
            type="button"
            onClick={() => onModeChange("median_housing_price")}
            style={mode === "median_housing_price" ? activeButtonStyle : buttonStyle}
          >
            Median Housing Price
          </button>
          <button
            type="button"
            onClick={() => onModeChange("transit_score")}
            style={mode === "transit_score" ? activeButtonStyle : buttonStyle}
          >
            Transit Score
          </button>
        </div>

        <div
          ref={mapRef}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    </section>
  );
}

function useVisualizationOneMap({ mapRef, setError, setLoading }) {
  useEffect(() => {
    let mounted = true;
    let map;
    let overlayLayer;
    let styleTag;

    async function init() {
      try {
        setLoading(true);
        const graph = await loadTransportationGraph();
        if (!graph.nodes.length) {
          throw new Error("No transportation records were returned from the API.");
        }
        if (!mounted || !mapRef.current) return;

        styleTag = document.createElement("style");
        styleTag.innerHTML = `
          .viz-legend {
            background: rgba(8, 12, 24, 0.9);
            border: 1px solid #314882;
            border-radius: 8px;
            color: #e6ecff;
            padding: 10px 12px;
            width: 280px;
            font-size: 12px;
            line-height: 1.35;
          }
          .viz-stop-label {
            color: #ffffff;
            font-size: 11px;
            font-weight: 600;
            text-shadow: 0 0 2px #101933, 0 0 4px #101933;
            background: transparent;
            border: 0;
            box-shadow: none;
          }
        `;
        document.head.appendChild(styleTag);

        map = L.map(mapRef.current, {
          preferCanvas: true,
          zoomControl: true,
        }).setView([30.2672, -97.7431], 11);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        const legend = L.control({ position: "topright" });
        legend.onAdd = () => {
          const div = L.DomUtil.create("div", "viz-legend");
          div.innerHTML = `
            <strong>CapMetro Connectivity Map</strong><br/>
            <div style="margin:8px 0 4px 0;">
              <div style="height:12px;border-radius:999px;background:linear-gradient(to right, #2c7bb6, #00a6ca, #00ccbc, #90eb9d, #ffff8c, #f9d057, #f29e2e, #d7191c);border:1px solid rgba(255,255,255,0.14);"></div>
            </div>
            <div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;opacity:0.95;margin-bottom:4px;">
              <span>Colder / worse</span><span>Warmer / better</span>
            </div>
            • Color blends connectivity + frequency<br/>
            • Circles are transit stops<br/>
            • Bigger = more local reach (direct + 2-hop neighbors)<br/>
            • Hover: full max reachable area from that stop<br/>
            • Zoomed out: hubs/aggregated links for readability<br/>
            • Zoomed in: all stops and denser links<br/>
            • Click a stop to expand hidden nearby stops
          `;
          return div;
        };
        legend.addTo(map);

        const state = {
          nodes: [...graph.nodes],
          links: [...graph.links],
          allNodes: [...graph.allNodes],
          allLinks: [...graph.allLinks],
          selectedNodeId: null,
        };

        const drawOverlay = () => {
          if (overlayLayer) overlayLayer.remove();
          overlayLayer = L.layerGroup().addTo(map);

          const zoom = map.getZoom();
          const showAllStops = zoom >= ZOOM_ALL_STOPS;
          const showFullLinks = zoom >= ZOOM_FULL_LINKS;
          const showLabels = zoom >= ZOOM_LABELS;

          const displayNodes = showAllStops ? state.allNodes : state.nodes;
          const nodeIdSet = new Set(displayNodes.map((n) => n.id));

          let displayLinks = (showAllStops ? state.allLinks : state.links).filter(
            (l) => nodeIdSet.has(l.source.id || l.source) && nodeIdSet.has(l.target.id || l.target)
          );

          if (!showFullLinks) {
            displayLinks = displayLinks.filter((l) => (l.weight || 0) >= 1);
          }

          const maxLinks = showFullLinks ? 18000 : 8000;
          if (displayLinks.length > maxLinks) {
            displayLinks = [...displayLinks]
              .sort((a, b) => (b.weight || 0) - (a.weight || 0))
              .slice(0, maxLinks);
          }

          const nodeById = new Map(displayNodes.map((n) => [n.id, n]));
          const markers = new Map();
          const edges = [];
          const reachCache = new Map();

          const reachExtent = d3.extent(displayNodes, (d) => d.localReach || 1);
          const radius = d3
            .scaleSqrt()
            .domain([Math.max(1, reachExtent[0] ?? 1), Math.max(2, reachExtent[1] ?? 2)])
            .range(showAllStops ? [2.4, 9.2] : [4, 13]);
          const color = d3
            .scaleSequential(d3.interpolateTurbo)
            .domain(d3.extent(displayNodes, (d) => d.combinedScore));

          for (const l of displayLinks) {
            const s = l.source.id || l.source;
            const t = l.target.id || l.target;
            const sn = nodeById.get(s);
            const tn = nodeById.get(t);
            if (!sn || !tn) continue;

            const poly = L.polyline(
              [
                [sn.lat, sn.lon],
                [tn.lat, tn.lon],
              ],
              {
                color: "#6f8fd8",
                weight: l.synthetic ? 1.1 : 1.6,
                opacity: 0.16,
              }
            ).addTo(overlayLayer);

            edges.push({ id: l.id, source: s, target: t, poly });
          }

          for (const n of displayNodes) {
            const marker = L.circleMarker([n.lat, n.lon], {
              radius: radius(n.localReach || 1),
              color: "#f5f8ff",
              weight: 1,
              fillColor: color(n.combinedScore),
              fillOpacity: 0.95,
              opacity: 1,
            }).addTo(overlayLayer);
            markers.set(n.id, marker);
          }

          const labeled = showLabels
            ? [...displayNodes]
                .sort((a, b) => b.combinedScore - a.combinedScore)
                .slice(0, Math.min(LABEL_COUNT, state.nodes.length))
            : [];
          for (const n of labeled) {
            const marker = markers.get(n.id);
            if (marker) {
              marker.bindTooltip(n.name, {
                permanent: true,
                direction: "top",
                offset: [0, -6],
                className: "viz-stop-label",
              });
            }
          }

          const resetStyles = () => {
            markers.forEach((m) => m.setStyle({ opacity: 1, fillOpacity: 0.95 }));
            edges.forEach((e) => e.poly.setStyle({ opacity: 0.16 }));
          };

          const applyLocalTwoHopHighlight = (nodeId) => {
            const direct = graph.full.adjacency.get(nodeId) || new Set();
            const second = new Set();

            direct.forEach((nb) => {
              const nbDirect = graph.full.adjacency.get(nb) || new Set();
              nbDirect.forEach((cand) => {
                if (cand !== nodeId && !direct.has(cand)) second.add(cand);
              });
            });

            const focus = new Set([nodeId, ...direct, ...second]);

            markers.forEach((m, nid) => {
              const isSelf = nid === nodeId;
              const isDirect = direct.has(nid);
              const isSecond = second.has(nid);

              let opacity = 0.08;
              let fillOpacity = 0.1;

              if (isSelf) {
                opacity = 1;
                fillOpacity = 1;
              } else if (isDirect) {
                opacity = 0.95;
                fillOpacity = 0.92;
              } else if (isSecond) {
                opacity = 0.7;
                fillOpacity = 0.65;
              }

              m.setStyle({ opacity, fillOpacity });
            });

            edges.forEach((e) => {
              const sIn = focus.has(e.source);
              const tIn = focus.has(e.target);
              const directEdge =
                (e.source === nodeId && direct.has(e.target)) ||
                (e.target === nodeId && direct.has(e.source));
              const twoHopEdge = sIn && tIn;

              e.poly.setStyle({
                opacity: directEdge ? 0.9 : twoHopEdge ? 0.3 : 0.04,
              });
            });
          };

          const computeReachDistances = (startId) => {
            if (reachCache.has(startId)) return reachCache.get(startId);

            const dist = new Map([[startId, 0]]);
            const q = [startId];
            let i = 0;

            while (i < q.length) {
              const cur = q[i++];
              const curD = dist.get(cur);
              const neighbors = graph.full.adjacency.get(cur) || new Set();
              neighbors.forEach((nb) => {
                if (dist.has(nb)) return;
                dist.set(nb, curD + 1);
                q.push(nb);
              });
            }

            reachCache.set(startId, dist);
            return dist;
          };

          const computeNeighborhoodStats = (nodeId) => {
            const direct = graph.full.adjacency.get(nodeId) || new Set();
            const second = new Set();
            direct.forEach((nb) => {
              const nbDirect = graph.full.adjacency.get(nb) || new Set();
              nbDirect.forEach((cand) => {
                if (cand !== nodeId && !direct.has(cand)) second.add(cand);
              });
            });

            const directNodes = [...direct]
              .map((id) => graph.full.nodeById.get(id))
              .filter(Boolean);
            const secondNodes = [...second]
              .map((id) => graph.full.nodeById.get(id))
              .filter(Boolean);

            const avgConnectivity = (arr) =>
              arr.length
                ? d3.mean(arr, (n) => Number(n.connectivity || 0))
                : 0;

            const avgCombined = (arr) =>
              arr.length ? d3.mean(arr, (n) => Number(n.combinedScore || 0)) : 0;

            return {
              directCount: direct.size,
              secondCount: second.size,
              directAvgConnectivity: avgConnectivity(directNodes),
              secondAvgConnectivity: avgConnectivity(secondNodes),
              directAvgCombined: avgCombined(directNodes),
              secondAvgCombined: avgCombined(secondNodes),
            };
          };

          const buildPopupHtml = (data, stats, nodeId) => {
            const reachable = computeReachDistances(nodeId).size;
            return (
              `<strong>${data.name}</strong><br/>` +
              `ID: ${data.id}<br/>` +
              `Type: ${data.transport_type || "Unknown"}<br/>` +
              `Routes: ${data.routeCount} · Frequency: ${data.frequency}<br/>` +
              `1-hop: ${stats.directCount} · 2-hop: ${stats.secondCount}<br/>` +
              `Reachable (full graph): ${reachable}<br/>` +
              `Score: ${data.combinedScore.toFixed(3)}<br/>` +
              `<em>Shift+Click: expand nearby stops</em>`
            );
          };

          const expandNode = (nodeId) => {
            const current = new Set(state.nodes.map((n) => n.id));
            const hidden = graph.hiddenNeighbors.get(nodeId) || [];
            const addIds = hidden.filter((id) => !current.has(id)).slice(0, 12);
            if (!addIds.length) return;

            for (const id of addIds) {
              const n = graph.full.nodeById.get(id);
              if (n) state.nodes.push({ ...n, expanded: true });
            }

            const edgeIds = new Set(
              state.links.map((l) => pairKey(l.source.id || l.source, l.target.id || l.target))
            );
            for (const id of addIds) {
              const k = pairKey(nodeId, id);
              if (edgeIds.has(k)) continue;
              const e = graph.full.edgeMap.get(k);
              state.links.push({
                id: k,
                source: nodeId,
                target: id,
                weight: e?.weight || 1,
                routeCount: e?.sharedRoutes?.size || 0,
                synthetic: !e,
              });
            }

            drawOverlay();
          };

          markers.forEach((marker, id) => {
            const data = nodeById.get(id);
            marker
              .on("mouseover", () => {
                if (state.selectedNodeId) return;

                const reachDist = computeReachDistances(id);
                const maxDepth =
                  d3.max([...reachDist.values()].filter((v) => Number.isFinite(v))) ||
                  1;

                markers.forEach((m, nid) => {
                  const d = reachDist.get(nid);
                  const inReach = d !== undefined;
                  const normalized = inReach ? d / Math.max(1, maxDepth) : 1;

                  const opacity = inReach ? Math.max(0.35, 1 - 0.6 * normalized) : 0.08;
                  const fillOpacity = inReach
                    ? Math.max(0.35, 0.98 - 0.58 * normalized)
                    : 0.08;

                  m.setStyle({
                    opacity,
                    fillOpacity,
                  });
                });

                edges.forEach((e) => {
                  const ds = reachDist.get(e.source);
                  const dt = reachDist.get(e.target);
                  const connected = ds !== undefined && dt !== undefined;
                  let opacity = 0.06;

                  if (connected) {
                    const avgDepth = (ds + dt) / 2;
                    const normalized = avgDepth / Math.max(1, maxDepth);
                    opacity = Math.max(0.2, 0.8 - 0.5 * normalized);
                  }

                  e.poly.setStyle({
                    opacity,
                  });
                });
              })
              .on("mouseout", () => {
                if (state.selectedNodeId) return;
                resetStyles();
              })
              .on("click", (ev) => {
                if (ev.originalEvent) {
                  L.DomEvent.stopPropagation(ev.originalEvent);
                }

                if (ev.originalEvent?.shiftKey) {
                  expandNode(id);
                  return;
                }

                state.selectedNodeId = id;
                const stats = computeNeighborhoodStats(id);
                applyLocalTwoHopHighlight(id);
                marker.setPopupContent(buildPopupHtml(data, stats, id));
                marker.openPopup();
              });

            const initialStats = computeNeighborhoodStats(id);
            marker.bindPopup(buildPopupHtml(data, initialStats, id));
          });

          if (state.selectedNodeId && markers.has(state.selectedNodeId)) {
            applyLocalTwoHopHighlight(state.selectedNodeId);
          }

          map.off("click");
          map.on("click", () => {
            state.selectedNodeId = null;
            resetStyles();
          });
        };

        const bounds = L.latLngBounds(state.allNodes.map((n) => [n.lat, n.lon]));
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.08));
        }

        drawOverlay();
        map.on("zoomend", drawOverlay);
        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        setLoading(false);
        setError(
          `Failed to load map data from /api/transportation. ${e?.message || ""}`
        );
      }
    }

    init();

    return () => {
      mounted = false;
      if (map) map.off("zoomend");
      if (overlayLayer) overlayLayer.remove();
      if (map) map.remove();
      if (styleTag) styleTag.remove();
    };
  }, [mapRef, setError, setLoading]);
}

function useVisualizationTwoCommunityChoropleth({ mapRef, mode, setError, setLoading }) {
  useEffect(() => {
    let mounted = true;
    let map;
    let legend;

    async function init() {
      try {
        setLoading(true);
        setError("");

        const raw = await fetchAllCommunities();
        const communities = raw
          .map((d) => ({
            id: d.id,
            zipCode: d.zip_code,
            county: d.county,
            lat: Number(d.latitude),
            lon: Number(d.longitude),
            medianHousingPrice: Number(d.median_housing_price),
            transitScore: Number(d.transit_score),
          }))
          .filter(
            (d) =>
              Number.isFinite(d.lat) &&
              Number.isFinite(d.lon) &&
              d.lat >= AUSTIN_BOUNDS_LATLNG[0][0] &&
              d.lat <= AUSTIN_BOUNDS_LATLNG[1][0] &&
              d.lon >= AUSTIN_BOUNDS_LATLNG[0][1] &&
              d.lon <= AUSTIN_BOUNDS_LATLNG[1][1]
          );

        if (!mounted || !mapRef.current) return;
        if (!communities.length) {
          throw new Error("No community rows with valid latitude/longitude.");
        }

        map = L.map(mapRef.current, {
          preferCanvas: true,
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          touchZoom: false,
          tap: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          minZoom: 10,
          maxZoom: 12,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        const communityByZip = new Map();
        for (const c of communities) {
          const z = normalizeZip(c.zipCode);
          if (z) communityByZip.set(z, c);
        }

        const getMetric = (d) =>
          mode === "median_housing_price" ? d.medianHousingPrice : d.transitScore;

        const metricValues = communities
          .map(getMetric)
          .filter((v) => Number.isFinite(v));
        const minV = d3.min(metricValues) ?? 0;
        const maxV = d3.max(metricValues) ?? 1;

        const colorScale =
          mode === "median_housing_price"
            ? d3.scaleSequential(d3.interpolateYlOrRd).domain([minV, maxV])
            : d3.scaleSequential(d3.interpolateBlues).domain([minV, maxV]);

        const zipGeoJson = await d3.json(TEXAS_ZIP_GEOJSON_URL);
        const sourceFeatures = zipGeoJson?.features || [];

        const [austinSouth, austinWest] = AUSTIN_BOUNDS_LATLNG[0];
        const [austinNorth, austinEast] = AUSTIN_BOUNDS_LATLNG[1];

        const intersectsAustinBounds = (feature) => {
          const [[minLon, minLat], [maxLon, maxLat]] = d3.geoBounds(feature);
          return !(
            maxLon < austinWest ||
            minLon > austinEast ||
            maxLat < austinSouth ||
            minLat > austinNorth
          );
        };

        const austinZipFeatures = sourceFeatures.filter(intersectsAustinBounds);

        const coloredFeatures = austinZipFeatures
          .filter((f) => {
            const p = f.properties || {};
            const zip = normalizeZip(p.ZCTA5CE10 || p.ZCTA5CE || p.zip_code || p.ZIP);
            return communityByZip.has(zip);
          })
          .map((f) => {
            const p = f.properties || {};
            const zip = normalizeZip(p.ZCTA5CE10 || p.ZCTA5CE || p.zip_code || p.ZIP);
            const c = communityByZip.get(zip);
            return {
              ...f,
              properties: {
                ...(f.properties || {}),
                id: c.id,
                zipCode: c.zipCode,
                county: c.county,
                medianHousingPrice: c.medianHousingPrice,
                transitScore: c.transitScore,
                metricValue: getMetric(c),
              },
            };
          });

        const baseLayer = L.geoJSON(
          { type: "FeatureCollection", features: austinZipFeatures },
          {
            style: {
              color: "#bac6e3",
              weight: 1,
              fillColor: "#edf1fa",
              fillOpacity: 0.55,
            },
          }
        ).addTo(map);

        L.geoJSON(
          { type: "FeatureCollection", features: coloredFeatures },
          {
            style: (feature) => {
              const v = feature?.properties?.metricValue;
              return {
                color: "#eaf0ff",
                weight: 1,
                fillOpacity: 0.75,
                fillColor: Number.isFinite(v) ? colorScale(v) : "#d9deea",
              };
            },
            onEachFeature: (feature, layer) => {
              const p = feature.properties || {};
              const label = mode === "median_housing_price" ? "Median Price" : "Transit Score";
              const valueText =
                mode === "median_housing_price"
                  ? Number.isFinite(p.medianHousingPrice)
                    ? `$${Math.round(p.medianHousingPrice).toLocaleString()}`
                    : "N/A"
                  : Number.isFinite(p.transitScore)
                    ? Number(p.transitScore).toFixed(1)
                    : "N/A";

              layer.bindPopup(
                `<strong>ZIP ${p.zipCode ?? "Unknown"}</strong><br/>` +
                  `County: ${p.county ?? "Unknown"}<br/>` +
                  `${label}: ${valueText}`
              );
            },
          }
        ).addTo(map);

        const layerBounds = baseLayer.getBounds();
        if (layerBounds.isValid()) {
          map.fitBounds(layerBounds.pad(0.03), {
            animate: false,
            paddingTopLeft: [0, 0],
            paddingBottomRight: [120, 0],
          });
        }

        legend = L.control({ position: "topright" });
        legend.onAdd = () => {
          const div = L.DomUtil.create("div", "viz-legend");
          const label = mode === "median_housing_price" ? "Median Housing Price" : "Transit Score";
          const gradient =
            mode === "median_housing_price"
              ? "linear-gradient(to right, #fff7bc, #fec44f, #d95f0e, #7f0000)"
              : "linear-gradient(to right, #eff3ff, #bdd7e7, #6baed6, #08519c)";
          div.innerHTML =
            `<strong>${label}</strong><br/>` +
            `<div style="margin:6px 0 4px 0;">` +
              `<div style="height:12px;border-radius:999px;background:${gradient};border:1px solid rgba(0,0,0,0.15);"></div>` +
            `</div>` +
            `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">` +
              `<span>Colder / lower</span><span>Warmer / higher</span>` +
            `</div>` +
            `Gray = ZIP has no community data<br/>` +
            `Min: ${Number.isFinite(minV) ? Math.round(minV).toLocaleString() : "N/A"}<br/>` +
            `Max: ${Number.isFinite(maxV) ? Math.round(maxV).toLocaleString() : "N/A"}`;
          return div;
        };
        legend.addTo(map);

        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        setLoading(false);
        setError(`Failed to load community choropleth. ${e?.message || ""}`);
      }
    }

    init();

    return () => {
      mounted = false;
      if (legend && map) map.removeControl(legend);
      if (map) map.remove();
    };
  }, [mapRef, mode, setError, setLoading]);
}

function useVisualizationThreeBarChart({ containerRef, setError, setLoading }) {
useEffect(() => {
  let mounted = true;
  async function init() {
    try {
      setLoading(true);
      const raw = await fetchAllCommunities();
        if (!mounted || !containerRef.current)
          return;
       //had to add to see it popup?
       await new Promise(res => setTimeout(res, 50));
       if (!mounted || !containerRef.current)
          return;






        const buckets = {
         "0-100k": { transit: [], health: []},
         "100-200k": { transit: [], health: []},
         "200-300k": { transit: [], health: []},
         "300-400k": { transit: [], health: []},
         "400-500k": { transit: [], health: []},
         "500-600k": { transit: [], health: []},
         "600k+": { transit: [], health: []},
       };




        for (const d of raw) {
          const price   = Number(d.median_housing_price);
          const transit = Number(d.transit_score);
          const health  = Number(d.health_count);




          if (!Number.isFinite(price) || !Number.isFinite(transit) || !Number.isFinite(health)) continue;




          let bucket;
           if(price < 100000)
             bucket = "0-100k";
           else if(price < 200000)
             bucket = "100-200k";
           else if (price < 300000)
             bucket = "200-300k";
           else if (price < 400000)
             bucket = "300-400k";
           else if (price < 500000)
             bucket = "400-500k";
           else if (price < 600000)
             bucket = "500-600k";
           else
             bucket = "600k+";






          buckets[bucket].transit.push(transit);
          buckets[bucket].health.push(health);
        }




        const average = (arr) => {
       if (!arr.length)
         return 0;
        let sum = 0;
        for (const number of arr) sum += number;
        return sum / arr.length;
      };
      const data = [
       { bucket: "0-100k",transit: average(buckets["0-100k"].transit), health: average(buckets["0-100k"].health)   },
       { bucket: "100-200k", transit: average(buckets["100-200k"].transit), health: average(buckets["100-200k"].health) },
       { bucket: "200-300k", transit: average(buckets["200-300k"].transit), health: average(buckets["200-300k"].health) },
       { bucket: "300-400k", transit: average(buckets["300-400k"].transit), health: average(buckets["300-400k"].health) },
       { bucket: "400-500k", transit: average(buckets["400-500k"].transit), health: average(buckets["400-500k"].health) },
       { bucket: "500-600k", transit: average(buckets["500-600k"].transit), health: average(buckets["500-600k"].health) },
       { bucket: "600k+",transit: average(buckets["600k+"].transit), health: average(buckets["600k+"].health)},
     ];




      const width= containerRef.current.clientWidth;
      const height= 500;
      const marginTop= 10;
      const marginRight= 20;
      const marginBottom= 30;
      const marginLeft= 50;




      d3.select(containerRef.current).selectAll("*").remove();




      const svg = d3.select(containerRef.current)
        .append("svg")
        .attr("width", width)
        .attr("height", height);
      const fx = d3.scaleBand()
        .domain(data.map(d => d.bucket))
        .rangeRound([marginLeft, width - marginRight])
        .paddingInner(0.1);
      const x = d3.scaleBand()
        .domain(["transit", "health"])
        .rangeRound([0, fx.bandwidth()])
        .padding(0.05);




      const maxValue = d3.max(data, d => Math.max(d.transit, d.health));
      const y = d3.scaleLinear()
        .domain([0, maxValue]).nice()
        .rangeRound([height - marginBottom, marginTop]);




      const color = d3.scaleOrdinal()
        .domain(["transit", "health"])
        .range(["#4f83ff", "#34c38f"]);
    
      for (const d of data) {
        const groupX = fx(d.bucket);
        svg.append("text")
         .attr("x", groupX + x("transit") + x.bandwidth() / 2)
         .attr("y", y(d.transit) - 4)
         .attr("text-anchor", "middle")
         .style("font-size", "10px")
         .style("fill", "#333")
         .text(Number.isFinite(d.transit) ? d.transit.toFixed(1) : "");




        svg.append("rect")
          .attr("x",      groupX + x("transit"))
          .attr("y",      y(d.transit))
          .attr("width",  x.bandwidth())
          .attr("height", y(0) - y(d.transit))
          .attr("fill",   color("transit"));




        svg.append("rect")
          .attr("x",      groupX + x("health"))
          .attr("y",      y(d.health))
          .attr("width",  x.bandwidth())
          .attr("height", y(0) - y(d.health))
          .attr("fill",   color("health"));
        svg.append("text")
         .attr("x", groupX + x("health") + x.bandwidth() / 2)
         .attr("y", y(d.health) - 4)
         .attr("text-anchor", "middle")
         .style("font-size", "10px")
         .style("fill", "#333")
         .text(Number.isFinite(d.health) ? d.health.toFixed(1) : "");
      }
      // x axis
      svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(fx).tickSizeOuter(0));
      // y axis
      svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).ticks(null, "s"));
    




      const legend = svg.append("g")
        .attr("transform", `translate(${marginLeft + 8}, ${marginTop + 6})`);

      legend
        .append("rect")
        .attr("x", -6)
        .attr("y", -6)
        .attr("width", 130)
        .attr("height", 44)
        .attr("rx", 6)
        .attr("fill", "rgba(255,255,255,0.88)")
        .attr("stroke", "#d2d9ef");




      legend.append("rect").attr("width", 12).attr("height", 12).attr("fill", "#4f83ff");
      legend.append("text").attr("x", 18).attr("y", 10).style("font-size", "12px").text("Transit Score");




      legend.append("rect").attr("y", 20).attr("width", 12).attr("height", 12).attr("fill", "#34c38f");
      legend.append("text").attr("x", 18).attr("y", 30).style("font-size", "12px").text("Health Score");




      setLoading(false);
    }




  
    catch(e){
      if (!mounted) return;
      setError("failed to load bar chart");
    }
  }
    init();
    return()=>{
      mounted = false;
    };
}, [containerRef, setError, setLoading]);
}



