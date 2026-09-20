import {
  Vessel,
  Station,
  EnvironmentalCell,
  SeaIceForecast,
  Iceberg,
  TrajectoryPoint,
  RiskAssessment,
  Route,
  AIExplanation,
  Alert,
  SimulationResponse,
  DynamicRecalculationData
} from "../types";
import { offlineEngine } from "./offlineFallback";

const LOCAL_API_BASE = "http://127.0.0.1:8000/api";
const CLOUD_API_BASE = "https://antarctic-ai-navigation-1.onrender.com/api";
const API_BASE = "";
const TIMEOUT_MS = 2500;

export type NetworkModePreference = "ONLINE" | "OFFLINE";
export type ActiveNetworkMode = "ONLINE (LOCAL API)" | "ONLINE (CLOUD)" | "OFFLINE (EDGE ENGINE)";

let modePreference: NetworkModePreference =
  (typeof window !== "undefined" && (localStorage.getItem("antarctic_network_mode") as NetworkModePreference)) || "ONLINE";

let activeMode: ActiveNetworkMode =
  modePreference === "OFFLINE" ? "OFFLINE (EDGE ENGINE)" : "ONLINE (LOCAL API)";

type ModeListener = (active: ActiveNetworkMode, pref: NetworkModePreference) => void;
const listeners: ModeListener[] = [];

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn(activeMode, modePreference);
    } catch (e) {
      console.error("Mode listener error:", e);
    }
  });
}

export function getNetworkModePreference(): NetworkModePreference {
  return modePreference;
}

export function getActiveNetworkMode(): ActiveNetworkMode {
  return activeMode;
}

export function setNetworkModePreference(pref: NetworkModePreference): void {
  modePreference = pref;
  if (typeof window !== "undefined") {
    localStorage.setItem("antarctic_network_mode", pref);
  }
  if (pref === "OFFLINE") {
    activeMode = "OFFLINE (EDGE ENGINE)";
  } else {
    activeMode = "ONLINE (LOCAL API)";
  }
  notifyListeners();
}

export function subscribeNetworkMode(callback: ModeListener): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

async function fetchFromEndpoint(base: string, path: string, options: RequestInit = {}, timeoutMs: number = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function fetchWithTimeout(pathOrUrl: string, options: RequestInit = {}, timeoutMs: number = TIMEOUT_MS): Promise<Response> {
  // Normalize path if full URL was passed
  let path = pathOrUrl;
  if (path.includes("/api")) {
    path = path.substring(path.indexOf("/api") + 4);
  }
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  // If user selected OFFLINE mode, immediately use offline edge engine
  if (modePreference === "OFFLINE") {
    if (activeMode !== "OFFLINE (EDGE ENGINE)") {
      activeMode = "OFFLINE (EDGE ENGINE)";
      notifyListeners();
    }
    throw new Error("Offline mode active");
  }

  // 1. Try local FastAPI backend first
  try {
    const res = await fetchFromEndpoint(LOCAL_API_BASE, path, options, 1500);
    if (res.ok) {
      if (activeMode !== "ONLINE (LOCAL API)") {
        activeMode = "ONLINE (LOCAL API)";
        notifyListeners();
      }
      return res;
    }
  } catch {
    // Local backend not reachable or error, try cloud
  }

  // 2. Try cloud Render backend
  try {
    const res = await fetchFromEndpoint(CLOUD_API_BASE, path, options, timeoutMs);
    if (res.ok) {
      if (activeMode !== "ONLINE (CLOUD)") {
        activeMode = "ONLINE (CLOUD)";
        notifyListeners();
      }
      return res;
    }
  } catch {
    // Cloud backend not reachable
  }

  // 3. Fallback to offline edge engine
  if (activeMode !== "OFFLINE (EDGE ENGINE)") {
    activeMode = "OFFLINE (EDGE ENGINE)";
    notifyListeners();
  }
  throw new Error("Both local and cloud backends unreachable; fallback to edge engine");
}

export const api = {
  async getVessels(): Promise<Vessel[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/vessels`);
      if (!res.ok) throw new Error("Failed to fetch vessels from server");
      return await res.json();
    } catch {
      console.warn("Using offline fallback for getVessels");
      activeMode = "OFFLINE (EDGE ENGINE)";
      return offlineEngine.getVessels();
    }
  },

  async getStations(): Promise<Station[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/stations`);
      if (!res.ok) throw new Error("Failed to fetch stations from server");
      return await res.json();
    } catch {
      console.warn("Using offline fallback for getStations");
      activeMode = "OFFLINE (EDGE ENGINE)";
      return offlineEngine.getStations();
    }
  },

  async getEnvironment(): Promise<{ metadata: any; grid: EnvironmentalCell[] }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/environment?step=1.5`);
      if (!res.ok) throw new Error("Failed to fetch environment grid from server");
      return await res.json();
    } catch {
      console.warn("Using offline fallback for getEnvironment");
      activeMode = "OFFLINE (EDGE ENGINE)";
      return offlineEngine.getEnvironment();
    }
  },

  async getSeaIceForecast(lat: number, lon: number): Promise<{
    environmental_conditions: EnvironmentalCell;
    forecast_results: SeaIceForecast;
    explainability_feature_importances: any[];
  }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/sea-ice/forecast?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error("Failed to fetch sea-ice forecast from server");
      return await res.json();
    } catch {
      console.warn("Using offline fallback for getSeaIceForecast");
      activeMode = "OFFLINE (EDGE ENGINE)";
      return offlineEngine.getSeaIceForecast(lat, lon);
    }
  },

  async getIcebergs(vesselLat: number, vesselLon: number): Promise<Iceberg[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/icebergs?vessel_lat=${vesselLat}&vessel_lon=${vesselLon}`);
      if (!res.ok) throw new Error("Failed to fetch icebergs from server");
      const data = await res.json();
      return data.icebergs;
    } catch {
      console.warn("Using offline fallback for getIcebergs");
      activeMode = "OFFLINE (EDGE ENGINE)";
      return offlineEngine.getIcebergs(vesselLat, vesselLon);
    }
  },

  async getIcebergTrajectory(icebergId: string): Promise<{
    iceberg_id: string;
    name: string;
    trajectory: TrajectoryPoint[];
  }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/icebergs/${icebergId}/trajectory`);
      if (!res.ok) throw new Error(`Failed to fetch trajectory for ${icebergId}`);
      return await res.json();
    } catch {
      console.warn("Using offline fallback for getIcebergTrajectory");
      activeMode = "OFFLINE (EDGE ENGINE)";
      const bergs = offlineEngine.getIcebergs(-60.85, -63.50);
      const found = bergs.find((b) => b.id === icebergId) || bergs[0];
      return {
        iceberg_id: found.id,
        name: found.name,
        trajectory: found.trajectory || []
      };
    }
  },

  async analyzeRisk(params: {
    latitude: number;
    longitude: number;
    vessel_speed_knots?: number;
    nearest_iceberg_dist_km?: number;
    trajectory_conflict?: boolean;
  }): Promise<{ risk_assessment: RiskAssessment }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/risk/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Failed to analyze risk on server");
      return await res.json();
    } catch {
      console.warn("Using offline fallback for analyzeRisk");
      activeMode = "OFFLINE (EDGE ENGINE)";
      return offlineEngine.analyzeRisk(params);
    }
  },

  async optimizeRoute(params: {
    vessel_id: string;
    destination_id: string;
    objective?: string;
  }): Promise<{
    vessel: Vessel;
    destination: Station;
    routing_results: {
      routes: {
        route_a: Route;
        route_b: Route;
        route_c: Route;
      };
      recommended_route_id: string;
      ai_explanation: AIExplanation;
    };
  }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/route/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Failed to optimize route on server");
      return await res.json();
    } catch {
      console.warn("Using offline fallback for optimizeRoute");
      activeMode = "OFFLINE (EDGE ENGINE)";
      return offlineEngine.optimizeRoute(params);
    }
  },

  async getAlerts(vesselId: string = "polarstern"): Promise<Alert[]> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/alerts?vessel_id=${vesselId}`);
      if (!res.ok) throw new Error("Failed to fetch alerts from server");
      const data = await res.json();
      return data.alerts;
    } catch {
      console.warn("Using offline fallback for getAlerts");
      activeMode = "OFFLINE (EDGE ENGINE)";
      return offlineEngine.getAlerts();
    }
  },

  async runSimulation(vesselId: string, destinationId: string): Promise<SimulationResponse> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/simulation/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vessel_id: vesselId, destination_id: destinationId }),
      }, 3500);
      if (!res.ok) throw new Error("Failed to run AI simulation on server");
      return await res.json();
    } catch {
      console.warn("Using offline fallback for runSimulation");
      activeMode = "OFFLINE (EDGE ENGINE)";
      return offlineEngine.runSimulation(vesselId, destinationId);
    }
  },

  async triggerHazardDrift(vesselId: string, destinationId: string): Promise<DynamicRecalculationData> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/simulation/hazard-drift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vessel_id: vesselId, destination_id: destinationId }),
      }, 3500);
      if (!res.ok) throw new Error("Failed to trigger hazard drift simulation on server");
      return await res.json();
    } catch {
      console.warn("Using offline fallback for triggerHazardDrift");
      activeMode = "OFFLINE (EDGE ENGINE)";
      return offlineEngine.triggerHazardDrift(vesselId, destinationId);
    }
  },

  async resetSimulation(): Promise<{ status: string }> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/simulation/reset`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset simulation on server");
      return await res.json();
    } catch {
      console.warn("Using offline fallback for resetSimulation");
      activeMode = "OFFLINE (EDGE ENGINE)";
      return offlineEngine.resetSimulation();
    }
  },

  async getModelsInfo(): Promise<any> {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/models/info`);
      if (!res.ok) throw new Error("Failed to fetch models info from server");
      return await res.json();
    } catch {
      console.warn("Using offline fallback for getModelsInfo");
      activeMode = "OFFLINE (EDGE ENGINE)";
      return offlineEngine.getModelsInfo();
    }
  }
};
