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

// Static Initial Metadata Data
export const VESSELS_DATA: Vessel[] = [
  {
    id: "polarstern",
    name: "R/V Polarstern",
    operator: "Alfred Wegener Institute (Germany)",
    ice_class: "Polar Class 3 (PC3)",
    length_m: 118,
    beam_m: 25,
    max_speed_knots: 16.0,
    cruise_speed_knots: 12.0,
    fuel_capacity_liters: 2800000,
    current_fuel_liters: 2150000,
    avg_fuel_consumption_l_per_hr: 240,
    ice_fuel_multiplier: 1.95,
    current_location: {
      latitude: -60.85,
      longitude: -63.50,
      heading_degrees: 175,
      speed_knots: 11.4
    },
    default_destination_id: "palmer"
  },
  {
    id: "attenborough",
    name: "R/V Sir David Attenborough",
    operator: "British Antarctic Survey (UK)",
    ice_class: "Polar Class 4 (PC4)",
    length_m: 128,
    beam_m: 24,
    max_speed_knots: 17.5,
    cruise_speed_knots: 13.0,
    fuel_capacity_liters: 3200000,
    current_fuel_liters: 2680000,
    avg_fuel_consumption_l_per_hr: 220,
    ice_fuel_multiplier: 1.85,
    current_location: {
      latitude: -61.20,
      longitude: -59.40,
      heading_degrees: 190,
      speed_knots: 12.2
    },
    default_destination_id: "rothera"
  },
  {
    id: "gould",
    name: "R/V Laurence M. Gould",
    operator: "National Science Foundation (USA)",
    ice_class: "ABS A1 Icebreaker",
    length_m: 76,
    beam_m: 14,
    max_speed_knots: 12.5,
    cruise_speed_knots: 10.0,
    fuel_capacity_liters: 1400000,
    current_fuel_liters: 1020000,
    avg_fuel_consumption_l_per_hr: 175,
    ice_fuel_multiplier: 2.2,
    current_location: {
      latitude: -59.70,
      longitude: -62.10,
      heading_degrees: 168,
      speed_knots: 9.8
    },
    default_destination_id: "palmer"
  },
  {
    id: "bharati_support",
    name: "R/V Bharati Polar Support",
    operator: "National Centre for Polar and Ocean Research (India)",
    ice_class: "Ice Class 1A Super",
    length_m: 105,
    beam_m: 20,
    max_speed_knots: 14.5,
    cruise_speed_knots: 11.5,
    fuel_capacity_liters: 2200000,
    current_fuel_liters: 1850000,
    avg_fuel_consumption_l_per_hr: 205,
    ice_fuel_multiplier: 2.05,
    current_location: {
      latitude: -61.50,
      longitude: -61.20,
      heading_degrees: 182,
      speed_knots: 10.8
    },
    default_destination_id: "esperanza"
  }
];

export const STATIONS_DATA: Station[] = [
  {
    id: "ushuaia",
    name: "Port of Ushuaia",
    country: "Argentina",
    type: "Port of Departure",
    latitude: -54.8072,
    longitude: -68.3044,
    description: "Gateway port to Antarctica on the Beagle Channel, Tierra del Fuego."
  },
  {
    id: "punta_arenas",
    name: "Punta Arenas",
    country: "Chile",
    type: "Port of Departure",
    latitude: -53.1638,
    longitude: -70.9171,
    description: "Major deepwater port on the Strait of Magellan serving Antarctic expeditions."
  },
  {
    id: "king_george",
    name: "King George Island Base Hub",
    country: "International (Chile/Russia/Uruguay)",
    type: "Research Station",
    latitude: -62.1974,
    longitude: -58.9632,
    description: "South Shetland Islands hub hosting Eduardo Frei, Bellingshausen, and Escudero stations."
  },
  {
    id: "esperanza",
    name: "Esperanza Base",
    country: "Argentina",
    type: "Research Station",
    latitude: -63.3978,
    longitude: -56.9989,
    description: "Located at Hope Bay, Trinity Peninsula. High historical ice drift zone."
  },
  {
    id: "marambio",
    name: "Marambio Base",
    country: "Argentina",
    type: "Research Station",
    latitude: -64.2411,
    longitude: -56.6267,
    description: "Seymour Island station on the northwestern Weddell Sea."
  },
  {
    id: "palmer",
    name: "Palmer Station",
    country: "United States",
    type: "Research Station",
    latitude: -64.7744,
    longitude: -64.0531,
    description: "Anvers Island marine biology research hub, protected natural harbor."
  },
  {
    id: "vernadsky",
    name: "Vernadsky Station",
    country: "Ukraine",
    type: "Research Station",
    latitude: -65.2458,
    longitude: -64.2575,
    description: "Marina Point on Galindez Island in the Argentine Islands archipelago."
  },
  {
    id: "rothera",
    name: "Rothera Research Station",
    country: "United Kingdom (BAS)",
    type: "Research Station",
    latitude: -67.5700,
    longitude: -68.1250,
    description: "Adelaide Island deep Antarctic research hub with crushed-rock runway and wharf."
  },
  {
    id: "san_martin",
    name: "San Martín Base",
    country: "Argentina",
    type: "Research Station",
    latitude: -68.1300,
    longitude: -67.1000,
    description: "Marguerite Bay deep peninsula base surrounded by perennial multi-year pack ice."
  }
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function generateCell(lat: number, lon: number): EnvironmentalCell {
  const southness = Math.max(0, Math.min(1, (Math.abs(lat) - 55.0) / 15.0));
  const isWeddell = lon >= -60.0 ? 1.0 : 0.0;
  const weddellFactor = isWeddell * (0.2 + 0.3 * ((lon - -60.0) / 15.0));

  const baseSst = 2.5 - 4.3 * southness - 0.8 * weddellFactor;
  const sst = Math.max(-1.85, Math.min(4.5, baseSst + (Math.sin(lat * 10) * 0.1)));
  const baseAir = 2.0 - 18.0 * southness - 3.0 * weddellFactor;
  const airTemp = Math.max(-30.0, Math.min(5.0, baseAir + (Math.cos(lon * 5) * 0.4)));

  let iceConc = 0;
  if (sst < -0.8) {
    const potential = Math.pow((-0.8 - sst) / 1.05, 1.3);
    iceConc = Math.max(0, Math.min(98, potential * 65 + southness * 35 + weddellFactor * 25));
  }

  const windSpd = Math.max(5, Math.min(55, 22.0 + 12.0 * Math.sin((Math.abs(lat) - 55.0) * Math.PI / 7.0)));
  const windDir = (270.0 - 40.0 * weddellFactor + 360.0) % 360;
  const currSpd = isWeddell ? 0.6 : 1.2;
  const currDir = isWeddell ? 320.0 : 65.0;
  const waveHeight = Math.max(0.2, (2.5 + (windSpd / 10.0) * 0.9) * Math.max(0.05, 1.0 - iceConc / 70.0));
  const pres = Math.max(940, Math.min(1030, 985.0 - 8.0 * Math.sin(lat * 0.2)));

  return {
    timestamp: new Date().toISOString(),
    latitude: Number(lat.toFixed(2)),
    longitude: Number(lon.toFixed(2)),
    sea_ice_concentration: Number(iceConc.toFixed(1)),
    sea_surface_temperature: Number(sst.toFixed(2)),
    air_temperature: Number(airTemp.toFixed(2)),
    wind_speed: Number(windSpd.toFixed(1)),
    wind_direction: Number(windDir.toFixed(1)),
    ocean_current_speed: Number(currSpd.toFixed(2)),
    ocean_current_direction: Number(currDir.toFixed(1)),
    wave_height: Number(waveHeight.toFixed(2)),
    atmospheric_pressure: Number(pres.toFixed(1)),
    visibility_km: 18.5
  };
}

let isHazardInjected = false;

export const offlineEngine = {
  getVessels(): Vessel[] {
    return VESSELS_DATA;
  },

  getStations(): Station[] {
    return STATIONS_DATA;
  },

  getEnvironment(): { metadata: any; grid: EnvironmentalCell[] } {
    const grid: EnvironmentalCell[] = [];
    for (let lat = -70; lat <= -55; lat += 1.5) {
      for (let lon = -75; lon <= -45; lon += 1.5) {
        grid.push(generateCell(lat, lon));
      }
    }
    return {
      metadata: {
        dataset_source: "OFFLINE_CLIENT_ANTARCTIC_ENGINE",
        is_synthetic: true,
        mode: "OFFLINE_EMBEDDED"
      },
      grid
    };
  },

  getSeaIceForecast(lat: number, lon: number) {
    const cell = generateCell(lat, lon);
    const curIce = cell.sea_ice_concentration;

    const f6h = Math.min(100, Math.max(0, curIce * 1.04 + 0.5));
    const f12h = Math.min(100, Math.max(0, curIce * 1.10 + 1.2));
    const f24h = Math.min(100, Math.max(0, curIce * 1.22 + 2.5));
    const f48h = Math.min(100, Math.max(0, curIce * 1.35 + 4.0));

    return {
      environmental_conditions: cell,
      forecast_results: {
        current_concentration_percent: Number(curIce.toFixed(1)),
        current_risk_level: curIce < 30 ? "Low" : curIce < 60 ? "Medium" : "High",
        forecasts: {
          "+6h": { horizon: "+6h", concentration_percent: Number(f6h.toFixed(1)), delta_from_current: Number((f6h - curIce).toFixed(1)), risk_level: f6h < 30 ? "Low" : f6h < 60 ? "Medium" : "High", confidence_percent: 96.5 },
          "+12h": { horizon: "+12h", concentration_percent: Number(f12h.toFixed(1)), delta_from_current: Number((f12h - curIce).toFixed(1)), risk_level: f12h < 30 ? "Low" : f12h < 60 ? "Medium" : "High", confidence_percent: 94.8 },
          "+24h": { horizon: "+24h", concentration_percent: Number(f24h.toFixed(1)), delta_from_current: Number((f24h - curIce).toFixed(1)), risk_level: f24h < 30 ? "Low" : f24h < 60 ? "High" : "Critical", confidence_percent: 91.2 },
          "+48h": { horizon: "+48h", concentration_percent: Number(f48h.toFixed(1)), delta_from_current: Number((f48h - curIce).toFixed(1)), risk_level: f48h < 30 ? "Low" : f48h < 60 ? "High" : "Critical", confidence_percent: 86.4 }
        }
      },
      explainability_feature_importances: [
        { feature: "sea_surface_temperature", label: "Sea Surface Temperature (SST)", importance: 38.4 },
        { feature: "sea_ice_concentration_current", label: "Current Ice Persistence", importance: 25.1 },
        { feature: "air_temperature", label: "Air Temperature", importance: 16.2 },
        { feature: "latitude", label: "Latitude (Southness Polar Gradient)", importance: 11.8 },
        { feature: "wind_speed", label: "Wind Stress Velocity", importance: 8.5 }
      ]
    };
  },

  getIcebergs(vesselLat: number, vesselLon: number): Iceberg[] {
    const rawIcebergs: Array<{
      id: string;
      name: string;
      type: string;
      size_class: string;
      length_km: number;
      width_km: number;
      freeboard_m: number;
      draft_m: number;
      latitude: number;
      longitude: number;
      speed_knots: number;
      heading_degrees: number;
      detected_source: string;
      risk_level: "Low" | "Medium" | "High" | "Critical";
      collision_risk_radius_km: number;
    }> = [
      {
        id: "A-102",
        name: "Tabular Iceberg A-102",
        type: "Tabular",
        size_class: "Large",
        length_km: 18.5,
        width_km: 8.2,
        freeboard_m: 42.0,
        draft_m: 235.0,
        latitude: isHazardInjected ? Number((vesselLat - 0.75).toFixed(2)) : -62.40,
        longitude: isHazardInjected ? Number((vesselLon + 0.35).toFixed(2)) : -48.70,
        speed_knots: isHazardInjected ? 1.45 : 0.85,
        heading_degrees: isHazardInjected ? 295.0 : 315.0,
        detected_source: "Sentinel-1 SAR / NIC Catalog",
        risk_level: isHazardInjected ? "Critical" : "High",
        collision_risk_radius_km: 15.0
      },
      {
        id: "B-09F",
        name: "Iceberg B-09F (Calved Segment)",
        type: "Tabular / Deteriorating",
        size_class: "Medium",
        length_km: 6.8,
        width_km: 3.4,
        freeboard_m: 30.0,
        draft_m: 180.0,
        latitude: -63.85,
        longitude: -58.20,
        speed_knots: 1.15,
        heading_degrees: 25.0,
        detected_source: "Sentinel-2 Optical & RADARSAT",
        risk_level: "High",
        collision_risk_radius_km: 10.0
      },
      {
        id: "A-23A-FRAG",
        name: "A-23a Outflow Fragment-7",
        type: "Grounded / Calving",
        size_class: "Giant Fragment",
        length_km: 14.2,
        width_km: 6.5,
        freeboard_m: 38.0,
        draft_m: 210.0,
        latitude: -61.15,
        longitude: -52.60,
        speed_knots: 1.40,
        heading_degrees: 60.0,
        detected_source: "MODIS Aqua & SAR Ground Station",
        risk_level: "Critical",
        collision_risk_radius_km: 20.0
      },
      {
        id: "C-34",
        name: "Pinnacled Berg C-34",
        type: "Pinnacle / Bergy Bit Cluster",
        size_class: "Small / High Hazard",
        length_km: 1.8,
        width_km: 1.1,
        freeboard_m: 18.0,
        draft_m: 95.0,
        latitude: -64.50,
        longitude: -63.20,
        speed_knots: 0.65,
        heading_degrees: 210.0,
        detected_source: "Marine Radar & Patrol Helicopter",
        risk_level: "Medium",
        collision_risk_radius_km: 6.0
      }
    ];

    return rawIcebergs.map((b) => {
      const distKm = haversineKm(vesselLat, vesselLon, b.latitude, b.longitude);
      const distNm = distKm / 1.852;
      const traj: TrajectoryPoint[] = [
        { hour: 0, horizon: "Now", latitude: b.latitude, longitude: b.longitude, drift_speed_knots: b.speed_knots, heading_degrees: b.heading_degrees, uncertainty_radius_km: 0.5 },
        { hour: 6, horizon: "+6h", latitude: Number((b.latitude + 0.05).toFixed(3)), longitude: Number((b.longitude - 0.06).toFixed(3)), drift_speed_knots: b.speed_knots, heading_degrees: b.heading_degrees, uncertainty_radius_km: 3.7 },
        { hour: 12, horizon: "+12h", latitude: Number((b.latitude + 0.12).toFixed(3)), longitude: Number((b.longitude - 0.15).toFixed(3)), drift_speed_knots: b.speed_knots, heading_degrees: b.heading_degrees, uncertainty_radius_km: 6.2 },
        { hour: 24, horizon: "+24h", latitude: Number((b.latitude + 0.28).toFixed(3)), longitude: Number((b.longitude - 0.32).toFixed(3)), drift_speed_knots: b.speed_knots, heading_degrees: b.heading_degrees, uncertainty_radius_km: 11.3 },
        { hour: 48, horizon: "+48h", latitude: Number((b.latitude + 0.60).toFixed(3)), longitude: Number((b.longitude - 0.70).toFixed(3)), drift_speed_knots: b.speed_knots, heading_degrees: b.heading_degrees, uncertainty_radius_km: 21.4 }
      ];

      return {
        ...b,
        distance_km: Number(distKm.toFixed(1)),
        distance_nm: Number(distNm.toFixed(1)),
        bearing_degrees: 215.0,
        trajectory: traj
      };
    }).sort((a, b) => a.distance_km - b.distance_km);
  },

  analyzeRisk(params: any): { risk_assessment: RiskAssessment } {
    const isConflict = params.trajectory_conflict || isHazardInjected;
    const score = isConflict ? 78.5 : 24.5;
    return {
      risk_assessment: {
        risk_score: score,
        risk_tier: isConflict ? "High" : "Low",
        recommendation: isConflict
          ? "EMERGENCY: Immediate detour required. Iceberg trajectory conflict detected."
          : "Maintain planned cruise speed. Standard polar bridge watch.",
        factors: [
          { name: "Sea-Ice Concentration", points: 8.5, description: "Moderate open pack ice in sector", severity: "low" },
          { name: "Iceberg Proximity / Trajectory Conflict", points: isConflict ? 32.0 : 5.0, description: isConflict ? "Iceberg trajectory intersects navigation route" : "No immediate iceberg conflict", severity: isConflict ? "critical" : "low" },
          { name: "Wind Velocity & Superstructure Icing", points: 4.0, description: "Fresh breeze (22 kts)", severity: "low" },
          { name: "Wave Swell & Dynamic Roll", points: 3.5, description: "Moderate sea state (2.2m waves)", severity: "low" },
          { name: "Ocean Current Shear", points: 3.5, description: "ACC drift flow at 1.2 kts", severity: "low" }
        ]
      }
    };
  },

  optimizeRoute(params: any) {
    const destId = params.destination_id || "palmer";
    const dest = STATIONS_DATA.find((s) => s.id === destId) || STATIONS_DATA[5];
    const vessel = VESSELS_DATA.find((v) => v.id === params.vessel_id) || VESSELS_DATA[0];

    const o: [number, number] = [vessel.current_location.latitude, vessel.current_location.longitude];
    const d: [number, number] = [dest.latitude, dest.longitude];

    const route_a: Route = {
      route_id: "route_a",
      name: "Route A — Safest Passage",
      badge: "SAFEST",
      color: "#38bdf8",
      objective_type: "safest",
      description: "Wide offshore arc skirting pack ice margins.",
      coordinates: [o, [-61.5, -65.2], [-62.6, -65.9], [-63.7, -65.6], d],
      total_distance_km: 588.4,
      total_distance_nm: 317.7,
      estimated_travel_time_hours: 39.2,
      estimated_fuel_liters: 9400,
      navigation_risk_score: 18.5,
      hazard_intersections: 0,
      max_sea_ice_exposure_percent: 15.0,
      min_iceberg_distance_km: 42.0,
      is_recommended: false,
      legs: []
    };

    const route_b: Route = {
      route_id: "route_b",
      name: "Route B — Direct Fuel-Saver",
      badge: "FUEL EFFICIENT",
      color: "#fbbf24",
      objective_type: "fuel_efficient",
      description: "Direct navigational track through inside passage.",
      coordinates: [o, [-61.8, -62.4], [-62.9, -62.1], [-63.8, -62.5], d],
      total_distance_km: 512.2,
      total_distance_nm: 276.5,
      estimated_travel_time_hours: 34.1,
      estimated_fuel_liters: 8180,
      navigation_risk_score: 48.2,
      hazard_intersections: isHazardInjected ? 1 : 0,
      max_sea_ice_exposure_percent: 45.0,
      min_iceberg_distance_km: 12.0,
      is_recommended: false,
      legs: []
    };

    const route_c: Route = {
      route_id: "route_c",
      name: "Route C — AI Recommended Balanced",
      badge: "AI RECOMMENDED",
      color: "#10b981",
      objective_type: "balanced",
      description: "Optimal Pareto trade-off between safety and fuel efficiency.",
      coordinates: [o, [-61.6, -64.1], [-62.7, -64.5], [-63.75, -64.2], d],
      total_distance_km: 542.1,
      total_distance_nm: 292.7,
      estimated_travel_time_hours: 36.1,
      estimated_fuel_liters: 8350,
      navigation_risk_score: 22.5,
      hazard_intersections: 0,
      max_sea_ice_exposure_percent: 22.0,
      min_iceberg_distance_km: 34.0,
      is_recommended: true,
      legs: []
    };

    const ai_explanation: AIExplanation = {
      summary: "Route C selected as optimal Pareto decision support choice.",
      risk_reduction_percent: 53.3,
      fuel_saving_percent: 11.2,
      distance_penalty_percent: 5.8,
      iceberg_conflicts: 0,
      justification_bullets: [
        "53.3% lower risk score than direct fuel-saver route",
        "11.2% lower fuel burn than safest offshore detour",
        "0 predicted intersections with active iceberg drift cones",
        "Optimal balance between distance and pack-ice clearance"
      ]
    };

    return {
      vessel,
      destination: dest,
      routing_results: {
        routes: { route_a, route_b, route_c },
        recommended_route_id: "route_c",
        ai_explanation
      }
    };
  },

  getAlerts(): Alert[] {
    return [
      {
        id: "ALT_01",
        category: "Iceberg",
        severity: isHazardInjected ? "CRITICAL" : "WARNING",
        title: isHazardInjected ? "⚠ ROUTE HAZARD DETECTED" : "Iceberg Trajectory Monitor",
        message: isHazardInjected
          ? "Iceberg A-102 projected drift intersects current navigation corridor within 12h."
          : "Large tabular iceberg A-102 detected 28 km NE of primary route corridor.",
        timestamp: new Date().toISOString(),
        location: "62.40°S, 48.70°W",
        action: isHazardInjected ? "Execute AI Evasion Route immediately." : "Inspect radar return."
      },
      {
        id: "ALT_02",
        category: "Sea-Ice",
        severity: "WARNING",
        title: "Pack-Ice Consolidation",
        message: "Sea-ice concentration expected to exceed 60% in Weddell interface.",
        timestamp: new Date().toISOString(),
        location: "63.20°S, 57.50°W",
        action: "Maintain speed to prevent entrapment."
      }
    ];
  },

  runSimulation(vesselId: string, destId: string): SimulationResponse {
    const opt = this.optimizeRoute({ vessel_id: vesselId, destination_id: destId });
    const ice = this.getSeaIceForecast(-63.5, -62.0);
    const bergs = this.getIcebergs(-60.85, -63.50);
    const risk = this.analyzeRisk({});

    return {
      vessel: opt.vessel,
      destination: opt.destination,
      environmental_data: ice.environmental_conditions,
      sea_ice_forecast: ice.forecast_results,
      tracked_icebergs: bergs,
      navigation_risk: risk.risk_assessment,
      routing: opt.routing_results,
      pipeline_steps: [
        { step_number: 1, title: "Environmental Data Ingestion", status: "COMPLETED", summary: "Ingested satellite & ocean telemetry.", timestamp: new Date().toISOString() },
        { step_number: 2, title: "AI Sea-Ice Forecasting", status: "COMPLETED", summary: "Projected sea ice across +6h to +48h horizons.", timestamp: new Date().toISOString() },
        { step_number: 3, title: "Iceberg Radar Detection", status: "COMPLETED", summary: `Tracked ${bergs.length} active icebergs.`, timestamp: new Date().toISOString() },
        { step_number: 4, title: "Kalman Drift Modeling", status: "COMPLETED", summary: "Calculated Coriolis deflection vectors.", timestamp: new Date().toISOString() },
        { step_number: 5, title: "Navigation Risk Scoring", status: "COMPLETED", summary: "Scored composite operational risk.", timestamp: new Date().toISOString() },
        { step_number: 6, title: "Candidate Route Generation", status: "COMPLETED", summary: "Evaluated Routes A, B, and C.", timestamp: new Date().toISOString() },
        { step_number: 7, title: "Multi-Objective Cost Optimization", status: "COMPLETED", summary: "Optimized risk vs fuel trade-offs.", timestamp: new Date().toISOString() },
        { step_number: 8, title: "AI Decision Support Delivery", status: "COMPLETED", summary: "Recommended Route C for optimal safety.", timestamp: new Date().toISOString() }
      ],
      dynamic_hazard_active: isHazardInjected
    };
  },

  triggerHazardDrift(vesselId: string, destId: string): DynamicRecalculationData {
    isHazardInjected = true;
    const bergs = this.getIcebergs(-60.85, -63.50);

    return {
      alert: {
        id: "ALERT_DYN_001",
        category: "Iceberg",
        severity: "CRITICAL",
        title: "⚠ ROUTE HAZARD DETECTED",
        message: "Predicted iceberg A-102 trajectory intersects current navigation route in approximately 12 hours.",
        timestamp: new Date().toISOString(),
        location: "61.60°S, 63.15°W",
        action: "Execute AI Evasion Route immediately. Steering 1.4° West."
      },
      previous_route: {
        name: "Previous Planned Route (Compromised)",
        risk_score: 78.5,
        risk_tier: "High",
        fuel_liters: 7950,
        travel_time_hours: 36.2,
        hazard_intersections: 1,
        hazard_description: "Iceberg A-102 trajectory intersects waypoint WP-3."
      },
      recalculated_route: {
        name: "Dynamic AI Evasion Route (Recalculated)",
        is_recommended: true,
        risk_score: 24.0,
        risk_tier: "Low",
        fuel_liters: 8280,
        travel_time_hours: 37.8,
        hazard_intersections: 0,
        risk_reduction_percent: 69.4,
        fuel_penalty_percent: 4.1,
        coordinates: [
          [-60.85, -63.50],
          [-61.65, -65.50],
          [-62.85, -66.10],
          [-63.90, -65.80],
          [-64.55, -64.60],
          [-64.77, -64.05]
        ],
        ai_justification: "Diverts 18 nautical miles westward around the A-102 drift cone, completely eliminating collision probability while maintaining acceptable fuel margin (+4.1%)."
      },
      tracked_icebergs: bergs
    };
  },

  resetSimulation() {
    isHazardInjected = false;
    return { status: "Simulation reset to nominal baseline" };
  },

  getModelsInfo() {
    return {
      sea_ice_model: {
        name: "Antarctic Ensemble Sea-Ice Forecaster",
        type: "RandomForestRegressor (Multi-Horizon)",
        horizons: ["+6h", "+12h", "+24h", "+48h"],
        metrics: { "+6h": { mae: 0.5, r2_score: 0.999 }, "+48h": { mae: 1.48, r2_score: 0.996 } },
        explainability_summary: "Top drivers: SST (38.4%), Ice Persistence (25.1%), Air Temp (16.2%)."
      },
      iceberg_drift_model: {
        name: "Hydrodynamic Wind-Leeway & Coriolis Drift Model",
        type: "Physics-Informed Kalman Filter",
        coriolis_deflection: "25° left-hand deflection",
        underwater_draft_ratio: "82% ocean current dominance"
      },
      route_optimizer_model: {
        name: "Multi-Objective Antarctic Pathfinder",
        cost_function: "Cost = alpha * Risk + beta * Fuel + gamma * Time"
      }
    };
  }
};
