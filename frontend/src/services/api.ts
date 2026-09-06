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

const API_BASE = "/api";

export const api = {
  async getVessels(): Promise<Vessel[]> {
    const res = await fetch(`${API_BASE}/vessels`);
    if (!res.ok) throw new Error("Failed to fetch vessels");
    return res.json();
  },

  async getStations(): Promise<Station[]> {
    const res = await fetch(`${API_BASE}/stations`);
    if (!res.ok) throw new Error("Failed to fetch stations");
    return res.json();
  },

  async getEnvironment(): Promise<{ metadata: any; grid: EnvironmentalCell[] }> {
    const res = await fetch(`${API_BASE}/environment?step=1.5`);
    if (!res.ok) throw new Error("Failed to fetch environment grid");
    return res.json();
  },

  async getSeaIceForecast(lat: number, lon: number): Promise<{
    environmental_conditions: EnvironmentalCell;
    forecast_results: SeaIceForecast;
    explainability_feature_importances: any[];
  }> {
    const res = await fetch(`${API_BASE}/sea-ice/forecast?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error("Failed to fetch sea-ice forecast");
    return res.json();
  },

  async getIcebergs(vesselLat: number, vesselLon: number): Promise<Iceberg[]> {
    const res = await fetch(`${API_BASE}/icebergs?vessel_lat=${vesselLat}&vessel_lon=${vesselLon}`);
    if (!res.ok) throw new Error("Failed to fetch icebergs");
    const data = await res.json();
    return data.icebergs;
  },

  async getIcebergTrajectory(icebergId: string): Promise<{
    iceberg_id: string;
    name: string;
    trajectory: TrajectoryPoint[];
  }> {
    const res = await fetch(`${API_BASE}/icebergs/${icebergId}/trajectory`);
    if (!res.ok) throw new Error(`Failed to fetch trajectory for ${icebergId}`);
    return res.json();
  },

  async analyzeRisk(params: {
    latitude: number;
    longitude: number;
    vessel_speed_knots?: number;
    nearest_iceberg_dist_km?: number;
    trajectory_conflict?: boolean;
  }): Promise<{ risk_assessment: RiskAssessment }> {
    const res = await fetch(`${API_BASE}/risk/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error("Failed to analyze risk");
    return res.json();
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
    const res = await fetch(`${API_BASE}/route/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error("Failed to optimize route");
    return res.json();
  },

  async getAlerts(vesselId: string = "polarstern"): Promise<Alert[]> {
    const res = await fetch(`${API_BASE}/alerts?vessel_id=${vesselId}`);
    if (!res.ok) throw new Error("Failed to fetch alerts");
    const data = await res.json();
    return data.alerts;
  },

  async runSimulation(vesselId: string, destinationId: string): Promise<SimulationResponse> {
    const res = await fetch(`${API_BASE}/simulation/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vessel_id: vesselId, destination_id: destinationId }),
    });
    if (!res.ok) throw new Error("Failed to run AI simulation");
    return res.json();
  },

  async triggerHazardDrift(vesselId: string, destinationId: string): Promise<DynamicRecalculationData> {
    const res = await fetch(`${API_BASE}/simulation/hazard-drift`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vessel_id: vesselId, destination_id: destinationId }),
    });
    if (!res.ok) throw new Error("Failed to trigger hazard drift simulation");
    return res.json();
  },

  async resetSimulation(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/simulation/reset`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to reset simulation");
    return res.json();
  },

  async getModelsInfo(): Promise<any> {
    const res = await fetch(`${API_BASE}/models/info`);
    if (!res.ok) throw new Error("Failed to fetch models info");
    return res.json();
  }
};
