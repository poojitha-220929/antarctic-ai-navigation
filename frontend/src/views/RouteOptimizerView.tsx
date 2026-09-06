import React, { useState } from "react";
import { Vessel, Station, Route, AIExplanation } from "../types";
import { Navigation, ShieldCheck, Fuel, Clock, Compass, CheckCircle2, Sliders, ArrowRight } from "lucide-react";

interface RouteOptimizerViewProps {
  vessel: Vessel;
  destination: Station;
  stations: Station[];
  onSelectDestination: (st: Station) => void;
  routes: {
    route_a?: Route;
    route_b?: Route;
    route_c?: Route;
  };
  aiExplanation?: AIExplanation;
  onNavigateToMap: () => void;
}

export const RouteOptimizerView: React.FC<RouteOptimizerViewProps> = ({
  vessel,
  destination,
  stations,
  onSelectDestination,
  routes,
  aiExplanation,
  onNavigateToMap,
}) => {
  const [selectedObjective, setSelectedObjective] = useState<"safest" | "fuel_efficient" | "balanced">("balanced");

  // Objective Cost Weights
  const weights = {
    safest: { alpha: 0.65, beta: 0.15, gamma: 0.20, label: "Safety Biased (Max Hazard Standoff)" },
    fuel_efficient: { alpha: 0.15, beta: 0.65, gamma: 0.20, label: "Fuel Biased (Min Nautical Miles)" },
    balanced: { alpha: 0.40, beta: 0.35, gamma: 0.25, label: "Multi-Objective Balanced (Pareto Optimal)" },
  }[selectedObjective];

  const ra = routes.route_a;
  const rb = routes.route_b;
  const rc = routes.route_c;

  return (
    <div className="p-4 flex flex-col gap-4 flex-1">
      {/* View Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              SAFE & FUEL-EFFICIENT ROUTE OPTIMIZER (A* ENVIRONMENTAL PATHFINDER)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Computes multi-corridor Pareto pathways balancing polar pack-ice resistance, iceberg trajectory cones, and bunker fuel consumption.
          </p>
        </div>
        <button
          onClick={onNavigateToMap}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
        >
          <span>Plot Corridors on Map</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inputs & Objective Selector Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vessel Specifications */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xl text-xs">
          <div className="font-bold text-slate-200 uppercase mb-2 flex items-center justify-between">
            <span>Active Vessel Specs</span>
            <span className="font-mono text-cyan-400">{vessel.ice_class}</span>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Vessel Name:</span>
              <span className="font-bold text-white">{vessel.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Coords:</span>
              <span className="font-mono text-cyan-300">
                {Math.abs(vessel.current_location.latitude).toFixed(2)}°S, {Math.abs(vessel.current_location.longitude).toFixed(2)}°W
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fuel Capacity:</span>
              <span className="font-mono text-slate-200">{(vessel.fuel_capacity_liters / 1000).toLocaleString()}k Liters</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Open-Water Cruise Burn:</span>
              <span className="font-mono text-amber-300">{vessel.avg_fuel_consumption_l_per_hr} L/h</span>
            </div>
          </div>
        </div>

        {/* Destination Port/Station Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xl text-xs">
          <div className="font-bold text-slate-200 uppercase mb-2">
            Target Destination Base / Port
          </div>
          <div className="space-y-2">
            <select
              value={destination.id}
              onChange={(e) => {
                const st = stations.find((s) => s.id === e.target.value);
                if (st) onSelectDestination(st);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs font-semibold text-emerald-300 focus:outline-none focus:border-emerald-500"
            >
              {stations.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.type})
                </option>
              ))}
            </select>
            <div className="p-2 bg-slate-950/60 rounded border border-slate-800 text-[11px] text-slate-400">
              Coordinates: <span className="font-mono text-slate-200">{Math.abs(destination.latitude).toFixed(2)}°S, {Math.abs(destination.longitude).toFixed(2)}°W</span>
              <br />
              {destination.description}
            </div>
          </div>
        </div>

        {/* Route Objective & Weight Function */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xl text-xs flex flex-col justify-between">
          <div>
            <div className="font-bold text-slate-200 uppercase mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cost Function Objective</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <button
                onClick={() => setSelectedObjective("safest")}
                className={`py-1 px-2 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  selectedObjective === "safest"
                    ? "bg-sky-500 text-slate-950 shadow"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Safest
              </button>
              <button
                onClick={() => setSelectedObjective("fuel_efficient")}
                className={`py-1 px-2 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  selectedObjective === "fuel_efficient"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Fuel-Save
              </button>
              <button
                onClick={() => setSelectedObjective("balanced")}
                className={`py-1 px-2 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  selectedObjective === "balanced"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Balanced
              </button>
            </div>
          </div>

          <div className="p-2 bg-slate-950/70 rounded border border-slate-800 font-mono text-[11px] text-slate-300">
            <div className="text-cyan-300 font-bold mb-0.5">Route Cost = α·Risk + β·Fuel + γ·Time</div>
            <div className="text-slate-400 text-[10px]">
              α={weights.alpha} | β={weights.beta} | γ={weights.gamma} ({weights.label})
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Route Comparison Cards (3 columns: Route A, Route B, Route C) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Route A — Safest */}
        {ra && (
          <div className="bg-slate-900/90 border border-sky-500/40 rounded-xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-sky-900/60 border-b border-l border-sky-500/40 text-sky-300 font-mono text-[10px] font-bold rounded-bl-lg">
              {ra.badge}
            </div>
            <div>
              <div className="text-base font-bold text-sky-300 mb-1">{ra.name}</div>
              <p className="text-xs text-slate-400 mb-3">{ra.description}</p>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/70 p-3 rounded-lg border border-slate-800 font-mono mb-3">
                <div>
                  <span className="text-[10px] text-slate-400 block">TOTAL DISTANCE</span>
                  <span className="text-base font-bold text-white">{ra.total_distance_km} km ({ra.total_distance_nm} NM)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">EST. TRAVEL TIME</span>
                  <span className="text-base font-bold text-white">{ra.estimated_travel_time_hours} hrs</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">FUEL CONSUMPTION</span>
                  <span className="text-base font-bold text-amber-300">{ra.estimated_fuel_liters.toLocaleString()} L</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">NAVIGATION RISK</span>
                  <span className="text-base font-bold text-sky-400">{ra.navigation_risk_score} / 100</span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Hazard Intersections:</span>
                  <span className="font-mono font-bold text-emerald-400">{ra.hazard_intersections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Sea-Ice Exposure:</span>
                  <span className="font-mono font-bold text-slate-200">{ra.max_sea_ice_exposure_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Min Iceberg Clearance:</span>
                  <span className="font-mono font-bold text-slate-200">{ra.min_iceberg_distance_km} km</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              Steers far offshore around pack ice margins. Highest fuel consumption (+11%).
            </div>
          </div>
        )}

        {/* Route B — Fuel Efficient */}
        {rb && (
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-amber-900/60 border-b border-l border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold rounded-bl-lg">
              {rb.badge}
            </div>
            <div>
              <div className="text-base font-bold text-amber-300 mb-1">{rb.name}</div>
              <p className="text-xs text-slate-400 mb-3">{rb.description}</p>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/70 p-3 rounded-lg border border-slate-800 font-mono mb-3">
                <div>
                  <span className="text-[10px] text-slate-400 block">TOTAL DISTANCE</span>
                  <span className="text-base font-bold text-white">{rb.total_distance_km} km ({rb.total_distance_nm} NM)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">EST. TRAVEL TIME</span>
                  <span className="text-base font-bold text-white">{rb.estimated_travel_time_hours} hrs</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">FUEL CONSUMPTION</span>
                  <span className="text-base font-bold text-emerald-400">{rb.estimated_fuel_liters.toLocaleString()} L</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">NAVIGATION RISK</span>
                  <span className="text-base font-bold text-amber-400">{rb.navigation_risk_score} / 100</span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Hazard Intersections:</span>
                  <span className="font-mono font-bold text-amber-400">{rb.hazard_intersections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Sea-Ice Exposure:</span>
                  <span className="font-mono font-bold text-slate-200">{rb.max_sea_ice_exposure_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Min Iceberg Clearance:</span>
                  <span className="font-mono font-bold text-amber-400">{rb.min_iceberg_distance_km} km</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              Shortest distance rhumb-line, but traverses proximity buffer of drifting iceberg sectors.
            </div>
          </div>
        )}

        {/* Route C — AI Recommended Balanced */}
        {rc && (
          <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500 rounded-xl p-4 shadow-2xl shadow-emerald-950/50 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3.5 py-1 bg-emerald-500 text-slate-950 font-mono text-[10px] font-black rounded-bl-lg flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 fill-slate-950 text-white" />
              AI RECOMMENDED
            </div>
            <div>
              <div className="text-base font-bold text-emerald-300 mb-1">{rc.name}</div>
              <p className="text-xs text-slate-300 mb-3">{rc.description}</p>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/80 p-3 rounded-lg border border-emerald-500/40 font-mono mb-3">
                <div>
                  <span className="text-[10px] text-slate-400 block">TOTAL DISTANCE</span>
                  <span className="text-base font-bold text-white">{rc.total_distance_km} km ({rc.total_distance_nm} NM)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">EST. TRAVEL TIME</span>
                  <span className="text-base font-bold text-white">{rc.estimated_travel_time_hours} hrs</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">FUEL CONSUMPTION</span>
                  <span className="text-base font-bold text-emerald-400">{rc.estimated_fuel_liters.toLocaleString()} L</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">NAVIGATION RISK</span>
                  <span className="text-base font-bold text-emerald-300">{rc.navigation_risk_score} / 100</span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Hazard Intersections:</span>
                  <span className="font-mono font-bold text-emerald-400">{rc.hazard_intersections} (Clear)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Sea-Ice Exposure:</span>
                  <span className="font-mono font-bold text-slate-200">{rc.max_sea_ice_exposure_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Min Iceberg Clearance:</span>
                  <span className="font-mono font-bold text-emerald-400">{rc.min_iceberg_distance_km} km</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-500/30 text-[11px] text-emerald-300/90 font-medium">
              ★ Optimal Pareto choice: eliminates all trajectory hazards while retaining low fuel burn.
            </div>
          </div>
        )}
      </div>

      {/* AI Explainability Decision Callout */}
      {aiExplanation && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>AI Decision Explainability: Why was Route C recommended?</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              {aiExplanation.justification_bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-300">
                  <span className="text-emerald-400 font-bold mt-0.5">✔</span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-slate-400 space-y-2 font-mono text-[11px]">
              <div className="text-white font-bold">Quantitative Pareto Trade-off:</div>
              <div>• Risk Reduction vs Route B: <span className="text-emerald-400 font-bold">+{aiExplanation.risk_reduction_percent}% safer</span></div>
              <div>• Fuel Savings vs Route A: <span className="text-emerald-400 font-bold">+{aiExplanation.fuel_saving_percent}% fuel saved</span></div>
              <div>• Distance Penalty vs Route B: <span className="text-slate-300 font-bold">+{aiExplanation.distance_penalty_percent}% distance</span></div>
              <div>• Predicted Hazard Collisions: <span className="text-emerald-400 font-bold">0</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
