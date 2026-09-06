import React from "react";
import { CloudSnow, Compass, ShieldAlert, Navigation, Fuel, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { SeaIceForecast, Iceberg, RiskAssessment, Route, AIExplanation } from "../types";

interface KPIGridProps {
  seaIceForecast?: SeaIceForecast;
  icebergs: Iceberg[];
  riskAssessment?: RiskAssessment;
  recommendedRoute?: Route;
  aiExplanation?: AIExplanation;
}

export const KPIGrid: React.FC<KPIGridProps> = ({
  seaIceForecast,
  icebergs,
  riskAssessment,
  recommendedRoute,
  aiExplanation,
}) => {
  const curIce = seaIceForecast?.current_concentration_percent ?? 38.4;
  const ice24h = seaIceForecast?.forecasts?.["+24h"]?.concentration_percent ?? 54.2;
  const activeBergs = icebergs.length;
  const highRiskBergs = icebergs.filter((b) => b.risk_level === "Critical" || b.risk_level === "High").length;
  const riskScore = riskAssessment?.risk_score ?? 28.0;
  const riskTier = riskAssessment?.risk_tier ?? "Low";
  const fuelEst = recommendedRoute?.estimated_fuel_liters ?? 7950;
  const fuelSaved = aiExplanation?.fuel_saving_percent ?? 11.2;
  const etaHours = recommendedRoute?.estimated_travel_time_hours ?? 36.4;

  const kpis = [
    {
      label: "CURRENT SEA-ICE",
      value: `${curIce.toFixed(1)}%`,
      sub: "Satellite Micro-Wave",
      icon: CloudSnow,
      color: "text-cyan-400",
      border: "border-cyan-500/30",
      bg: "bg-cyan-950/20",
    },
    {
      label: "24H ICE FORECAST",
      value: `${ice24h.toFixed(1)}%`,
      sub: `+${(ice24h - curIce).toFixed(1)}% expansion expected`,
      icon: TrendingUp,
      color: "text-blue-400",
      border: "border-blue-500/30",
      bg: "bg-blue-950/20",
    },
    {
      label: "ACTIVE ICEBERGS",
      value: activeBergs.toString(),
      sub: "Tracked in 150km Sector",
      icon: Compass,
      color: "text-sky-400",
      border: "border-sky-500/30",
      bg: "bg-sky-950/20",
    },
    {
      label: "HIGH-RISK BERGS",
      value: highRiskBergs.toString(),
      sub: "Critical/High proximity",
      icon: AlertTriangle,
      color: highRiskBergs > 0 ? "text-red-400" : "text-emerald-400",
      border: highRiskBergs > 0 ? "border-red-500/40" : "border-emerald-500/30",
      bg: highRiskBergs > 0 ? "bg-red-950/30" : "bg-emerald-950/20",
    },
    {
      label: "NAVIGATION RISK",
      value: `${riskScore.toFixed(0)} / 100`,
      sub: `${riskTier.toUpperCase()} OPERATIONAL TIER`,
      icon: ShieldAlert,
      color:
        riskScore > 60 ? "text-red-400" : riskScore > 30 ? "text-amber-400" : "text-emerald-400",
      border:
        riskScore > 60 ? "border-red-500/40" : riskScore > 30 ? "border-amber-500/40" : "border-emerald-500/30",
      bg:
        riskScore > 60 ? "bg-red-950/20" : riskScore > 30 ? "bg-amber-950/20" : "bg-emerald-950/20",
    },
    {
      label: "RECOMMENDED ROUTE",
      value: "Route C",
      sub: "Balanced Safe-Fuel Corridor",
      icon: Navigation,
      color: "text-emerald-400",
      border: "border-emerald-500/40",
      bg: "bg-emerald-950/25",
    },
    {
      label: "ESTIMATED FUEL",
      value: `${fuelEst.toLocaleString()} L`,
      sub: `${(fuelEst / 1000).toFixed(1)} MT Marine Gas Oil`,
      icon: Fuel,
      color: "text-indigo-300",
      border: "border-indigo-500/30",
      bg: "bg-indigo-950/20",
    },
    {
      label: "FUEL SAVED",
      value: `${fuelSaved.toFixed(1)}%`,
      sub: "vs Safest Deep-Water Arc",
      icon: TrendingUp,
      color: "text-emerald-400",
      border: "border-emerald-500/30",
      bg: "bg-emerald-950/20",
    },
    {
      label: "ESTIMATED TIME (ETA)",
      value: `${etaHours.toFixed(1)} hrs`,
      sub: "Waypoint Arrival Margin",
      icon: Clock,
      color: "text-slate-200",
      border: "border-slate-700/60",
      bg: "bg-slate-900/50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-9 gap-2.5">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className={`p-2.5 rounded-xl border ${kpi.border} ${kpi.bg} backdrop-blur-sm flex flex-col justify-between shadow-lg transition-all hover:border-slate-600`}
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 tracking-wider">
              <span>{kpi.label}</span>
              <Icon className={`w-3.5 h-3.5 ${kpi.color}`} />
            </div>
            <div className={`text-lg font-black font-mono mt-1 ${kpi.color}`}>
              {kpi.value}
            </div>
            <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
              {kpi.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};
