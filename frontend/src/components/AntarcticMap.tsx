import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { Vessel, Iceberg, Route, Station, EnvironmentalCell, Alert } from "../types";
import { Layers, ShieldAlert, Clock } from "lucide-react";

function parseAlertCoordinates(
  locationStr: string,
  fallback?: { latitude: number; longitude: number }
): [number, number] {
  if (!locationStr) {
    return fallback ? [fallback.latitude, fallback.longitude] : [-63.5, -63.0];
  }
  const dmsRegex = /([0-9.]+)\s*°?\s*([NSns])\s*,\s*([0-9.]+)\s*°?\s*([EWew])/;
  const match = locationStr.match(dmsRegex);
  if (match) {
    const lat = parseFloat(match[1]) * (match[2].toUpperCase() === "S" ? -1 : 1);
    const lon = parseFloat(match[3]) * (match[4].toUpperCase() === "W" ? -1 : 1);
    return [lat, lon];
  }
  const simpleNum = /(-?[0-9.]+)\s*,\s*(-?[0-9.]+)/.exec(locationStr);
  if (simpleNum) {
    return [parseFloat(simpleNum[1]), parseFloat(simpleNum[2])];
  }
  return fallback ? [fallback.latitude, fallback.longitude] : [-63.5, -63.0];
}

interface AntarcticMapProps {
  vessel: Vessel;
  destination: Station;
  icebergs: Iceberg[];
  routes: {
    route_a?: Route;
    route_b?: Route;
    route_c?: Route;
  };
  recalculatedRoute?: any;
  previousRoute?: any;
  envGrid?: EnvironmentalCell[];
  selectedIceberg: Iceberg | null;
  onSelectIceberg: (iceberg: Iceberg | null) => void;
  inspectedAlert?: Alert | null;
  onClearInspectedAlert?: () => void;
  forecastHorizon: "Now" | "+6h" | "+12h" | "+24h" | "+48h";
  onHorizonChange: (horizon: "Now" | "+6h" | "+12h" | "+24h" | "+48h") => void;
  activeLayers: {
    seaIce: boolean;
    icebergs: boolean;
    trajectories: boolean;
    routes: boolean;
    riskZones: boolean;
    stations: boolean;
  };
  onToggleLayer: (layerKey: keyof AntarcticMapProps["activeLayers"]) => void;
  // Voyage Navigation Simulation Props
  voyagePosition?: { latitude: number; longitude: number; heading: number } | null;
  traveledPath?: [number, number][];
  isVoyageActive?: boolean;
  isVoyagePaused?: boolean;
  voyageProgress?: number;
  voyageSpeed?: number;
  onStartVoyage?: () => void;
  onPauseVoyage?: () => void;
  onResetVoyage?: () => void;
  onSetVoyageSpeed?: (speed: number) => void;
}

export const AntarcticMap: React.FC<AntarcticMapProps> = ({
  vessel,
  destination,
  icebergs,
  routes,
  recalculatedRoute,
  previousRoute,
  envGrid = [],
  selectedIceberg,
  onSelectIceberg,
  inspectedAlert,
  onClearInspectedAlert: _onClearInspectedAlert,
  forecastHorizon,
  onHorizonChange,
  activeLayers,
  onToggleLayer,
  voyagePosition = null,
  traveledPath = [],
  isVoyageActive = false,
  isVoyagePaused = false,
  voyageProgress = 0,
  voyageSpeed = 1,
  onStartVoyage,
  onPauseVoyage,
  onResetVoyage,
  onSetVoyageSpeed,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<{ [key: string]: L.LayerGroup }>({});

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Antarctic Peninsula & Drake Passage
    const map = L.map(mapContainerRef.current, {
      center: [-63.5, -63.0],
      zoom: 5.4,
      minZoom: 4,
      maxZoom: 10,
      zoomControl: false,
      attributionControl: false,
    });

    // Ocean Bathymetry tile layer (Esri World Ocean Base - free, no API key required)
    const oceanBasemap = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 13,
        attribution: "Esri, GEBCO, NOAA, CHS, IHO",
      }
    );

    // Dark Ocean canvas fallback tile layer (Esri Dark Gray - free, no API key required)
    const darkBasemap = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 16,
        attribution: "Esri, DeLorme, NAVTEQ",
      }
    );

    // Add primary ocean basemap to map
    oceanBasemap.addTo(map);

    // Add Leaflet layer control for basemaps
    L.control.layers(
      {
        "🌊 World Ocean Bathymetry": oceanBasemap,
        "🌌 Dark Polar Ocean": darkBasemap,
      },
      undefined,
      { position: "topright" }
    ).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    // Create layer groups for clean toggling
    layerGroupsRef.current = {
      seaIce: L.layerGroup().addTo(map),
      riskZones: L.layerGroup().addTo(map),
      trajectories: L.layerGroup().addTo(map),
      routes: L.layerGroup().addTo(map),
      icebergs: L.layerGroup().addTo(map),
      stations: L.layerGroup().addTo(map),
      vessel: L.layerGroup().addTo(map),
      alerts: L.layerGroup().addTo(map),
    };

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update layers when data or horizon changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const {
      seaIce,
      riskZones,
      trajectories,
      routes: routesGroup,
      icebergs: bergsGroup,
      stations: stationsGroup,
      vessel: vesselGroup,
      alerts: alertsGroup,
    } = layerGroupsRef.current;

    // Clear all existing dynamic layers
    seaIce.clearLayers();
    riskZones.clearLayers();
    trajectories.clearLayers();
    routesGroup.clearLayers();
    bergsGroup.clearLayers();
    stationsGroup.clearLayers();
    vesselGroup.clearLayers();
    if (alertsGroup) alertsGroup.clearLayers();

    // 1. RENDER SEA-ICE CONCENTRATION GRID
    if (activeLayers.seaIce && envGrid.length > 0) {
      // Calculate horizon multiplier for sea ice shift
      let horizonMultiplier = 1.0;
      if (forecastHorizon === "+6h") horizonMultiplier = 1.05;
      else if (forecastHorizon === "+12h") horizonMultiplier = 1.12;
      else if (forecastHorizon === "+24h") horizonMultiplier = 1.25;
      else if (forecastHorizon === "+48h") horizonMultiplier = 1.35;

      envGrid.forEach((cell) => {
        const ice = Math.min(100, cell.sea_ice_concentration * horizonMultiplier);
        if (ice < 10) return; // Ignore open water for clarity

        // High contrast polar thermal scale against blue ocean basemap
        let fillColor = "#10b981"; // 10-35% Marginal Ice Zone (Vibrant Mint Teal)
        let strokeColor = "#059669";
        let fillOpacity = 0.45;
        let radius = 22000;

        if (ice >= 70) {
          fillColor = "#ffffff"; // 70-100% Consolidated pack ice (Glacial Frost White)
          strokeColor = "#0284c7"; // Crisp Ocean Blue border outline
          fillOpacity = 0.80;
          radius = 32000;
        } else if (ice >= 40) {
          fillColor = "#a855f7"; // 40-70% Medium Pack Ice (Neon Electric Violet)
          strokeColor = "#7e22ce";
          fillOpacity = 0.65;
          radius = 27000;
        } else if (ice >= 25) {
          fillColor = "#f59e0b"; // 25-40% Loose Pack Ice (Electric Amber Warning)
          strokeColor = "#d97706";
          fillOpacity = 0.55;
          radius = 24000;
        }

        const circle = L.circle([cell.latitude, cell.longitude], {
          radius: radius,
          color: strokeColor,
          weight: 1.8,
          opacity: 0.9,
          fillColor: fillColor,
          fillOpacity: fillOpacity,
        });

        circle.bindTooltip(
          `<div class="text-xs font-mono p-1">
            <span class="font-bold text-cyan-300">Sea-Ice Concentration:</span> ${ice.toFixed(1)}%<br/>
            <span class="text-slate-300">Classification:</span> ${
              ice >= 70 ? "Consolidated Pack Ice" : ice >= 40 ? "Medium Pack Ice" : "Marginal Ice Zone"
            }<br/>
            <span class="text-slate-400">SST:</span> ${cell.sea_surface_temperature}°C<br/>
            <span class="text-slate-400">Horizon:</span> ${forecastHorizon}
          </div>`,
          { className: "bg-slate-900 text-white border border-slate-700 shadow-xl", opacity: 0.95 }
        );

        seaIce.addLayer(circle);
      });
    }

    // 2. RENDER DESTINATION STATION
    if (activeLayers.stations && destination) {
      const stationIcon = L.divIcon({
        className: "custom-station-icon",
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full bg-emerald-950/80 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span class="text-emerald-300 font-bold text-xs">BASE</span>
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 bg-slate-900/90 border border-emerald-500/50 rounded text-[10px] font-semibold text-emerald-300">
              ${destination.name}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const stationMarker = L.marker([destination.latitude, destination.longitude], { icon: stationIcon });
      stationMarker.bindPopup(`
        <div class="p-1 text-sm font-sans">
          <div class="font-bold text-emerald-400 flex items-center gap-1.5 text-base">
            <span>🏁</span> ${destination.name}
          </div>
          <div class="text-xs text-slate-300 mt-1">${destination.description}</div>
          <div class="text-xs text-slate-400 mt-2">
            Position: <span class="font-mono text-slate-200">${Math.abs(destination.latitude).toFixed(2)}°S, ${Math.abs(destination.longitude).toFixed(2)}°W</span>
          </div>
          <div class="mt-2 text-xs font-semibold px-2 py-0.5 bg-emerald-900/40 text-emerald-300 rounded border border-emerald-500/30 inline-block">
            Designated Destination Port
          </div>
        </div>
      `);
      stationsGroup.addLayer(stationMarker);
    }

    // (Vessel rendering handled in dedicated smooth animation useEffect below)

    // 4. RENDER ROUTES (A, B, C & Recalculated)
    if (activeLayers.routes) {
      // Dynamic recalculated route vs previous route
      if (recalculatedRoute && previousRoute) {
        // Render Previous compromised route in dashed red
        if (previousRoute) {
          const prevCoords = routes.route_c?.coordinates || [];
          if (prevCoords.length > 0) {
            const prevPoly = L.polyline(prevCoords, {
              color: "#ef4444",
              weight: 3.5,
              dashArray: "8, 8",
              opacity: 0.85,
            });
            prevPoly.bindTooltip("⚠ PREVIOUS ROUTE (HAZARD COMPROMISED - RISK 78/100)", {
              className: "bg-red-950 text-red-200 border border-red-600 font-mono text-xs",
            });
            routesGroup.addLayer(prevPoly);
          }
        }

        // Render New Recalculated route in bold emerald glow
        if (recalculatedRoute.coordinates) {
          const recPoly = L.polyline(recalculatedRoute.coordinates, {
            color: "#10b981",
            weight: 5.5,
            opacity: 0.95,
          });
          recPoly.bindTooltip("✔ AI EVASION ROUTE (RECALCULATED - RISK 24/100)", {
            className: "bg-emerald-950 text-emerald-200 border border-emerald-500 font-bold font-mono text-xs",
          });
          routesGroup.addLayer(recPoly);
        }
      } else {
        // Standard Routes: Route A (Safest), Route B (Fuel Efficient), Route C (Balanced)
        if (routes.route_a?.coordinates) {
          const polyA = L.polyline(routes.route_a.coordinates, {
            color: "#38bdf8",
            weight: 3.5,
            dashArray: "6, 6",
            opacity: 0.75,
          });
          polyA.bindTooltip(`Route A — Safest (${routes.route_a.total_distance_km} km | Risk ${routes.route_a.navigation_risk_score}/100)`, {
            className: "bg-slate-900 text-sky-300 border border-sky-600 font-mono text-xs",
          });
          routesGroup.addLayer(polyA);
        }

        if (routes.route_b?.coordinates) {
          const polyB = L.polyline(routes.route_b.coordinates, {
            color: "#f59e0b",
            weight: 3.5,
            dashArray: "4, 6",
            opacity: 0.75,
          });
          polyB.bindTooltip(`Route B — Fuel Efficient (${routes.route_b.estimated_fuel_liters.toLocaleString()} L | Risk ${routes.route_b.navigation_risk_score}/100)`, {
            className: "bg-slate-900 text-amber-300 border border-amber-600 font-mono text-xs",
          });
          routesGroup.addLayer(polyB);
        }

        if (routes.route_c?.coordinates) {
          const polyC = L.polyline(routes.route_c.coordinates, {
            color: "#10b981",
            weight: 5.0,
            opacity: 0.95,
          });
          polyC.bindTooltip(`★ Route C — AI Recommended Balanced (${routes.route_c.total_distance_km} km | 0 Conflicts | Risk ${routes.route_c.navigation_risk_score}/100)`, {
            className: "bg-slate-900 text-emerald-300 border border-emerald-500 font-bold font-mono text-xs",
          });
          routesGroup.addLayer(polyC);
        }
      }
    }

    // 5. RENDER ICEBERGS AND PREDICTED TRAJECTORIES
    if (activeLayers.icebergs && icebergs.length > 0) {
      icebergs.forEach((berg) => {
        // Check if forecast horizon shifts iceberg position
        let displayLat = berg.latitude;
        let displayLon = berg.longitude;

        if (forecastHorizon !== "Now" && berg.trajectory) {
          const trajPt = berg.trajectory.find((t) => t.horizon === forecastHorizon);
          if (trajPt) {
            displayLat = trajPt.latitude;
            displayLon = trajPt.longitude;
          }
        }

        // Color & Badge by risk level
        let bergColor = "#38bdf8";
        let pulseClass = "";
        if (berg.risk_level === "Critical") {
          bergColor = "#ef4444";
          pulseClass = "pulse-hazard";
        } else if (berg.risk_level === "High") {
          bergColor = "#f97316";
        } else if (berg.risk_level === "Medium") {
          bergColor = "#eab308";
        }

        const isSelected = Boolean(selectedIceberg && selectedIceberg.id === berg.id);

        // Iceberg SVG Marker Icon
        const bergIcon = L.divIcon({
          className: "custom-iceberg-icon",
          html: `
            <div class="relative flex items-center justify-center cursor-pointer">
              ${isSelected ? `
                <div class="absolute -inset-3.5 rounded-full border-2 border-cyan-400 animate-ping opacity-90 pointer-events-none"></div>
                <div class="absolute -inset-4 rounded-full border border-cyan-300 border-dashed animate-spin pointer-events-none" style="animation-duration: 4s;"></div>
              ` : ""}
              <div class="absolute w-8 h-8 rounded-full border border-red-500/50 ${pulseClass}"></div>
              <div class="w-6 h-6 rotate-45 flex items-center justify-center shadow-lg" style="background-color: ${bergColor}; border: ${isSelected ? "2.5px solid #22d3ee" : "1.5px solid white"};">
                <span class="text-[9px] -rotate-45 font-black text-slate-950">▲</span>
              </div>
              <div class="absolute -bottom-4 whitespace-nowrap px-1 py-0.2 bg-slate-950/90 border ${isSelected ? "border-cyan-400 font-extrabold" : "border-slate-700"} rounded text-[9px] font-bold" style="color: ${isSelected ? "#22d3ee" : bergColor}">
                ${isSelected ? `🎯 ${berg.id}` : berg.id}
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([displayLat, displayLon], { icon: bergIcon });

        marker.on("click", () => {
          onSelectIceberg(berg);
        });

        marker.bindPopup(`
          <div class="p-1 text-xs">
            <div class="font-bold flex items-center justify-between text-sm">
              <span class="text-white">${berg.name}</span>
              <span class="px-1.5 py-0.5 rounded font-mono text-[10px] text-white" style="background-color: ${bergColor}">${berg.risk_level}</span>
            </div>
            <div class="text-slate-400 mt-1">Class: <span class="text-slate-200">${berg.size_class} (${berg.length_km} x ${berg.width_km} km)</span></div>
            <div class="grid grid-cols-2 gap-1.5 mt-2 bg-slate-800/80 p-1.5 rounded border border-slate-700 font-mono">
              <div>Drift: <span class="text-white">${berg.speed_knots} kts</span></div>
              <div>Heading: <span class="text-white">${berg.heading_degrees}°</span></div>
              <div>Draft: <span class="text-white">${berg.draft_m} m</span></div>
              <div>Range: <span class="text-amber-300 font-bold">${berg.distance_km} km</span></div>
            </div>
            <div class="mt-2 text-slate-400">
              Display Horizon: <span class="text-cyan-300 font-mono font-bold">${forecastHorizon}</span>
            </div>
          </div>
        `);

        bergsGroup.addLayer(marker);

        // 6. RENDER ICEBERG TRAJECTORY FORECAST PATH
        if (activeLayers.trajectories && berg.trajectory && berg.trajectory.length > 1) {
          const trajCoords: [number, number][] = berg.trajectory.map((t) => [t.latitude, t.longitude]);

          const trajPoly = L.polyline(trajCoords, {
            color: bergColor,
            weight: 2.5,
            dashArray: "4, 6",
            opacity: 0.8,
          });

          trajectories.addLayer(trajPoly);

          // Add uncertainty circles at +24h and +48h
          berg.trajectory.forEach((pt) => {
            if (pt.hour > 0) {
              const uncertaintyCircle = L.circle([pt.latitude, pt.longitude], {
                radius: pt.uncertainty_radius_km * 1000,
                color: bergColor,
                weight: 1,
                opacity: 0.4,
                fillColor: bergColor,
                fillOpacity: 0.08,
              });
              uncertaintyCircle.bindTooltip(`${berg.id} ${pt.horizon} (±${pt.uncertainty_radius_km}km)`, {
                className: "bg-slate-900 text-slate-200 text-[10px]",
              });
              trajectories.addLayer(uncertaintyCircle);
            }
          });
        }

        // 7. RENDER COLLISION RISK ZONE AROUND HIGH/CRITICAL ICEBERGS
        if (activeLayers.riskZones && (berg.risk_level === "Critical" || berg.risk_level === "High")) {
          const riskZone = L.circle([displayLat, displayLon], {
            radius: berg.collision_risk_radius_km * 1000,
            color: "#ef4444",
            weight: 1.5,
            dashArray: "3, 6",
            opacity: 0.7,
            fillColor: "#ef4444",
            fillOpacity: 0.12,
          });
          riskZones.addLayer(riskZone);
        }
      });
    }

    // 8. RENDER INSPECTED TACTICAL ALERT BEACON (IF ACTIVE)
    if (inspectedAlert && alertsGroup) {
      const isCrit = inspectedAlert.severity === "CRITICAL";
      const isWarn = inspectedAlert.severity === "WARNING";
      const beaconColor = isCrit ? "#ef4444" : isWarn ? "#f59e0b" : "#06b6d4";
      const pingColor = isCrit ? "rgba(239, 68, 68, 0.45)" : isWarn ? "rgba(245, 158, 11, 0.45)" : "rgba(6, 182, 212, 0.45)";

      const alertCoords = parseAlertCoordinates(inspectedAlert.location, {
        latitude: vessel.current_location.latitude,
        longitude: vessel.current_location.longitude,
      });

      const alertBeaconIcon = L.divIcon({
        className: "custom-alert-beacon-icon",
        html: `
          <div class="relative flex items-center justify-center cursor-pointer">
            <div class="absolute w-20 h-20 rounded-full animate-ping pointer-events-none" style="background-color: ${pingColor}; border: 2px solid ${beaconColor}; opacity: 0.75;"></div>
            <div class="absolute w-28 h-28 rounded-full pointer-events-none opacity-40 animate-pulse" style="border: 1.5px dashed ${beaconColor};"></div>
            <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-2xl border-2 border-white text-base font-bold text-white z-10" style="background-color: ${beaconColor}; box-shadow: 0 0 25px ${beaconColor};">
              ${isCrit ? "🚨" : isWarn ? "⚠" : "ℹ"}
            </div>
            <div class="absolute -bottom-6 whitespace-nowrap px-2 py-0.5 rounded font-mono text-[10px] font-black tracking-wider shadow-xl z-10" style="background-color: #0b1329; border: 1px solid ${beaconColor}; color: ${beaconColor};">
              INSPECTED: ${inspectedAlert.id}
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const alertMarker = L.marker(alertCoords, { icon: alertBeaconIcon });
      alertMarker.bindPopup(`
        <div class="p-1.5 text-xs font-sans max-w-xs">
          <div class="flex items-center justify-between pb-1.5 border-b border-slate-700">
            <span class="font-bold text-sm text-white flex items-center gap-1">
              <span>${isCrit ? "🚨" : isWarn ? "⚠" : "ℹ"}</span> ${inspectedAlert.title}
            </span>
            <span class="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold text-slate-950" style="background-color: ${beaconColor};">
              ${inspectedAlert.severity}
            </span>
          </div>
          <div class="text-slate-300 mt-2 leading-relaxed text-xs">
            ${inspectedAlert.message}
          </div>
          <div class="mt-2 text-slate-400 font-mono text-[11px] bg-slate-800/80 p-1.5 rounded border border-slate-700">
            <div>📍 Position: <strong class="text-white">${inspectedAlert.location}</strong></div>
            <div class="mt-1 text-cyan-300 font-bold">⚡ Action: ${inspectedAlert.action}</div>
          </div>
        </div>
      `);
      alertsGroup.addLayer(alertMarker);

      // Automatically open the popup so the inspection is immediately obvious
      setTimeout(() => {
        alertMarker.openPopup();
      }, 350);
    }
  }, [
    vessel,
    destination,
    icebergs,
    routes,
    recalculatedRoute,
    previousRoute,
    envGrid,
    forecastHorizon,
    activeLayers,
    selectedIceberg,
    inspectedAlert,
    onSelectIceberg,
  ]);

  // Auto-fly camera smoothly when an Alert is inspected
  useEffect(() => {
    if (inspectedAlert && mapInstanceRef.current) {
      const coords = parseAlertCoordinates(inspectedAlert.location, {
        latitude: vessel.current_location.latitude,
        longitude: vessel.current_location.longitude,
      });
      mapInstanceRef.current.flyTo(coords, 7.2, { animate: true, duration: 1.2 });
    }
  }, [inspectedAlert, vessel]);

  // Auto-fly camera to Selected Iceberg (if no alert is explicitly overriding)
  useEffect(() => {
    if (selectedIceberg && !inspectedAlert && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedIceberg.latitude, selectedIceberg.longitude], 7.0, { animate: true, duration: 1.0 });
    }
  }, [selectedIceberg, inspectedAlert]);

  // Dedicated, fast useEffect for 60 FPS smooth Vessel Animation & Traveled Trail Line
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !layerGroupsRef.current.vessel) return;

    const vesselGroup = layerGroupsRef.current.vessel;
    vesselGroup.clearLayers();

    if (!vessel) return;

    const vLat = voyagePosition ? voyagePosition.latitude : vessel.current_location.latitude;
    const vLon = voyagePosition ? voyagePosition.longitude : vessel.current_location.longitude;
    const vHead = voyagePosition ? voyagePosition.heading : vessel.current_location.heading_degrees;

    const vesselIcon = L.divIcon({
      className: "custom-vessel-icon",
      html: `
        <div class="relative flex items-center justify-center">
          <!-- Radar sweep pulse -->
          <div class="absolute w-14 h-14 rounded-full border border-emerald-400/60 bg-emerald-500/20 pulse-hazard"></div>
          <!-- Ship body -->
          <div class="w-9 h-9 rounded-full bg-slate-950 border-2 border-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-500/50 text-emerald-300 text-base font-black transform transition-all duration-150" style="transform: rotate(${vHead}deg)">
            ▲
          </div>
          <div class="absolute -bottom-5 whitespace-nowrap px-2 py-0.5 bg-slate-950/95 border border-emerald-500/80 rounded text-[10px] font-extrabold text-emerald-200 shadow-xl">
            🚢 ${vessel.name} ${isVoyageActive ? `(${voyageProgress.toFixed(0)}%)` : `(${vessel.current_location.speed_knots} kts)`}
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const vesselMarker = L.marker([vLat, vLon], { icon: vesselIcon });
    vesselMarker.bindPopup(`
      <div class="p-1 text-sm">
        <div class="font-bold text-emerald-400 text-base flex items-center justify-between">
          <span>🚢 ${vessel.name}</span>
          <span class="text-xs px-2 py-0.5 bg-emerald-950 rounded text-emerald-300 border border-emerald-600/50">${isVoyageActive ? "VOYAGE ACTIVE" : vessel.ice_class}</span>
        </div>
        <div class="text-xs text-slate-400 mt-1">${vessel.operator}</div>
        <div class="grid grid-cols-2 gap-2 mt-3 text-xs bg-slate-800/60 p-2 rounded border border-slate-700 font-mono">
          <div>Speed: <span class="text-white font-semibold">${vessel.current_location.speed_knots} kts</span></div>
          <div>Heading: <span class="text-white font-semibold">${vHead}°</span></div>
          <div>Progress: <span class="text-emerald-300 font-bold">${voyageProgress.toFixed(1)}%</span></div>
          <div>Remaining Fuel: <span class="text-white font-semibold">${(vessel.current_fuel_liters / 1000).toFixed(0)}k L</span></div>
        </div>
        <div class="mt-2 text-xs text-slate-300">
          Coordinates: <span class="font-mono text-cyan-300">${Math.abs(vLat).toFixed(3)}°S, ${Math.abs(vLon).toFixed(3)}°W</span>
        </div>
      </div>
    `);
    vesselGroup.addLayer(vesselMarker);

    // Render Traveled Voyage Trail Line
    if (traveledPath && traveledPath.length > 1) {
      const trailLine = L.polyline(traveledPath, {
        color: "#10b981",
        weight: 5,
        opacity: 0.95,
        dashArray: "6, 4"
      });
      vesselGroup.addLayer(trailLine);
    }
  }, [vessel, voyagePosition, traveledPath, isVoyageActive, voyageProgress]);

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-xl overflow-hidden border border-slate-800 bg-[#060b17]">
      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Start Voyage Action Button (if not active) */}
      {!isVoyageActive && voyageProgress === 0 && onStartVoyage && (
        <button
          onClick={onStartVoyage}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black px-4 py-2 rounded-xl shadow-2xl shadow-emerald-950/80 flex items-center gap-2 text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer border border-emerald-300/40"
        >
          <span className="text-sm">🚢</span>
          <span>START SHIP VOYAGE ➔</span>
        </button>
      )}

      {/* Live Voyage Navigation HUD Banner (when active or in-progress) */}
      {(isVoyageActive || voyageProgress > 0) && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-950/95 backdrop-blur-md border border-emerald-500/60 rounded-xl px-4 py-2 shadow-2xl shadow-emerald-950/90 flex flex-col sm:flex-row items-center gap-3 text-xs">
          <div className="flex items-center gap-2 pr-3 sm:border-r border-slate-800">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
            <div>
              <div className="font-extrabold text-white uppercase text-[11px] leading-tight flex items-center gap-1.5">
                <span>🚢 LIVE SHIP VOYAGE</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                  {isVoyagePaused ? "PAUSED" : "NAVIGATING"}
                </span>
              </div>
              <div className="text-[10px] text-emerald-300 font-mono">
                {vessel.name} ➔ {destination.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 block text-[9px]">POSITION</span>
              <span className="font-bold text-cyan-300">
                {voyagePosition ? `${Math.abs(voyagePosition.latitude).toFixed(2)}°S, ${Math.abs(voyagePosition.longitude).toFixed(2)}°W` : `${Math.abs(vessel.current_location.latitude).toFixed(2)}°S`}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">HEADING</span>
              <span className="font-bold text-slate-200">{voyagePosition ? `${voyagePosition.heading}°` : `${vessel.current_location.heading_degrees}°`}</span>
            </div>
            <div className="w-24">
              <div className="flex justify-between text-[9px] text-slate-300 mb-0.5">
                <span>PROGRESS</span>
                <span className="font-bold text-emerald-400">{voyageProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${voyageProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pl-3 sm:border-l border-slate-800">
            <span className="text-[9px] text-slate-400 font-mono hidden md:inline">SPEED:</span>
            {[1, 2, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => onSetVoyageSpeed && onSetVoyageSpeed(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  voyageSpeed === s ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {s}x
              </button>
            ))}

            <button
              onClick={isVoyagePaused ? onStartVoyage : onPauseVoyage}
              className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs cursor-pointer ml-1"
            >
              {isVoyagePaused ? "▶" : "⏸"}
            </button>
            <button
              onClick={onResetVoyage}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
            >
              ⏹
            </button>
          </div>
        </div>
      )}

      {/* Floating Layer Controls (Top Left) */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-2 shadow-xl flex flex-col gap-1.5 text-xs text-slate-300">
        <div className="flex items-center gap-1.5 font-semibold text-cyan-300 border-b border-slate-800 pb-1 px-1">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Tactical Map Layers</span>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white px-1">
            <input
              type="checkbox"
              checked={activeLayers.seaIce}
              onChange={() => onToggleLayer("seaIce")}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Sea-Ice Grid</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white px-1">
            <input
              type="checkbox"
              checked={activeLayers.icebergs}
              onChange={() => onToggleLayer("icebergs")}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Icebergs</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white px-1">
            <input
              type="checkbox"
              checked={activeLayers.trajectories}
              onChange={() => onToggleLayer("trajectories")}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Trajectories</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white px-1">
            <input
              type="checkbox"
              checked={activeLayers.routes}
              onChange={() => onToggleLayer("routes")}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Routes</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white px-1">
            <input
              type="checkbox"
              checked={activeLayers.riskZones}
              onChange={() => onToggleLayer("riskZones")}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Risk Zones</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white px-1">
            <input
              type="checkbox"
              checked={activeLayers.stations}
              onChange={() => onToggleLayer("stations")}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Bases & Ports</span>
          </label>
        </div>
      </div>

      {/* Floating Time Slider Controller (Bottom Center) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 rounded-xl px-4 py-2.5 shadow-2xl shadow-cyan-950/60 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 pr-2 border-r border-slate-800">
          <Clock className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <span>AI FORECAST TIMELINE:</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["Now", "+6h", "+12h", "+24h", "+48h"] as const).map((h) => {
            const isSelected = forecastHorizon === h;
            return (
              <button
                key={h}
                onClick={() => onHorizonChange(h)}
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                  isSelected
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40 scale-105"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {h}
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-slate-400 pl-2 border-l border-slate-800 font-mono hidden sm:block">
          {forecastHorizon === "Now" ? "Live Satellite Telemetry" : `Predictive Drift Horizon (${forecastHorizon})`}
        </div>
      </div>

      {/* Map Legend Overlay (Bottom Left) */}
      <div className="absolute bottom-4 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 shadow-xl text-[11px] text-slate-300 hidden md:block">
        <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
          <span>Map Visual Legend</span>
        </div>
        <div className="flex flex-col gap-1 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Route C (AI Recommended Balanced)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
            <span>Route A (Safest Offshore Arc)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
            <span>Route B (Direct Fuel-Saver)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-red-500 inline-block"></span>
            <span>Active Iceberg & Predicted Drift Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-400 animate-ping inline-block"></span>
            <span className="text-red-300 font-bold">Target Inspected Alert Beacon</span>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-800/80">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block border border-emerald-300"></span>
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block border border-amber-300"></span>
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block border border-purple-300"></span>
              <span className="w-2 h-2 rounded-full bg-white inline-block border border-sky-500"></span>
            </div>
            <span>Sea-Ice (Teal 10% → Amber 25% → Violet 40% → White 70%+)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
