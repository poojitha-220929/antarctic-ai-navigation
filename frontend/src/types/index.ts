export interface VesselLocation {
  latitude: number;
  longitude: number;
  heading_degrees: number;
  speed_knots: number;
}

export interface Vessel {
  id: string;
  name: string;
  operator: string;
  ice_class: string;
  length_m: number;
  beam_m: number;
  max_speed_knots: number;
  cruise_speed_knots: number;
  fuel_capacity_liters: number;
  current_fuel_liters: number;
  avg_fuel_consumption_l_per_hr: number;
  ice_fuel_multiplier: number;
  current_location: VesselLocation;
  default_destination_id: string;
}

export interface Station {
  id: string;
  name: string;
  country: string;
  type: string;
  latitude: number;
  longitude: number;
  description: string;
}

export interface EnvironmentalCell {
  timestamp: string;
  latitude: number;
  longitude: number;
  sea_ice_concentration: number;
  sea_surface_temperature: number;
  air_temperature: number;
  wind_speed: number;
  wind_direction: number;
  ocean_current_speed: number;
  ocean_current_direction: number;
  wave_height: number;
  atmospheric_pressure: number;
  visibility_km: number;
}

export interface TrajectoryPoint {
  hour: number;
  horizon: string;
  latitude: number;
  longitude: number;
  drift_speed_knots: number;
  heading_degrees: number;
  uncertainty_radius_km: number;
}

export interface Iceberg {
  id: string;
  name: string;
  type: string;
  size_class: string;
  length_km: number;
  width_km: number;
  freeboard_m?: number;
  draft_m: number;
  latitude: number;
  longitude: number;
  speed_knots: number;
  heading_degrees: number;
  detected_source?: string;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  collision_risk_radius_km: number;
  distance_km: number;
  distance_nm: number;
  bearing_degrees: number;
  trajectory: TrajectoryPoint[];
}

export interface ForecastHorizonData {
  horizon: string;
  concentration_percent: number;
  delta_from_current: number;
  risk_level: string;
  confidence_percent: number;
}

export interface SeaIceForecast {
  current_concentration_percent: number;
  current_risk_level: string;
  forecasts: {
    "+6h": ForecastHorizonData;
    "+12h": ForecastHorizonData;
    "+24h": ForecastHorizonData;
    "+48h": ForecastHorizonData;
  };
}

export interface FeatureImportance {
  feature: string;
  label: string;
  importance: number;
}

export interface RiskFactor {
  name: string;
  points: number;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface RiskAssessment {
  risk_score: number;
  risk_tier: "Low" | "Moderate" | "High" | "Critical";
  recommendation: string;
  factors: RiskFactor[];
}

export interface RouteLeg {
  from_coord: [number, number];
  to_coord: [number, number];
  distance_km: number;
  travel_time_hrs: number;
  ice_concentration: number;
  risk: number;
}

export interface Route {
  route_id: string;
  name: string;
  badge: string;
  description: string;
  objective_type: string;
  color: string;
  coordinates: [number, number][];
  total_distance_km: number;
  total_distance_nm: number;
  estimated_travel_time_hours: number;
  estimated_fuel_liters: number;
  navigation_risk_score: number;
  hazard_intersections: number;
  max_sea_ice_exposure_percent: number;
  min_iceberg_distance_km: number;
  is_recommended?: boolean;
  legs?: RouteLeg[];
}

export interface AIExplanation {
  summary: string;
  risk_reduction_percent: number;
  fuel_saving_percent: number;
  distance_penalty_percent: number;
  iceberg_conflicts: number;
  justification_bullets: string[];
}

export interface PipelineStep {
  step_number: number;
  title: string;
  status: string;
  summary: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  category: "Iceberg" | "Sea-Ice" | "Weather" | "Route Optimization";
  severity: "CRITICAL" | "WARNING" | "INFO" | "SUCCESS";
  title: string;
  message: string;
  timestamp: string;
  location: string;
  action: string;
}

export interface DynamicRecalculationData {
  alert: Alert;
  previous_route: {
    name: string;
    risk_score: number;
    risk_tier: string;
    fuel_liters: number;
    travel_time_hours: number;
    hazard_intersections: number;
    hazard_description: string;
  };
  recalculated_route: {
    name: string;
    is_recommended: boolean;
    risk_score: number;
    risk_tier: string;
    fuel_liters: number;
    travel_time_hours: number;
    hazard_intersections: number;
    risk_reduction_percent: number;
    fuel_penalty_percent: number;
    coordinates: [number, number][];
    ai_justification: string;
  };
  tracked_icebergs: Iceberg[];
}

export interface SimulationResponse {
  vessel: Vessel;
  destination: Station;
  environmental_data: EnvironmentalCell;
  sea_ice_forecast: SeaIceForecast;
  tracked_icebergs: Iceberg[];
  navigation_risk: RiskAssessment;
  routing: {
    routes: {
      route_a: Route;
      route_b: Route;
      route_c: Route;
    };
    recommended_route_id: string;
    ai_explanation: AIExplanation;
  };
  pipeline_steps: PipelineStep[];
  dynamic_hazard_active: boolean;
}
