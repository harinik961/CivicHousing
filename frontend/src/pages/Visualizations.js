import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";
const TRANSPORTATION_ENDPOINT = "/api/transportation";
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
            • Built from the Transportation API in the database<br/>
            • Circles are transit stops<br/>
            • Bigger = more local reach (direct + 2-hop neighbors)<br/>
            • Warmer color = 0.6×connectivity + 0.4×frequency<br/>
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
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 4 }}>Visualizations</h1>
      <p style={{ marginTop: 0, color: "#6c7aa4" }}>
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
    </div>
  );
}
