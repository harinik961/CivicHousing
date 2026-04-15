import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as topojson from "topojson-client";

const API_URL = "https://railreach.me/api/regions";
const US_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

async function fetchRegions() {
  let all = [];
  let page = 1;
  let hasMore = true;

  const seenPages = new Set();
  const MAX_PAGES = 50;

  while (hasMore && page <= MAX_PAGES) {
    const res = await fetch(`${API_URL}?page=${page}`);
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

// US State Abbreviations 
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
  // const svgRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let map;
    let svg;
    let g;
    let states;
    let mounted = true;

    async function init() {
      try {
        setLoading(true);

        const [regions, us] = await Promise.all([
          fetchRegions(),
          fetch(US_TOPOJSON_URL).then((r) => r.json()),
        ]);

        if (!mounted || !mapRef.current) return;

        const valueMap = new Map(
          regions.map((d) => [
            d.code?.trim().toUpperCase(),
            +d.noVehicleAvailablePercent,
          ])
        );

        console.log(
          regions.find(d => d.code?.toLowerCase().includes("ny"))
        );
        console.log(regions.slice(0, 10));

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
            })
            .on("mousemove", function (event, d) {
              const name = d.properties.name;
              const code = NAME_TO_ABBR.get(normalizeName(name));
              const val = valueMap.get(code);

              d3.select("body")
                .selectAll(".choropleth-tooltip")
                .data([null])
                .join("div")
                .attr("class", "choropleth-tooltip")
                .style("position", "absolute")
                .style("background", "rgba(0,0,0,0.8)")
                .style("color", "white")
                .style("padding", "6px 8px")
                .style("border-radius", "4px")
                .style("font-size", "12px")
                .style("pointer-events", "none")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY + 10 + "px")
                .html(`${name}<br>${val != null ? val + "%" : "No data"}`);
            })
            .on("mouseleave", () => {
              d3.selectAll(".choropleth-tooltip").remove();
            });
        }

        render();

        map.on("zoomend moveend", render);

        setLoading(false);
      } catch (e) {
        setLoading(false);
        setError(e.message || "Unknown error");
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

      <p style={{ color: "#666" }}>
        Choropleth Map of Regions mapped with No Vehicle Availability (%)
      </p>

      {loading && !error && <div>Loading map...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}

      <div
        ref={mapRef}
        style={{
          height: "750px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      />
    </div>
  );
}