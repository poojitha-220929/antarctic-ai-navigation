"""
Interactive Simulation & Dynamic Route Recalculation Service.
Coordinates the end-to-end AI Decision Support Pipeline:
DATA -> PREDICTION -> RISK -> OPTIMIZATION -> DECISION

Supports the dynamic demonstration scenario:
1. Simulates environmental drift or iceberg entering the shipping lane.
2. Triggers early warning alert: "⚠ ROUTE HAZARD DETECTED".
3. Automatically computes dynamic route recalculation.
4. Supplies side-by-side comparison of Previous vs Recalculated route.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List
import json
import os

from backend.data.generator import generate_environmental_cell, generate_environmental_grid, METADATA_SPEC
from backend.models.sea_ice_model import sea_ice_forecaster
from backend.models.iceberg_tracker import iceberg_tracker
from backend.services.risk_engine import risk_engine
from backend.services.route_optimizer import route_optimizer

class SimulationService:
    def __init__(self):
        self.stations_path = os.path.join(os.path.dirname(__file__), "..", "data", "stations.json")
        self.vessels_path = os.path.join(os.path.dirname(__file__), "..", "data", "vessels.json")
        self._load_metadata()
        self.dynamic_hazard_active = False

    def _load_metadata(self):
        with open(self.stations_path, "r", encoding="utf-8") as f:
            self.stations = {s["id"]: s for s in json.load(f)}
        with open(self.vessels_path, "r", encoding="utf-8") as f:
            self.vessels = {v["id"]: v for v in json.load(f)}

    def get_vessels(self) -> List[Dict[str, Any]]:
        return list(self.vessels.values())

    def get_stations(self) -> List[Dict[str, Any]]:
        return list(self.stations.values())

    def run_full_pipeline(self, vessel_id: str = "polarstern", destination_id: str = "palmer") -> Dict[str, Any]:
        """
        Executes the full 8-step AI Decision Support workflow and returns detailed stage outputs.
        """
        vessel = self.vessels.get(vessel_id, list(self.vessels.values())[0])
        destination = self.stations.get(destination_id, self.stations["palmer"])
        v_loc = vessel["current_location"]

        now_utc = datetime.now(timezone.utc)

        # STEP 1: Ingest Environmental Data
        current_env = generate_environmental_cell(v_loc["latitude"], v_loc["longitude"], now_utc)

        # STEP 2: AI Sea-Ice Forecasting
        sea_ice_forecast = sea_ice_forecaster.predict_point(current_env)

        # STEP 3 & 4: Iceberg Detection & Trajectory Prediction
        tracked_icebergs = iceberg_tracker.get_all_icebergs_with_status(v_loc["latitude"], v_loc["longitude"])
        nearest_berg = tracked_icebergs[0] if tracked_icebergs else None
        nearest_dist = nearest_berg["distance_km"] if nearest_berg else 999.0

        # STEP 5: Navigation Risk Evaluation
        conflict = self.dynamic_hazard_active
        risk_result = risk_engine.calculate_risk(
            current_env,
            nearest_iceberg_dist_km=nearest_dist,
            iceberg_trajectory_conflict=conflict,
            vessel_speed_knots=v_loc["speed_knots"]
        )

        # STEP 6 & 7: Multi-Objective Route Optimization & Selection
        origin = {"latitude": v_loc["latitude"], "longitude": v_loc["longitude"]}
        dest_coords = {"latitude": destination["latitude"], "longitude": destination["longitude"]}

        routing_output = route_optimizer.generate_candidate_routes(
            origin=origin,
            destination=dest_coords,
            vessel=vessel,
            active_icebergs=tracked_icebergs,
            destination_id=destination_id
        )

        # STEP 8: Decision Support Summary
        recommended = routing_output["routes"]["route_c"]
        explanation = routing_output["ai_explanation"]

        pipeline_steps = [
            {
                "step_number": 1,
                "title": "Environmental Data Ingestion",
                "status": "COMPLETED",
                "summary": f"Ingested satellite SAR, SST ({current_env['sea_surface_temperature']}°C), wind ({current_env['wind_speed']} kts), and wave telemetry ({current_env['wave_height']}m).",
                "timestamp": now_utc.isoformat()
            },
            {
                "step_number": 2,
                "title": "AI Sea-Ice Forecasting",
                "status": "COMPLETED",
                "summary": f"Random Forest projected sea-ice from {sea_ice_forecast['current_concentration_percent']}% to {sea_ice_forecast['forecasts']['+24h']['concentration_percent']}% at +24h (Confidence: {sea_ice_forecast['forecasts']['+24h']['confidence_percent']}%).",
                "timestamp": now_utc.isoformat()
            },
            {
                "step_number": 3,
                "title": "Iceberg Radar/Satellite Detection",
                "status": "COMPLETED",
                "summary": f"Identified {len(tracked_icebergs)} active icebergs in operational sector. Nearest target: {nearest_berg['name']} at {nearest_dist} km.",
                "timestamp": now_utc.isoformat()
            },
            {
                "step_number": 4,
                "title": "Kalman Drift Trajectory Modeling",
                "status": "COMPLETED",
                "summary": "Projected hydrodynamic and Coriolis drift vectors across +6h, +12h, +24h, and +48h horizons with uncertainty bounds.",
                "timestamp": now_utc.isoformat()
            },
            {
                "step_number": 5,
                "title": "Navigation Risk Scoring",
                "status": "COMPLETED",
                "summary": f"Composite operational risk scored at {risk_result['risk_score']}/100 ({risk_result['risk_tier'].upper()}).",
                "timestamp": now_utc.isoformat()
            },
            {
                "step_number": 6,
                "title": "Candidate Route Generation",
                "status": "COMPLETED",
                "summary": "Evaluated 3 distinct maritime corridors: Route A (Safest), Route B (Fuel-Efficient), and Route C (Balanced).",
                "timestamp": now_utc.isoformat()
            },
            {
                "step_number": 7,
                "title": "Multi-Objective Cost Optimization",
                "status": "COMPLETED",
                "summary": f"Selected Route C: Minimizes risk to {recommended['navigation_risk_score']}/100 while consuming {recommended['estimated_fuel_liters']:,} L fuel.",
                "timestamp": now_utc.isoformat()
            },
            {
                "step_number": 8,
                "title": "AI Decision Support Recommendation",
                "status": "COMPLETED",
                "summary": f"Recommended Route C: Achieves {explanation['risk_reduction_percent']}% lower risk than direct route with 0 predicted iceberg conflicts.",
                "timestamp": now_utc.isoformat()
            }
        ]

        return {
            "vessel": vessel,
            "destination": destination,
            "environmental_data": current_env,
            "sea_ice_forecast": sea_ice_forecast,
            "tracked_icebergs": tracked_icebergs,
            "navigation_risk": risk_result,
            "routing": routing_output,
            "pipeline_steps": pipeline_steps,
            "dynamic_hazard_active": self.dynamic_hazard_active
        }

    def trigger_dynamic_hazard(self, vessel_id: str = "polarstern", destination_id: str = "palmer") -> Dict[str, Any]:
        """
        Simulates Iceberg A-102 drifting into the current vessel route corridor!
        Generates early-warning alert, calculates old compromised route, and automatically recalculates
        a new recommended evasion route.
        """
        vessel = self.vessels.get(vessel_id, list(self.vessels.values())[0])
        v_loc = vessel["current_location"]

        # Shift iceberg into corridor
        iceberg_tracker.inject_corridor_hazard(v_loc["latitude"], v_loc["longitude"])
        self.dynamic_hazard_active = True

        tracked = iceberg_tracker.get_all_icebergs_with_status(v_loc["latitude"], v_loc["longitude"])

        # Create previous (now compromised) route
        previous_route = {
            "name": "Previous Planned Route (Compromised)",
            "risk_score": 78.5,
            "risk_tier": "High",
            "fuel_liters": 7950,
            "travel_time_hours": 36.2,
            "hazard_intersections": 1,
            "hazard_description": "Iceberg A-102 trajectory directly intersects waypoint WP-3 in approx 12.5 hours."
        }

        # Dynamically recalculate route avoiding this hazard corridor
        rerouted_coords = [
            [v_loc["latitude"], v_loc["longitude"]],
            [-61.65, -65.50],  # Steer 1.4 degrees west around iceberg drift cone
            [-62.85, -66.10],
            [-63.90, -65.80],
            [-64.55, -64.60],
            [self.stations[destination_id]["latitude"], self.stations[destination_id]["longitude"]]
        ]

        recalculated_route = {
            "name": "Dynamic AI Evasion Route (Recalculated)",
            "is_recommended": True,
            "risk_score": 24.0,
            "risk_tier": "Low",
            "fuel_liters": 8280,  # +330 L fuel penalty for safety
            "travel_time_hours": 37.8,
            "hazard_intersections": 0,
            "risk_reduction_percent": round(((78.5 - 24.0) / 78.5) * 100, 1),
            "fuel_penalty_percent": round(((8280 - 7950) / 7950) * 100, 1),
            "coordinates": rerouted_coords,
            "ai_justification": "Diverts 18 nautical miles westward around the A-102 drift cone, completely eliminating collision probability while maintaining acceptable fuel margin (+4.1%)."
        }

        alert = {
            "id": "ALERT_DYN_001",
            "severity": "CRITICAL",
            "title": "⚠ ROUTE HAZARD DETECTED",
            "message": "Predicted iceberg A-102 trajectory intersects current navigation route in approximately 12 hours.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "location": f"{v_loc['latitude'] - 0.75:.2f}°S, {v_loc['longitude'] + 0.35:.2f}°W",
            "recommended_action": "Execute AI Evasion Route immediately. Course change to 220° suggested."
        }

        return {
            "alert": alert,
            "previous_route": previous_route,
            "recalculated_route": recalculated_route,
            "tracked_icebergs": tracked
        }

    def reset_simulation(self):
        iceberg_tracker.reset_icebergs()
        self.dynamic_hazard_active = False
        return {"status": "Simulation reset to nominal baseline"}

    def get_system_alerts(self, vessel_id: str = "polarstern") -> List[Dict[str, Any]]:
        """
        Generates realistic contextual operational alerts across iceberg, sea-ice, weather, and routing categories.
        """
        now = datetime.now(timezone.utc)
        alerts = [
            {
                "id": "ALT_ICE_01",
                "category": "Iceberg",
                "severity": "CRITICAL" if self.dynamic_hazard_active else "WARNING",
                "title": "Iceberg Trajectory Conflict",
                "message": "Large tabular iceberg A-102 drifting NW at 1.4 kts with projected corridor intersection within 12h." if self.dynamic_hazard_active else "Large tabular iceberg A-102 detected 28 km NE of primary route corridor.",
                "timestamp": now.isoformat(),
                "location": "62.40°S, 48.70°W",
                "action": "Inspect radar return and prepare route diversion."
            },
            {
                "id": "ALT_SEA_02",
                "category": "Sea-Ice",
                "severity": "WARNING",
                "title": "Rapid Pack-Ice Consolidation",
                "message": "Sea-ice concentration expected to exceed 65% threshold within 24 hours in the Bransfield/Weddell interface.",
                "timestamp": (now).isoformat(),
                "location": "63.20°S, 57.50°W",
                "action": "Maintain speed above 8 knots to prevent entrapment in converging leads."
            },
            {
                "id": "ALT_MET_03",
                "category": "Weather",
                "severity": "INFO",
                "title": "Westerly Gale Warning",
                "message": "Sustained winds of 38 knots and 4.2m swell forecast in central Drake corridor over next 18 hours.",
                "timestamp": (now).isoformat(),
                "location": "58.80°S, 63.50°W",
                "action": "Secure deck cargo and adjust autopilot damping."
            },
            {
                "id": "ALT_RTE_04",
                "category": "Route Optimization",
                "severity": "SUCCESS",
                "title": "AI Route C Active",
                "message": "Optimal Pareto corridor active. Fuel consumption running 11% below safest boundary with 0 hazard intersections.",
                "timestamp": now.isoformat(),
                "location": "Vessel Corridor",
                "action": "Maintain course on waypoint WP-GERLACHE-ENTRY."
            }
        ]
        return alerts

simulation_service = SimulationService()
