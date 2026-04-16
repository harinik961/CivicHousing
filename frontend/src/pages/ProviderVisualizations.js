import { useEffect, useRef } from "react";
import * as d3 from "d3";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as topojson from "topojson-client";

const REGIONS_API_URL = "https://railreach.me/api/regions";
const STATIONS_API_URL = "https://railreach.me/api/stations";
const ROUTES_API_URL = "https://railreach.me/api/routes";
const US_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

async function fetchRegions() {
  let all = [];
  let page = 1;
  let hasMore = true;

  const seenPages = new Set();
  const MAX_PAGES = 50;

  while (hasMore && page <= MAX_PAGES) {
    const res = await fetch(`${REGIONS_API_URL}?page=${page}&pageSize=100`);
    const json = await res.json();
    const data = json.data || [];

    if (data.length === 0) break;

    const signature = JSON.stringify(data.slice(0, 3));
    if (seenPages.has(signature)) break;
    seenPages.add(signature);

    all = all.concat(data);
    page++;
  }

  return all;
}

async function fetchStations() {
  let all = [];
  let page = 1;
  let hasMore = true;

  const seenPages = new Set();
  const MAX_PAGES = 50;

  while (hasMore && page <= MAX_PAGES) {
    const res = await fetch(`${STATIONS_API_URL}?page=${page}&pageSize=100`);
    const json = await res.json();
    const data = json.data || [];

    if (data.length === 0) break;

    const signature = JSON.stringify(data.slice(0, 3));
    if (seenPages.has(signature)) break;
    seenPages.add(signature);

    all = all.concat(data);
    page++;
  }

  return all;
}

async function fetchRoutes() {
  let all = [];
  let page = 1;
  let hasMore = true;

  const seenPages = new Set();
  const MAX_PAGES = 50;

  while (hasMore && page <= MAX_PAGES) {
    const res = await fetch(`${ROUTES_API_URL}?page=${page}&pageSize=100`);
    const json = await res.json();
    const data = json.data || [];

    if (data.length === 0) break;

    const signature = JSON.stringify(data.slice(0, 3));
    if (seenPages.has(signature)) break;
    seenPages.add(signature);

    all = all.concat(data);
    page++;
  }

  return all;
}

function normalizeName(s) {
  return s?.trim();
}

const NAME_TO_ABBR = new Map([
  ["Alabama", "AL"], ["Alaska", "AK"], ["Arizona", "AZ"], ["Arkansas", "AR"],
  ["California", "CA"], ["Colorado", "CO"], ["Connecticut", "CT"], ["Delaware", "DE"],
  ["Florida", "FL"], ["Georgia", "GA"], ["Hawaii", "HI"], ["Idaho", "ID"],
  ["Illinois", "IL"], ["Indiana", "IN"], ["Iowa", "IA"], ["Kansas", "KS"],
  ["Kentucky", "KY"], ["Louisiana", "LA"], ["Maine", "ME"], ["Maryland", "MD"],
  ["Massachusetts", "MA"], ["Michigan", "MI"], ["Minnesota", "MN"], ["Mississippi", "MS"],
  ["Missouri", "MO"], ["Montana", "MT"], ["Nebraska", "NE"], ["Nevada", "NV"],
  ["New Hampshire", "NH"], ["New Jersey", "NJ"], ["New Mexico", "NM"], ["New York", "NY"],
  ["North Carolina", "NC"], ["North Dakota", "ND"], ["Ohio", "OH"], ["Oklahoma", "OK"],
  ["Oregon", "OR"], ["Pennsylvania", "PA"], ["Rhode Island", "RI"], ["South Carolina", "SC"],
  ["South Dakota", "SD"], ["Tennessee", "TN"], ["Texas", "TX"], ["Utah", "UT"],
  ["Vermont", "VT"], ["Virginia", "VA"], ["Washington", "WA"], ["West Virginia", "WV"],
  ["Wisconsin", "WI"], ["Wyoming", "WY"]
]);

export default function ProviderVisualizations() {
  const mapRef = useRef(null);
  const scatterRef = useRef(null);
  const routesRef = useRef(null);

  useEffect(() => {
    let map;
    let svg;
    let g;
    let states;
    let mounted = true;

    async function init() {
      try {

        const [regions, stations, routes, us] = await Promise.all([
          fetchRegions(),
          fetchStations(),
          fetchRoutes(), 
          fetch(US_TOPOJSON_URL).then((r) => r.json()),
        ]);

        if (!mounted || !mapRef.current) return;

        // ================= MAP =================
        const valueMap = new Map(
          regions.map((d) => [
            d.code?.trim().toUpperCase(),
            +d.noVehicleAvailablePercent,
          ])
        );

        const values = [...valueMap.values()].filter(Number.isFinite);

        const color = d3.scaleQuantile()
          .domain(values)
          .range(d3.schemeBlues[9]);

        map = L.map(mapRef.current).setView([37.8, -96], 4);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: "&copy; OpenStreetMap",
        }).addTo(map);

        states = topojson.feature(us, us.objects.states).features;

        L.svg().addTo(map);
        svg = d3.select(map.getPanes().overlayPane).select("svg");
        g = svg.append("g").attr("class", "states-layer");

        function projectPoint(x, y) {
          const point = map.latLngToLayerPoint(new L.LatLng(y, x));
          this.stream.point(point.x, point.y);
        }

        const transform = d3.geoTransform({ point: projectPoint });
        const path = d3.geoPath().projection(transform);

        // Color Scale Legend
        const legend = L.control({ position: "topright" });

        legend.onAdd = function () {
          const div = L.DomUtil.create("div", "info legend");

          const colors = d3.schemeBlues[9];

          div.innerHTML = `
            <div style="
              background: white;
              padding: 10px 12px;
              border-radius: 8px;
              box-shadow: 0 1px 5px rgba(0,0,0,0.2);
              font-size: 12px;
              width: 200px;
            ">
              <div style="font-weight: 600; margin-bottom: 6px;">
                No Vehicle Available (%)
              </div>

              <svg width="180" height="10">
                <defs>
                  <linearGradient id="choropleth-gradient" x1="0%" x2="100%">
                    ${colors
                      .map(
                        (c, i) =>
                          `<stop offset="${
                            (i / (colors.length - 1)) * 100
                          }%" stop-color="${c}" />`
                      )
                      .join("")}
                  </linearGradient>
                </defs>

                <rect width="180" height="10" fill="url(#choropleth-gradient)"></rect>
              </svg>

              <div style="
                display:flex;
                justify-content:space-between;
                font-size:11px;
                margin-top:4px;
              ">
                <span>${d3.min(values).toFixed(1)}%</span>
                <span>${d3.max(values).toFixed(1)}%</span>
              </div>
            </div>
          `;

          return div;
        };

        legend.addTo(map);

        function render() {
          g.selectAll("path")
            .data(states)
            .join("path")
            .attr("d", path)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .attr("opacity", 0.95)
            .attr("fill", (d) => {
              const name = normalizeName(d.properties.name);
              const code = NAME_TO_ABBR.get(name);
              const val = valueMap.get(code);
              return val != null ? color(val) : "#e5e7eb";
            });
        }

        render();
        map.on("zoomend moveend", render);

        // ================= SCATTERPLOT =================
        if (scatterRef.current) {
          const width = 1000;
          const height = 600;
          const marginTop = 25;
          const marginRight = 20;
          const marginBottom = 40;
          const marginLeft = 50;

          const data = stations.map(d => ({
            x: d.routesServedCount,
            y: d.connectedDestinations?.length || 0,
            name: d.name
          })).filter(d => d.x != null && d.y != null);

          const x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.x)).nice()
            .range([marginLeft, width - marginRight]);

          const y = d3.scaleLinear()
            .domain(d3.extent(data, d => d.y)).nice()
            .range([height - marginBottom, marginTop]);

          const svgScatter = d3.select(scatterRef.current)
            .append("svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("width", "100%")
            .attr("height", "600px")
            .style("display", "block");

          svgScatter.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));

          svgScatter.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y));

          // X-axis label
          svgScatter.append("text")
            .attr("x", width / 2)
            .attr("y", height - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Routes Served");

          // Y-axis label
          svgScatter.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Connected Destinations");

          svgScatter.append("g")
            .selectAll("circle")
            .data(data)
            .join("circle")
            .attr("cx", d => x(d.x))
            .attr("cy", d => y(d.y))
            .attr("r", 4)
            .attr("fill", "steelblue");
        }

        // ================= PIE CHART =================
        if (routesRef.current) {
          const width = 400;
          const height = 200;
          const radius = Math.min(width, height) / 2;

          const grouped = d3.rollup(
            routes,
            v => v.length,
            d => d.regionsSpanned?.length || 0
          );

          const data = Array.from(grouped, ([key, value]) => ({
            regions: key,
            name: `${key} Regions`,
            value
          })).sort((a, b) => a.regions - b.regions);

          const color = d3.scaleOrdinal()
            .domain(data.map(d => d.name))
            .range(d3.schemeSpectral[data.length > 10 ? 10 : data.length]);

          const pie = d3.pie()
            .sort(null)
            .value(d => d.value);

          const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius - 10);

          const arcLabel = d3.arc()
            .innerRadius(radius * 0.7)
            .outerRadius(radius * 0.7);

          const svgPie = d3.select(routesRef.current)
            .append("svg")
            .attr("viewBox", [-width / 2, -height / 2, width, height]);

          const arcs = pie(data);

          svgPie.append("g")
            .attr("stroke", "white")
            .selectAll("path")
            .data(arcs)
            .join("path")
            .attr("fill", d => color(d.data.name))
            .attr("d", arc)
            .append("title")
            .text(d => `${d.data.name}: ${d.data.value}`);

          svgPie.append("g")
            .attr("text-anchor", "middle")
            .attr("font-size", "3px")
            .selectAll("text")
            .data(arcs)
            .join("text")
            .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
            .call(text => text.append("tspan")
              .attr("font-weight", "bold")
              .text(d => d.data.name))
            .call(text => text.append("tspan")
              .attr("x", 0)
              .attr("y", "1.2em")
              .attr("fill-opacity", 0.7)
              .text(d => d.data.value));
        }

      } catch (e) {
        console.log(e.message || "Unknown error");
      }
    }

    init();

    return () => {
      mounted = false;
      if (map) map.remove();
    };
  }, []);
  
  return (
    <div style={{ padding: 16 }}>
      <h1>Provider Visualizations</h1>

      {/* ================= MAP ================= */}
      <h2 style={{ marginTop: 40 }}>Regions Choropleth Map</h2>
      <p style={{ color: "#666" }}>
        Choropleth Map of Regions mapped with No Vehicle Availability (%)
      </p>

      <div style={{ width: "100%", overflow: "hidden" }}>
        <div ref={mapRef} style={{ height: "750px" }} />
      </div>

      {/* ================= SCATTER ================= */}
      <h2 style={{ marginTop: 40 }}>Stations Scatterplot</h2>
      <p style={{ color: "#666" }}>
        Scatter Plot of Stations of Routes Served (x) vs. Connected Destinations (y)
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          padding: "0 8px",
          marginBottom: 40
        }}
      >
        <div
          ref={scatterRef}
          style={{
            width: "100%",
            maxWidth: "1200px",
            display: "block",
          }}
        />
      </div>

      {/* ================= PIE ================= */}
      <h2 style={{ marginTop: 40 }}>Routes Pie Chart</h2>
      <p style={{ color: "#666" }}>
        Distribution of Routes by Number of Regions Spanned
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          padding: "0 8px",
          marginBottom: 20
        }}
      >
        <div
          ref={routesRef}
          style={{
            width: "100%",
            maxWidth: "1500px",
            minWidth: "800px",
            // minHeight: "1000px",
            display: "block"
          }}
        />
      </div>
    </div>
  );
}