import React, { useState, useEffect } from "react";
import { Vessel } from "../types";
import { Ship, Cpu, Database, Play, AlertTriangle, RefreshCw, Radio, Wifi, Globe, Zap } from "lucide-react";
import {
  getActiveNetworkMode,
  getNetworkModePreference,
  setNetworkModePreference,
  subscribeNetworkMode,
  ActiveNetworkMode,
  NetworkModePreference
} from "../services/api";

interface HeaderProps {
  vessels: Vessel[];
  selectedVessel: Vessel;
  onSelectVessel: (vessel: Vessel) => void;
  onRunSimulation: () => void;
  onTriggerHazard: () => void;
  onResetSimulation: () => void;
  isHazardActive: boolean;
  isSimulating: boolean;
  isVoyageActive?: boolean;
  isVoyagePaused?: boolean;
  onStartVoyage?: () => void;
  onPauseVoyage?: () => void;
  onResetVoyage?: () => void;
  onToggleMode?: (newMode: NetworkModePreference) => void;
}

export const Header: React.FC<HeaderProps> = ({
  vessels,
  selectedVessel,
  onSelectVessel,
  onRunSimulation,
  onTriggerHazard,
  onResetSimulation,
  isHazardActive,
  isSimulating,
  isVoyageActive = false,
  isVoyagePaused = false,
  onStartVoyage,
  onPauseVoyage,
  onResetVoyage,
  onToggleMode,
}) => {
  const [utcTime, setUtcTime] = useState<string>("");
  const [activeMode, setActiveMode] = useState<ActiveNetworkMode>(getActiveNetworkMode());
  const [prefMode, setPrefMode] = useState<NetworkModePreference>(getNetworkModePreference());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace("GMT", "UTC"));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeNetworkMode((active, pref) => {
      setActiveMode(active);
      setPrefMode(pref);
    });
    return unsubscribe;
  }, []);

  const handleToggleClick = () => {
    const nextPref: NetworkModePreference = prefMode === "ONLINE" ? "OFFLINE" : "ONLINE";
    setNetworkModePreference(nextPref);
    if (onToggleMode) {
      onToggleMode(nextPref);
    }
  };

  return (
    <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 text-white shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Title & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center shadow-lg shadow-cyan-900/40 shrink-0">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-wider text-slate-100 uppercase flex items-center gap-2">
              <span>ANTARCTIC AI NAVIGATION DECISION SUPPORT SYSTEM</span>
              <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-700/60 px-2 py-0.5 rounded font-mono font-normal">
                v1.0-PROTOTYPE
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              AI-powered Sea-Ice Forecasting • Iceberg Trajectory Prediction • Safe & Fuel-Efficient Routing
            </p>
          </div>
        </div>

        {/* Operational Status Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Connection Mode Indicator & Interactive Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded p-0.5">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono font-bold text-[11px] ${
                activeMode.includes("ONLINE")
                  ? "bg-emerald-950/90 border border-emerald-500/50 text-emerald-300"
                  : "bg-amber-950/90 border border-amber-500/50 text-amber-300"
              }`}
              title={
                activeMode.includes("ONLINE")
                  ? "Connected to Live AI Backend"
                  : "Running on Client Edge AI Engine (100% Offline Capable)"
              }
            >
              {activeMode.includes("ONLINE") ? (
                <Globe className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>MODE: {activeMode}</span>
            </div>

            {/* Quick Toggle Button */}
            <button
              onClick={handleToggleClick}
              title={
                prefMode === "ONLINE"
                  ? "Click to switch to Offline Edge Engine mode"
                  : "Click to switch to Online API mode"
              }
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                prefMode === "ONLINE"
                  ? "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300 active:scale-95"
                  : "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300 active:scale-95"
              }`}
            >
              {prefMode === "ONLINE" ? "⚡ Switch Offline" : "🌐 Switch Online"}
            </button>
          </div>

          {/* UTC Clock */}
          <div className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-slate-300">
            🕒 {utcTime || "SYNCING UTC..."}
          </div>

          {/* Data Feed Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-300">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-medium text-slate-400">DATA:</span>
            <span className="font-semibold text-cyan-300">Realistic Synthetic / CMEMS Ready</span>
          </div>

          {/* Model Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-medium text-slate-400">AI MODEL:</span>
            <span className="font-semibold text-emerald-400">Ensemble RF + Kalman Drift</span>
          </div>

          {/* Research Vessel Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-cyan-500/40 rounded">
            <Ship className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] text-slate-400 font-medium">VESSEL:</span>
            <select
              value={selectedVessel.id}
              onChange={(e) => {
                const v = vessels.find((item) => item.id === e.target.value);
                if (v) onSelectVessel(v);
              }}
              className="bg-transparent text-cyan-200 text-xs font-bold focus:outline-none cursor-pointer"
            >
              {vessels.map((v) => (
                <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                  {v.name} ({v.ice_class})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Simulation Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Start / Pause / Reset Voyage Button */}
          {!isVoyageActive ? (
            <button
              onClick={onStartVoyage}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
              title="Starts live animated vessel navigation along the AI recommended route."
            >
              <Ship className="w-4 h-4 text-slate-950" />
              <span>Start Voyage</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-emerald-500/50">
              <button
                onClick={isVoyagePaused ? onStartVoyage : onPauseVoyage}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs cursor-pointer"
              >
                <span>{isVoyagePaused ? "▶ Resume" : "⏸ Pause"}</span>
              </button>
              <button
                onClick={onResetVoyage}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                title="Stop voyage and return ship to origin."
              >
                ⏹ Stop
              </button>
            </div>
          )}

          <button
            onClick={onRunSimulation}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-slate-950 ${isSimulating ? "animate-spin" : ""}`} />
            <span>{isSimulating ? "Processing AI..." : "Run AI Simulation"}</span>
          </button>

          {!isHazardActive ? (
            <button
              onClick={onTriggerHazard}
              title="Simulates Iceberg A-102 drifting into the current vessel route to demonstrate dynamic recalculation."
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/50 hover:bg-amber-500/25 text-amber-300 font-semibold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Hazard Drift</span>
            </button>
          ) : (
            <button
              onClick={onResetSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950 border border-red-500/50 hover:bg-red-900/50 text-red-200 font-semibold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-red-400" />
              <span>Reset Hazard</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
