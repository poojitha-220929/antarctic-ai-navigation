import React from "react";
import { LayoutDashboard, CloudSnow, Compass, Navigation, ShieldAlert, Bell, Cpu } from "lucide-react";

export type TabId =
  | "dashboard"
  | "sea_ice"
  | "icebergs"
  | "route_optimizer"
  | "risk_analysis"
  | "alerts"
  | "data_models";

interface NavigationTabsProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  alertCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onSelectTab,
  alertCount,
}) => {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "sea_ice", label: "Sea-Ice Forecast", icon: CloudSnow },
    { id: "icebergs", label: "Iceberg Tracking", icon: Compass },
    { id: "route_optimizer", label: "Route Optimizer", icon: Navigation },
    { id: "risk_analysis", label: "Risk Analysis", icon: ShieldAlert },
    { id: "alerts", label: "Alerts", icon: Bell, badge: alertCount },
    { id: "data_models", label: "Data & AI Models", icon: Cpu },
  ];

  return (
    <nav className="bg-slate-900/90 border-b border-slate-800 px-4 py-1.5 flex items-center gap-1 overflow-x-auto shadow-md">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id as TabId)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-500 text-white animate-pulse">
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};
