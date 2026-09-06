import React from "react";
import { RiskAssessment, Vessel, EnvironmentalCell } from "../types";
import { ShieldAlert, AlertTriangle, ShieldCheck, Thermometer, Wind, Waves, Compass, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface RiskAnalysisViewProps {
  riskAssessment?: RiskAssessment;
  vessel: Vessel;
  currentEnv?: EnvironmentalCell;
  isHazardActive: boolean;
}

export const RiskAnalysisView: React.FC<RiskAnalysisViewProps> = ({
  riskAssessment,
  vessel,
  currentEnv,
  isHazardActive,
}) => {
  const score = riskAssessment?.risk_score ?? (isHazardActive ? 78.5 : 28.0);
  const tier = riskAssessment?.risk_tier ?? (isHazardActive ? "High" : "Low");
  const recommendation =
    riskAssessment?.recommendation ??
    "Maintain planned cruise speed. Standard polar bridge watch and ice radar watch.";

  const factors = riskAssessment?.factors ?? [
    { name: "Sea-Ice Concentration", points: 14.5, description: "Moderate open pack ice (38.4%)", severity: "medium" },
    { name: "Iceberg Proximity", points: 8.0, description: "Nearest iceberg 28.4 km in eastern sector", severity: "low" },
    { name: "Wind Velocity & Icing", points: 3.5, description: "Moderate westerly breeze (21.4 kts)", severity: "low" },
    { name: "Wave Swell Action", points: 1.5, description: "Moderate swell (1.8m)", severity: "low" },
    { name: "Ocean Current Shear", points: 0.5, description: "Eastward ACC current 0.8 kts", severity: "low" },
  ];

  // Bar chart format
  const chartData = factors.map((f) => ({
    name: f.name.replace("Concentration", "").replace("Proximity", "").replace("& Icing", ""),
    points: f.points,
    severity: f.severity,
  }));

  // Gauge angle calculation
  const gaugeRotation = Math.min(180, Math.max(0, (score / 100) * 180));

  return (
    <div className="p-4 flex flex-col gap-4 flex-1">
      {/* View Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              VESSEL NAVIGATION RISK ENGINE (MULTI-VARIABLE EVALUATION)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamic operational risk scoring (0-100) derived from sea-ice floe compression, iceberg trajectory proximity, and severe polar weather.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-300 font-mono text-xs">
            Vessel: <strong className="text-cyan-300">{vessel.name}</strong>
          </span>
          <span
            className={`px-2.5 py-1 rounded font-mono text-xs font-bold ${
              score > 60
                ? "bg-red-950 text-red-300 border border-red-500 animate-pulse"
                : score > 30
                ? "bg-amber-950 text-amber-300 border border-amber-500"
                : "bg-emerald-950 text-emerald-300 border border-emerald-500"
            }`}
          >
            {tier.toUpperCase()} RISK
          </span>
        </div>
      </div>

      {/* Main Grid: Risk Gauge (5 cols) & Factor Breakdown Bar Chart (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Risk Gauge & Status Card (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col items-center justify-between text-center">
          <div className="w-full">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Composite Operational Risk Score
            </div>

            {/* Circular / Semi-Circular Dial */}
            <div className="relative w-48 h-28 mx-auto overflow-hidden mt-4">
              {/* Outer arch */}
              <div className="w-48 h-48 rounded-full border-[18px] border-slate-800 border-b-transparent border-l-transparent transform -rotate-45" />
              {/* Colored Gauge Indicator */}
              <div
                className="absolute top-0 left-0 w-48 h-48 rounded-full border-[18px] border-b-transparent border-l-transparent transition-all duration-700"
                style={{
                  borderColor: score > 60 ? "#ef4444" : score > 30 ? "#f59e0b" : "#10b981",
                  transform: `rotate(${-45 + (score / 100) * 180}deg)`,
                }}
              />
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center">
                <span className="text-3xl font-black font-mono text-white">{score.toFixed(0)}</span>
                <span className="text-xs text-slate-400 block font-mono">/ 100</span>
              </div>
            </div>

            {/* Risk Tier Badge */}
            <div className="mt-4">
              <span
                className={`px-4 py-1 rounded-full text-xs font-black font-mono uppercase tracking-widest ${
                  score > 60
                    ? "bg-red-500 text-slate-950 shadow-lg shadow-red-500/30"
                    : score > 30
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30"
                    : "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30"
                }`}
              >
                {tier} Operational Risk Tier
              </span>
            </div>
          </div>

          {/* Scale Legend */}
          <div className="w-full mt-6 pt-4 border-t border-slate-800 grid grid-cols-4 gap-1 text-[10px] font-mono text-center">
            <div className="p-1 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
              0-30<br/>LOW
            </div>
            <div className="p-1 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30">
              31-60<br/>MODERATE
            </div>
            <div className="p-1 rounded bg-orange-950/40 text-orange-300 border border-orange-500/30">
              61-80<br/>HIGH
            </div>
            <div className="p-1 rounded bg-red-950/40 text-red-300 border border-red-500/30">
              81-100<br/>CRITICAL
            </div>
          </div>

          {/* Advisory */}
          <div className="w-full mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800 text-left text-xs text-slate-300">
            <div className="font-bold text-slate-200 mb-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bridge Navigation Directive:</span>
            </div>
            <p className="text-slate-400 text-[11px]">{recommendation}</p>
          </div>
        </div>

        {/* Contributing Factors Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Contributing Hazard Factors
              </div>
              <span className="text-[10px] font-mono text-slate-400">Sum = {score.toFixed(1)} pts</span>
            </div>

            {/* Factors Table */}
            <div className="space-y-2 mb-4">
              {factors.map((f, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        f.severity === "critical"
                          ? "bg-red-500 animate-ping"
                          : f.severity === "high"
                          ? "bg-orange-500"
                          : f.severity === "medium"
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-200">{f.name}</div>
                      <div className="text-[11px] text-slate-400">{f.description}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="font-mono font-bold text-sm text-cyan-300">
                      +{f.points.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">pts</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bar Chart Visualization */}
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} domain={[0, 45]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                    itemStyle={{ color: "#38bdf8", fontWeight: "bold" }}
                  />
                  <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.severity === "critical"
                            ? "#ef4444"
                            : entry.severity === "high"
                            ? "#f97316"
                            : entry.severity === "medium"
                            ? "#f59e0b"
                            : "#38bdf8"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Risk model evaluates dynamic vessel heading against environmental resistance.</span>
            <span className="font-mono text-cyan-400 font-bold">5 Factor Channels Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
