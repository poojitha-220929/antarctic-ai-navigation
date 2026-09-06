import React, { useState } from "react";
import { Iceberg, Vessel, TrajectoryPoint } from "../types";
import { Compass, AlertTriangle, ShieldCheck, MapPin, Navigation, ArrowUpRight, Radio, Eye } from "lucide-react";

interface IcebergTrackingViewProps {
  icebergs: Iceberg[];
  vessel: Vessel;
  selectedIceberg: Iceberg | null;
  onSelectIceberg: (iceberg: Iceberg | null) => void;
  onNavigateToMap: () => void;
}

export const IcebergTrackingView: React.FC<IcebergTrackingViewProps> = ({
  icebergs,
  vessel,
  selectedIceberg,
  onSelectIceberg,
  onNavigateToMap,
}) => {
  const activeBerg = selectedIceberg || icebergs[0];

  return (
    <div className="p-4 flex flex-col gap-4 flex-1">
      {/* View Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              ICEBERG RADAR DETECTION & KALMAN TRAJECTORY PREDICTION
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Hydrodynamic drift model factoring in ocean currents (80% draft influence), wind leeway drag, and Coriolis left-turn deflection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-300 font-mono text-xs">
            Targets Monitored: <strong className="text-cyan-400">{icebergs.length}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-red-950 border border-red-700/60 text-red-300 font-mono text-xs">
            High/Critical Risks: <strong className="text-red-400">{icebergs.filter(b => b.risk_level === "Critical" || b.risk_level === "High").length}</strong>
          </span>
        </div>
      </div>

      {/* Main Grid: Iceberg Catalog Table (7 cols) & Selected Berg Trajectory Inspector (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Iceberg Fleet Table */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                Active Iceberg Registry (Sorted by Proximity)
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Click target to inspect trajectory</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="pb-2">TARGET ID</th>
                    <th className="pb-2">CLASS / SIZE</th>
                    <th className="pb-2">DRIFT VELOCITY</th>
                    <th className="pb-2">RANGE</th>
                    <th className="pb-2">BEARING</th>
                    <th className="pb-2">RISK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {icebergs.map((berg) => {
                    const isSelected = activeBerg?.id === berg.id;
                    return (
                      <tr
                        key={berg.id}
                        onClick={() => onSelectIceberg(berg)}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? "bg-cyan-950/50 border-l-2 border-cyan-400 text-cyan-100"
                            : "hover:bg-slate-800/40 text-slate-300"
                        }`}
                      >
                        <td className="py-3 px-2 font-bold flex items-center gap-1.5">
                          <span className={`w-2 h-2 rotate-45 inline-block ${
                            berg.risk_level === "Critical" ? "bg-red-500" : berg.risk_level === "High" ? "bg-orange-500" : "bg-sky-400"
                          }`}></span>
                          <span>{berg.id}</span>
                        </td>
                        <td className="py-3 text-slate-300">
                          <div className="font-bold text-slate-200">{berg.size_class}</div>
                          <div className="text-[10px] text-slate-400">{berg.length_km} x {berg.width_km} km</div>
                        </td>
                        <td className="py-3">
                          <div className="text-white font-bold">{berg.speed_knots} kts</div>
                          <div className="text-[10px] text-slate-400">{berg.heading_degrees}°</div>
                        </td>
                        <td className="py-3 font-bold text-amber-300">
                          {berg.distance_km} km
                        </td>
                        <td className="py-3 text-slate-400">
                          {berg.bearing_degrees}°
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              berg.risk_level === "Critical"
                                ? "bg-red-950 text-red-300 border border-red-500/50 animate-pulse"
                                : berg.risk_level === "High"
                                ? "bg-orange-950 text-orange-300 border border-orange-500/50"
                                : berg.risk_level === "Medium"
                                ? "bg-amber-950 text-amber-300 border border-amber-500/50"
                                : "bg-emerald-950 text-emerald-300 border border-emerald-500/50"
                            }`}
                          >
                            {berg.risk_level}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Reference Vessel: <strong className="text-white">{vessel.name}</strong></span>
            <button
              onClick={onNavigateToMap}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold transition-all cursor-pointer"
            >
              <span>View On Polar Map</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Iceberg Trajectory Inspector (5 cols) */}
        {activeBerg && (
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div>
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    <span>{activeBerg.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                      {activeBerg.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Sensor: {activeBerg.detected_source || "Sentinel-1 SAR / RADARSAT"}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                    activeBerg.risk_level === "Critical"
                      ? "bg-red-950 text-red-300 border border-red-500"
                      : activeBerg.risk_level === "High"
                      ? "bg-orange-950 text-orange-300 border border-orange-500"
                      : "bg-emerald-950 text-emerald-300 border border-emerald-500"
                  }`}
                >
                  {activeBerg.risk_level.toUpperCase()} RISK
                </span>
              </div>

              {/* Physical Specifications */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/70 p-3 rounded-lg border border-slate-800 font-mono mb-4">
                <div>
                  <span className="text-[10px] text-slate-400 block">CURRENT POSITION</span>
                  <span className="font-bold text-white">
                    {Math.abs(activeBerg.latitude).toFixed(2)}°S, {Math.abs(activeBerg.longitude).toFixed(2)}°W
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">SUBMERGED DRAFT</span>
                  <span className="font-bold text-cyan-300">{activeBerg.draft_m} meters</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">DISTANCE TO VESSEL</span>
                  <span className="font-bold text-amber-300">{activeBerg.distance_km} km ({activeBerg.distance_nm} NM)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">COLLISION RADIUS</span>
                  <span className="font-bold text-red-400">±{activeBerg.collision_risk_radius_km} km buffer</span>
                </div>
              </div>

              {/* Trajectory Prediction Schedule */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Predicted Trajectory Coordinates</span>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  {activeBerg.trajectory?.map((pt, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-2 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-12 font-bold text-cyan-300">{pt.horizon}</span>
                        <span className="text-slate-300">
                          {Math.abs(pt.latitude).toFixed(2)}°S, {Math.abs(pt.longitude).toFixed(2)}°W
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-slate-400">{pt.drift_speed_knots} kts @ {pt.heading_degrees}°</span>
                        <span className="text-amber-400 font-bold">±{pt.uncertainty_radius_km}km</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Hydrodynamic Physics Note */}
            <div className="mt-4 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-xs text-slate-300">
              <div className="font-bold text-cyan-300 mb-0.5">Physics Drift Equations:</div>
              <p className="text-[11px] text-slate-400">
                Drift is driven 78% by underwater keel friction against the Antarctic Circumpolar Current / Weddell Gyre,
                and 22% by wind stress deflected 25° counter-clockwise by the Southern Hemisphere Coriolis parameter.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
