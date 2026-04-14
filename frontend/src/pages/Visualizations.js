import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = "https://api.civichousing.me";
const GTFS_BASE = process.env.REACT_APP_GTFS_BASE || `${API_BASE}/api/gtfs`;

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
  const lat = Number(stop.stop_lat);
  const lon = Number(stop.stop_lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    id: stop.stop_id,
    name: stop.stop_name || stop.stop_id,
    lat,
    lon,
    routeSet: new Set(),
    tripSet: new Set(),
    degree: 0,
    routeCount: 0,
    tripCount: 0,
    frequencyNormalized: 0,
    centrality: 0,
    connectivity: 0,
    combinedScore: 0,
  };
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

async function loadGTFSGraph() {
  const [stops, stopTimes, trips] = await Promise.all([
    d3.csv(`${GTFS_BASE}/stops.txt`),
    d3.csv(`${GTFS_BASE}/stop_times.txt`),
    d3.csv(`${GTFS_BASE}/trips.txt`),
    d3.csv(`${GTFS_BASE}/routes.txt`),
  ]);

  const tripToRoute = new Map(trips.map((t) => [t.trip_id, t.route_id]));
  const byTrip = d3.group(stopTimes, (d) => d.trip_id);

  const nodeById = new Map();
  for (const stop of stops) {
    const node = buildNodeFromStop(stop);
    if (node) nodeById.set(node.id, node);
  }

  const adjacency = new Map();
  const edgeMap = new Map();
  const addAdj = (a, b) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a).add(b);
  };

  for (const [tripId, rows] of byTrip.entries()) {
    rows.sort(
      (a, b) => Number(a.stop_sequence || 0) - Number(b.stop_sequence || 0)
    );
    const routeId = tripToRoute.get(tripId);

    for (const row of rows) {
      const node = nodeById.get(row.stop_id);
      if (node && routeId) {
        node.routeSet.add(routeId);
        node.tripSet.add(tripId);
      }
    }

    for (let i = 0; i < rows.length - 1; i++) {
      const a = rows[i].stop_id;
      const b = rows[i + 1].stop_id;
      if (a === b || !nodeById.has(a) || !nodeById.has(b)) continue;

      const k = pairKey(a, b);
      if (!edgeMap.has(k)) {
        edgeMap.set(k, {
          id: k,
          source: a,
          target: b,
          tripCount: 0,
          routeSet: new Set(),
        });
      }
      const e = edgeMap.get(k);
      e.tripCount += 1;
      if (routeId) e.routeSet.add(routeId);

      addAdj(a, b);
      addAdj(b, a);
    }
  }

  const allNodes = [...nodeById.values()];
  for (const n of allNodes) {
    n.degree = (adjacency.get(n.id) || new Set()).size;
    n.routeCount = n.routeSet.size;
    n.tripCount = n.tripSet.size;
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

  // Service frequency proxy from GTFS stop_times/trips: number of distinct trips serving each stop.
  const tripExtent = d3.extent(allNodes, (n) => n.tripCount);
  const tripMin = tripExtent[0] ?? 0;
  const tripMax = tripExtent[1] ?? 0;
  for (const n of allNodes) {
    n.frequencyNormalized =
      tripMax > tripMin ? (n.tripCount - tripMin) / (tripMax - tripMin) : 0;
    n.combinedScore = 0.6 * n.connectivity + 0.4 * n.frequencyNormalized;
  }

  // Local reach metric on full graph (direct + 2-hop), used for node sizing.
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
    arr.sort((a, b) => b.connectivity - a.connectivity);
    for (let i = 0; i < Math.min(PER_CELL_KEEP, arr.length); i++) {
      coverage.add(arr[i].id);
    }
  }

  let keep = new Set([...hubs, ...topByDegree, ...coverage]);
  if (keep.size < MIN_NODES) {
    const ranked = [...allNodes].sort((a, b) => b.connectivity - a.connectivity);
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
      .sort((a, b) => b.connectivity - a.connectivity);
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
        weight: e.tripCount,
        routeCount: e.routeSet.size,
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
      weight: e.tripCount,
      routeCount: e.routeSet.size,
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

  useEffect(() => {
    let mounted = true;
    let map;
    let overlayLayer;
    let styleTag;

    async function init() {
      try {
        const graph = await loadGTFSGraph();
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
            • Circles are transit stops<br/>
            • Bigger = more local reach (direct + 2-hop neighbors)<br/>
            • Warmer color = 0.6×connectivity + 0.4×frequency<br/>
            • Hover: full max reachable area from that stop<br/>
            • Zoomed out: hubs/aggregated links for readability<br/>
            • Zoomed in: all stops and denser links
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
            displayLinks = displayLinks.filter((l) => (l.weight || 0) >= 2);
          }

          const maxLinks = showFullLinks ? 14000 : 5000;
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
              `Routes: ${data.routeCount} · Trips: ${data.tripCount}<br/>` +
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
                weight: e?.tripCount || 1,
                routeCount: e?.routeSet?.size || 0,
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

        const bounds = L.latLngBounds(
          state.nodes.map((n) => [n.lat, n.lon])
        );
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.08));
        }

        drawOverlay();
        map.on("zoomend", drawOverlay);
      } catch (e) {
        if (!mounted) return;
        setError(
          "Failed to load GTFS map data. Ensure /api/gtfs/stops.txt, stop_times.txt, trips.txt, and routes.txt are reachable."
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
        CapMetro GTFS connectivity mapped directly over Austin basemap
      </p>

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
