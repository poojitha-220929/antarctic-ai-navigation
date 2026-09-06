import React from "react";
import { AlertTriangle, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import { DynamicRecalculationData } from "../types";

interface DynamicRecalculationBannerProps {
  data: DynamicRecalculationData;
  onDismiss: () => void;
}

export const DynamicRecalculationBanner: React.FC<DynamicRecalculationBannerProps> = ({
  data,
  onDismiss,
}) => {
  const prev = data.previous_route;
  const rec = data.recalculated_route;

  return (
    <div className="bg-gradient-to-r from-red-950/90 via-slate-900/95 to-emerald-950/90 border border-red-500/60 rounded-xl p-3.5 shadow-2xl shadow-red-950/50 mb-3 animate-pulse-slow">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Warning Title & Message */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2 py-0.5 rounded bg-red-500 text-white font-mono uppercase">
                {data.alert.severity} EARLY WARNING
              </span>
              <span className="text-sm font-bold text-red-300">
                {data.alert.title}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              {data.alert.message}
            </p>
          </div>
        </div>

        {/* Before vs After Route Comparison Pills */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-xs">
          {/* Previous Route */}
          <div className="text-right">
            <div className="text-[10px] text-red-400 font-bold">PREVIOUS ROUTE</div>
            <div className="font-mono text-slate-300">
              Risk <span className="text-red-400 font-bold">{prev.risk_score}/100</span>
            </div>
            <div className="text-[10px] text-slate-400">{prev.hazard_intersections} Hazard Conf.</div>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />

          {/* Recalculated Route */}
          <div>
            <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              DYNAMIC AI ROUTE
            </div>
            <div className="font-mono text-slate-200">
              Risk <span className="text-emerald-400 font-bold">{rec.risk_score}/100</span>
              <span className="text-[10px] text-emerald-400 ml-1">(-{rec.risk_reduction_percent}%)</span>
            </div>
            <div className="text-[10px] text-slate-400">{rec.hazard_intersections} Hazards • +{rec.fuel_penalty_percent}% Fuel</div>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold">
            ✔ Auto-Recalculated on Map
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-xs"
            title="Dismiss Banner"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};
