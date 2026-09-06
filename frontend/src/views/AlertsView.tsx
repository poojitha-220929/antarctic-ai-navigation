import React, { useState } from "react";
import { Alert } from "../types";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowUpRight,
  RefreshCw,
  Filter,
  Eye,
  ChevronDown,
  ChevronUp,
  MapPin,
  Radar,
  Radio,
  Clock,
  Compass,
  X,
  Target,
  ShieldAlert
} from "lucide-react";

interface AlertsViewProps {
  alerts: Alert[];
  onTriggerRecalculation: () => void;
  onNavigateToMap: () => void;
  onInspectAlert?: (alert: Alert, navigateToMap?: boolean) => void;
  inspectedAlert?: Alert | null;
  isHazardActive: boolean;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onTriggerRecalculation,
  onNavigateToMap,
  onInspectAlert,
  inspectedAlert,
  isHazardActive,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [inspectedAlertId, setInspectedAlertId] = useState<string | null>(inspectedAlert?.id || null);

  const handleAcknowledge = (id: string) => {
    if (!acknowledgedIds.includes(id)) {
      setAcknowledgedIds([...acknowledgedIds, id]);
    }
  };

  const handleToggleInspect = (alt: Alert) => {
    if (inspectedAlertId === alt.id) {
      setInspectedAlertId(null);
      if (onInspectAlert) {
        onInspectAlert(null as any, false);
      }
    } else {
      setInspectedAlertId(alt.id);
      if (onInspectAlert) {
        onInspectAlert(alt, false);
      }
    }
  };

  const handleLocateOnMap = (alt: Alert) => {
    setInspectedAlertId(alt.id);
    if (onInspectAlert) {
      onInspectAlert(alt, true);
    } else {
      onNavigateToMap();
    }
  };

  const filteredAlerts = alerts.filter((alt) => {
    if (selectedCategory === "ALL") return true;
    return alt.category === selectedCategory;
  });

  // Helper for sensor attribution
  const getSensorAttribution = (cat: string) => {
    switch (cat) {
      case "Iceberg":
        return "Sentinel-1 SAR Dual-Polarization + RADARSAT Constellation";
      case "Sea-Ice":
        return "AMSR2 High-Frequency (89 GHz) Microwave Radiometer";
      case "Weather":
        return "ECMWF Marine Boundary Layer & In-Situ Ship AWS";
      case "Route Optimization":
        return "Antarctic Multi-Objective Dijkstra / Cost Engine";
      default:
        return "Polar Telemetry Sensor Array";
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4 flex-1">
      {/* View Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              TACTICAL ALERT & EARLY WARNING SYSTEM
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated collision hazard detection, sea-ice threshold exceedance alerts, and proactive rerouting recommendations.
          </p>
        </div>

        {/* Severity Count Pills */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-red-950/80 border border-red-500/60 text-red-300 font-bold">
            {alerts.filter((a) => a.severity === "CRITICAL").length} CRITICAL
          </span>
          <span className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-500/60 text-amber-300 font-bold">
            {alerts.filter((a) => a.severity === "WARNING").length} WARNINGS
          </span>
          <span className="px-2.5 py-1 rounded bg-blue-950/80 border border-blue-500/60 text-blue-300 font-bold">
            {alerts.filter((a) => a.severity === "INFO").length} INFO
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-400 font-semibold mr-1">Filter Category:</span>
        {["ALL", "Iceberg", "Sea-Ice", "Weather", "Route Optimization"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === cat
                ? "bg-cyan-500 text-slate-950 font-bold shadow"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alt) => {
          const isAck = acknowledgedIds.includes(alt.id);
          const isCrit = alt.severity === "CRITICAL";
          const isWarn = alt.severity === "WARNING";
          const isInspected = inspectedAlertId === alt.id || inspectedAlert?.id === alt.id;

          return (
            <div
              key={alt.id}
              className={`p-4 rounded-xl border transition-all duration-200 shadow-lg ${
                isInspected
                  ? "bg-slate-900/95 border-cyan-400 ring-2 ring-cyan-500/50 shadow-cyan-500/10 shadow-2xl"
                  : isCrit
                  ? "bg-red-950/40 border-red-500/60"
                  : isWarn
                  ? "bg-amber-950/30 border-amber-500/40"
                  : "bg-slate-900/90 border-slate-800"
              } ${isAck && !isInspected ? "opacity-60" : "opacity-100"}`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                {/* Left: Icon, Category & Message */}
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isInspected
                        ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40"
                        : isCrit
                        ? "bg-red-500 text-slate-950"
                        : isWarn
                        ? "bg-amber-500/20 border border-amber-500 text-amber-300"
                        : "bg-blue-500/20 border border-blue-500 text-blue-300"
                    }`}
                  >
                    {isInspected ? (
                      <Target className="w-5 h-5 animate-pulse" />
                    ) : isCrit ? (
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    ) : isWarn ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded font-mono uppercase ${
                          isCrit
                            ? "bg-red-500 text-slate-950"
                            : isWarn
                            ? "bg-amber-500 text-slate-950"
                            : "bg-blue-500 text-slate-950"
                        }`}
                      >
                        {alt.severity}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {alt.category}
                      </span>
                      <h3 className="text-sm font-bold text-white">{alt.title}</h3>

                      {isInspected && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500 animate-pulse font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                          ACTIVELY INSPECTING
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
                      {alt.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-slate-400 font-mono">
                      <span>📍 Location: <strong className="text-slate-200">{alt.location}</strong></span>
                      <span>🕒 Time: <strong className="text-slate-200">{new Date(alt.timestamp).toLocaleTimeString()} UTC</strong></span>
                      <span>⚡ Recommended Action: <strong className="text-cyan-300">{alt.action}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 md:self-center">
                  {isCrit && !isHazardActive && (
                    <button
                      onClick={onTriggerRecalculation}
                      className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-lg shadow-red-500/30 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reroute Evasion</span>
                    </button>
                  )}

                  {/* Primary Inspect Toggle Button */}
                  <button
                    onClick={() => handleToggleInspect(alt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isInspected
                        ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30"
                        : "bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isInspected ? "Collapse Details" : "Inspect"}</span>
                    {isInspected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Locate on Map Button */}
                  <button
                    onClick={() => handleLocateOnMap(alt)}
                    className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-cyan-900/60 text-slate-300 hover:text-cyan-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-all cursor-pointer"
                    title="Track & Locate on Interactive Polar Map"
                  >
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Locate on Map</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleAcknowledge(alt.id)}
                    disabled={isAck}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isAck
                        ? "bg-slate-800/40 text-slate-500 cursor-default"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                    }`}
                  >
                    {isAck ? "Acknowledged" : "Ack"}
                  </button>
                </div>
              </div>

              {/* EXPANDED TACTICAL DIAGNOSTIC INSPECTOR DRAWER */}
              {isInspected && (
                <div className="mt-4 pt-4 border-t border-cyan-500/30 bg-slate-950/70 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Radar className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: "8s" }} />
                      <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono">
                        TACTICAL TELEMETRY & DIAGNOSTICS DISCLOSURE [{alt.id}]
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300">
                      LIVE RADAR LOCK
                    </span>
                  </div>

                  {/* 4-Column Diagnostic Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                    {/* Module 1: Sensor Attribution */}
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                        <Radio className="w-3 h-3 text-cyan-400" /> SENSOR & DETECTION
                      </div>
                      <div className="font-semibold text-slate-200 text-[11px] leading-tight">
                        {getSensorAttribution(alt.category)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Data Integrity: <span className="text-emerald-400">99.4% Verified</span>
                      </div>
                    </div>

                    {/* Module 2: Geolocation & Target Coordinates */}
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                        <Compass className="w-3 h-3 text-amber-400" /> GEOLOCATION
                      </div>
                      <div className="font-bold text-amber-300 font-mono text-[11px]">
                        {alt.location}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Coordinate System: <span className="text-slate-300">WGS-84 Polar</span>
                      </div>
                    </div>

                    {/* Module 3: Threat Horizon */}
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-400" /> TIME HORIZON
                      </div>
                      <div className="font-bold text-sky-300 font-mono text-[11px]">
                        {isCrit ? "< 12 Hours to Corridor Breach" : "Immediate Operational Horizon"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Timestamp: <span className="text-slate-300">{new Date(alt.timestamp).toLocaleTimeString()} UTC</span>
                      </div>
                    </div>

                    {/* Module 4: Tactical Response Protocol */}
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-red-400" /> TACTICAL DIRECTIVE
                      </div>
                      <div className="font-semibold text-cyan-300 text-[11px] leading-tight">
                        {alt.action}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Standoff Margin: <span className="text-emerald-400">Min 5.0 NM Required</span>
                      </div>
                    </div>
                  </div>

                  {/* Inspector Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Clicking <strong>Locate on Map</strong> centers the polar cartography and renders a pulsing radar target beacon.</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLocateOnMap(alt)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Locate & Track on Polar Map</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>

                      {isCrit && !isHazardActive && (
                        <button
                          onClick={onTriggerRecalculation}
                          className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-500/30 transition-all cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Execute AI Reroute</span>
                        </button>
                      )}

                      <button
                        onClick={() => setInspectedAlertId(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-all cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Close</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

