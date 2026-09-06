import React from "react";
import { Vessel, Station, Iceberg, Route, RiskAssessment, EnvironmentalCell, SeaIceForecast, AIExplanation, DynamicRecalculationData, Alert } from "../types";
import { AntarcticMap } from "../components/AntarcticMap";
import { KPIGrid } from "../components/KPIGrid";
import { DynamicRecalculationBanner } from "../components/DynamicRecalculationBanner";
import { Ship, Compass, ChevronRight, Wind, Waves, Thermometer, Bell, Target, X, Navigation } from "lucide-react";

interface DashboardViewProps {
  vessel: Vessel;
  destination: Station;
  icebergs: Iceberg[];
  routes: {
    route_a?: Route;
    route_b?: Route;
    route_c?: Route;
  };
  recalculatedData: DynamicRecalculationData | null;
  onDismissHazard: () => void;
  envGrid: EnvironmentalCell[];
  currentEnv?: EnvironmentalCell;
  seaIceForecast?: SeaIceForecast;
  riskAssessment?: RiskAssessment;
  aiExplanation?: AIExplanation;
  selectedIceberg: Iceberg | null;
  onSelectIceberg: (iceberg: Iceberg | null) => void;
  inspectedAlert?: Alert | null;
  onClearInspectedAlert?: () => void;
  forecastHorizon: "Now" | "+6h" | "+12h" | "+24h" | "+48h";
  onHorizonChange: (h: "Now" | "+6h" | "+12h" | "+24h" | "+48h") => void;
  activeLayers: {
    seaIce: boolean;
    icebergs: boolean;
    trajectories: boolean;
    routes: boolean;
    riskZones: boolean;
    stations: boolean;
  };
  onToggleLayer: (layerKey: keyof DashboardViewProps["activeLayers"]) => void;
  onNavigateToTab: (tabId: any) => void;
  // Voyage Props
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

export const DashboardView: React.FC<DashboardViewProps> = ({
  vessel,
  destination,
  icebergs,
  routes,
  recalculatedData,
  onDismissHazard,
  envGrid,
  currentEnv,
  seaIceForecast,
  riskAssessment,
  aiExplanation,
  selectedIceberg,
  onSelectIceberg,
  inspectedAlert,
  onClearInspectedAlert,
  forecastHorizon,
  onHorizonChange,
  activeLayers,
  onToggleLayer,
  onNavigateToTab,
  voyagePosition,
  traveledPath,
  isVoyageActive,
  isVoyagePaused,
  voyageProgress,
  voyageSpeed,
  onStartVoyage,
  onPauseVoyage,
  onResetVoyage,
  onSetVoyageSpeed,
}) => {
  const vLoc = vessel.current_location;
  const nearestBerg = icebergs[0];
  const recRoute = routes.route_c;

  return (
    <div className="flex flex-col gap-3 p-4 flex-1">
      {/* 9 Dashboard KPIs */}
      <KPIGrid
        seaIceForecast={seaIceForecast}
        icebergs={icebergs}
        riskAssessment={riskAssessment}
        recommendedRoute={recRoute}
        aiExplanation={aiExplanation}
      />

      {/* Active Alert Tactical Inspection HUD Banner */}
      {inspectedAlert && (
        <div className="bg-gradient-to-r from-red-950/90 via-slate-900/95 to-slate-900 border-2 border-red-500/80 rounded-xl p-3.5 shadow-2xl shadow-red-950/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start md:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/40">
              <Target className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-500 text-slate-950 font-mono">
                  {inspectedAlert.severity}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                  {inspectedAlert.category}
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  TACTICAL INSPECTION ACTIVE: {inspectedAlert.title}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 font-bold px-1.5 py-0.2 rounded bg-slate-800">
                  [{inspectedAlert.id}]
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                {inspectedAlert.message}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-1.5 text-[11px] text-slate-400 font-mono">
                <span>📍 Target Coordinates: <strong className="text-amber-300">{inspectedAlert.location}</strong></span>
                <span>⚡ Action Required: <strong className="text-cyan-300">{inspectedAlert.action}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              onClick={() => onNavigateToTab("alerts")}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
            >
              <Bell className="w-3.5 h-3.5 text-cyan-400" />
              <span>Full Alert Details</span>
            </button>
            {onClearInspectedAlert && (
              <button
                onClick={onClearInspectedAlert}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-all cursor-pointer flex items-center gap-1 border border-slate-700"
                title="Dismiss Inspection Banner"
              >
                <X className="w-4 h-4" />
                <span>Dismiss</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Hazard Recalculation Alert Banner (if simulated) */}
      {recalculatedData && (
        <DynamicRecalculationBanner
          data={recalculatedData}
          onDismiss={onDismissHazard}
        />
      )}

      {/* Main Operational Split: Map on Left (70%), Tactical Sidebars on Right (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[560px]">
        {/* Antarctic Interactive Map */}
        <div className="lg:col-span-8 xl:col-span-9 h-[520px] lg:h-auto rounded-xl overflow-hidden shadow-2xl border border-slate-800">
          <AntarcticMap
            vessel={vessel}
            destination={destination}
            icebergs={icebergs}
            routes={routes}
            recalculatedRoute={recalculatedData?.recalculated_route}
            previousRoute={recalculatedData?.previous_route}
            envGrid={envGrid}
            selectedIceberg={selectedIceberg}
            onSelectIceberg={onSelectIceberg}
            inspectedAlert={inspectedAlert}
            onClearInspectedAlert={onClearInspectedAlert}
            forecastHorizon={forecastHorizon}
            onHorizonChange={onHorizonChange}
            activeLayers={activeLayers}
            onToggleLayer={onToggleLayer}
            voyagePosition={voyagePosition}
            traveledPath={traveledPath}
            isVoyageActive={isVoyageActive}
            isVoyagePaused={isVoyagePaused}
            voyageProgress={voyageProgress}
            voyageSpeed={voyageSpeed}
            onStartVoyage={onStartVoyage}
            onPauseVoyage={onPauseVoyage}
            onResetVoyage={onResetVoyage}
            onSetVoyageSpeed={onSetVoyageSpeed}
          />
        </div>

        {/* Tactical Decision Support Sidebars */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3">
          {/* Inspected Alert Sidebar Telemetry Card */}
          {inspectedAlert && (
            <div className="bg-gradient-to-br from-red-950/70 via-slate-900 to-slate-900 border-2 border-red-500/60 rounded-xl p-3.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-red-400 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Target Inspection Lock
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-700">
                  {inspectedAlert.severity}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="font-bold text-white text-xs">{inspectedAlert.title}</div>
                <div className="text-slate-300 text-[11px] leading-relaxed line-clamp-3">
                  {inspectedAlert.message}
                </div>
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800 font-mono text-[11px] space-y-1 mt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Position:</span>
                    <span className="text-amber-300 font-bold">{inspectedAlert.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="text-cyan-300">{inspectedAlert.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Time:</span>
                    <span className="text-slate-300">{new Date(inspectedAlert.timestamp).toLocaleTimeString()} UTC</span>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-cyan-300 font-medium">
                  ⚡ <strong>Directive:</strong> {inspectedAlert.action}
                </div>

                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => onNavigateToTab("alerts")}
                    className="flex-1 py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <span>Inspect Diagnostics</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  {onClearInspectedAlert && (
                    <button
                      onClick={onClearInspectedAlert}
                      className="py-1.5 px-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-all cursor-pointer"
                      title="Clear Lock"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Vessel Status Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <Ship className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Vessel Bridge State
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                {vessel.ice_class}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Vessel:</span>
                <span className="font-bold text-white">{vessel.name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Position:</span>
                <span className="font-mono text-cyan-300">
                  {Math.abs(vLoc.latitude).toFixed(2)}°S, {Math.abs(vLoc.longitude).toFixed(2)}°W
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2 rounded border border-slate-800 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">SPEED</span>
                  <span className="font-bold text-white">{vLoc.speed_knots} kts</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">HEADING</span>
                  <span className="font-bold text-white">{vLoc.heading_degrees}°</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">FUEL BURN</span>
                  <span className="font-bold text-amber-300">{vessel.avg_fuel_consumption_l_per_hr} L/h</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">REMAINING FUEL</span>
                  <span className="font-bold text-emerald-400">
                    {Math.round((vessel.current_fuel_liters / vessel.fuel_capacity_liters) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tactical Environmental Telemetry */}
          {currentEnv && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Vessel Ambient Weather
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">In-Situ Sensor</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-cyan-400" /> SST
                  </div>
                  <div className="text-sm font-bold text-cyan-300">{currentEnv.sea_surface_temperature}°C</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-blue-400" /> AIR TEMP
                  </div>
                  <div className="text-sm font-bold text-blue-300">{currentEnv.air_temperature}°C</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Wind className="w-3 h-3 text-amber-400" /> WIND
                  </div>
                  <div className="text-sm font-bold text-amber-300">{currentEnv.wind_speed} kts ({currentEnv.wind_direction}°)</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Waves className="w-3 h-3 text-indigo-400" /> SWELL
                  </div>
                  <div className="text-sm font-bold text-indigo-300">{currentEnv.wave_height} m</div>
                </div>
              </div>
            </div>
          )}

          {/* Iceberg Radar Alert Summary */}
          {nearestBerg && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Nearest Iceberg Target
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                  nearestBerg.risk_level === "Critical"
                    ? "bg-red-950 text-red-300 border border-red-500/60"
                    : "bg-amber-950 text-amber-300 border border-amber-500/60"
                }`}>
                  {nearestBerg.risk_level.toUpperCase()}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Target ID:</span>
                  <span className="font-bold text-white">{nearestBerg.name}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Distance to Vessel:</span>
                  <span className="font-mono text-amber-300 font-bold">{nearestBerg.distance_km} km ({nearestBerg.distance_nm} NM)</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Drift Vector:</span>
                  <span className="font-mono text-slate-200">{nearestBerg.speed_knots} kts @ {nearestBerg.heading_degrees}°</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Dimensions:</span>
                  <span className="font-mono text-slate-200">{nearestBerg.length_km} x {nearestBerg.width_km} km (Draft {nearestBerg.draft_m}m)</span>
                </div>

                <button
                  onClick={() => {
                    onSelectIceberg(nearestBerg);
                    onNavigateToTab("icebergs");
                  }}
                  className="w-full mt-2 py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <span>Inspect Trajectory Models</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* AI Decision Recommendation Preview Card */}
          {recRoute && (
            <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-xl p-3.5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    AI Recommended Route
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black">
                  ROUTE C
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/70 p-2 rounded border border-emerald-500/30 font-mono mb-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">RISK SCORE</span>
                  <span className="font-bold text-emerald-400">{recRoute.navigation_risk_score} / 100</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">EST. FUEL</span>
                  <span className="font-bold text-slate-200">{recRoute.estimated_fuel_liters.toLocaleString()} L</span>
                </div>
              </div>

              <button
                onClick={() => onNavigateToTab("route_optimizer")}
                className="w-full py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <span>View Multi-Objective Optimization</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
