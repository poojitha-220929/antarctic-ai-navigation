"""
FastAPI Route Definitions for the Antarctic AI Navigation Decision Support System.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from backend.data.generator import (
    generate_environmental_grid,
    generate_environmental_cell,
    METADATA_SPEC
)
from backend.models.sea_ice_model import sea_ice_forecaster
from backend.models.iceberg_tracker import iceberg_tracker
from backend.services.risk_engine import risk_engine
from backend.services.route_optimizer import route_optimizer
from backend.services.simulation_service import simulation_service

router = APIRouter(prefix="/api", tags=["Antarctic Decision Support"])

# Pydantic Schemas
class RiskAnalysisRequest(BaseModel):
    latitude: float = Field(-62.0, description="Vessel or waypoint latitude")
    longitude: float = Field(-62.0, description="Vessel or waypoint longitude")
    vessel_speed_knots: Optional[float] = 12.0
    nearest_iceberg_dist_km: Optional[float] = None
    trajectory_conflict: Optional[bool] = False

class RouteOptimizeRequest(BaseModel):
    vessel_id: str = Field("polarstern", description="ID of research vessel")
    destination_id: str = Field("palmer", description="ID of destination station")
    objective: Optional[str] = Field("balanced", description="'safest', 'fuel_efficient', or 'balanced'")
    custom_origin: Optional[Dict[str, float]] = None

class SimulationRunRequest(BaseModel):
    vessel_id: Optional[str] = "polarstern"
    destination_id: Optional[str] = "palmer"

# Endpoints
@router.get("/environment")
def get_environment_data(step: float = Query(1.5, ge=0.5, le=3.0, description="Spatial resolution in degrees")):
    """Returns the regional environmental grid (SST, air temp, wind, current, wave height)."""
    grid = generate_environmental_grid(step=step)
    return {
        "metadata": METADATA_SPEC,
        "grid_count": len(grid),
        "grid": grid
    }

@router.get("/sea-ice/current")
def get_current_sea_ice(lat: Optional[float] = None, lon: Optional[float] = None):
    """Returns current sea-ice concentration map and optional point reading."""
    if lat is not None and lon is not None:
        cell = generate_environmental_cell(lat, lon, None)
        return {"point_reading": cell}

    grid = generate_environmental_grid(step=1.0)
    ice_grid = [
        {
            "latitude": c["latitude"],
            "longitude": c["longitude"],
            "sea_ice_concentration": c["sea_ice_concentration"],
            "sea_surface_temperature": c["sea_surface_temperature"]
        }
        for c in grid
    ]
    return {
        "metadata": METADATA_SPEC,
        "grid": ice_grid
    }

@router.get("/sea-ice/forecast")
def get_sea_ice_forecast(
    lat: float = Query(-63.5, description="Latitude"),
    lon: float = Query(-62.0, description="Longitude")
):
    """Returns AI ML forecasted sea-ice concentrations for +6h, +12h, +24h, +48h."""
    cell = generate_environmental_cell(lat, lon, None)
    forecast = sea_ice_forecaster.predict_point(cell)
    return {
        "location": {"latitude": lat, "longitude": lon},
        "environmental_conditions": cell,
        "forecast_results": forecast,
        "model_architecture": "RandomForestRegressor Ensemble (Scikit-Learn)",
        "explainability_feature_importances": sea_ice_forecaster.get_feature_importances()
    }

@router.get("/icebergs")
def get_icebergs(
    vessel_lat: float = Query(-60.85, description="Vessel latitude for relative range"),
    vessel_lon: float = Query(-63.50, description="Vessel longitude for relative range")
):
    """Returns all active icebergs with movement vectors, size, and distance from vessel."""
    icebergs = iceberg_tracker.get_all_icebergs_with_status(vessel_lat, vessel_lon)
    return {
        "count": len(icebergs),
        "vessel_reference": {"latitude": vessel_lat, "longitude": vessel_lon},
        "icebergs": icebergs
    }

@router.get("/icebergs/{iceberg_id}/trajectory")
def get_iceberg_trajectory(iceberg_id: str):
    """Returns trajectory predictions for +6h, +12h, +24h, +48h with Kalman uncertainty ellipses."""
    try:
        traj = iceberg_tracker.predict_trajectory(iceberg_id)
        return traj
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/risk/analyze")
def analyze_risk(req: RiskAnalysisRequest):
    """Evaluates composite navigation risk score (0-100) and factor breakdowns."""
    cell = generate_environmental_cell(req.latitude, req.longitude, None)
    dist = req.nearest_iceberg_dist_km if req.nearest_iceberg_dist_km is not None else 50.0

    result = risk_engine.calculate_risk(
        cell,
        nearest_iceberg_dist_km=dist,
        iceberg_trajectory_conflict=req.trajectory_conflict,
        vessel_speed_knots=req.vessel_speed_knots
    )
    return {
        "location": {"latitude": req.latitude, "longitude": req.longitude},
        "environmental_factors": cell,
        "risk_assessment": result
    }

@router.post("/route/optimize")
def optimize_route(req: RouteOptimizeRequest):
    """Calculates Route A (Safest), Route B (Fuel-Efficient), and Route C (AI Recommended Balanced)."""
    vessels = {v["id"]: v for v in simulation_service.get_vessels()}
    stations = {s["id"]: s for s in simulation_service.get_stations()}

    vessel = vessels.get(req.vessel_id, list(vessels.values())[0])
    destination = stations.get(req.destination_id, stations["palmer"])

    origin = req.custom_origin or vessel["current_location"]
    dest_coords = {"latitude": destination["latitude"], "longitude": destination["longitude"]}

    tracked_bergs = iceberg_tracker.get_all_icebergs_with_status(origin["latitude"], origin["longitude"])

    routing = route_optimizer.generate_candidate_routes(
        origin=origin,
        destination=dest_coords,
        vessel=vessel,
        active_icebergs=tracked_bergs,
        destination_id=req.destination_id
    )

    return {
        "vessel": vessel,
        "destination": destination,
        "routing_results": routing
    }

@router.get("/alerts")
def get_alerts(vessel_id: str = "polarstern"):
    """Returns operational early warnings and hazard notifications."""
    alerts = simulation_service.get_system_alerts(vessel_id)
    return {
        "count": len(alerts),
        "alerts": alerts
    }

@router.post("/simulation/run")
def run_simulation(req: SimulationRunRequest):
    """Executes the full 8-step AI decision support pipeline."""
    result = simulation_service.run_full_pipeline(req.vessel_id, req.destination_id)
    return result

@router.post("/simulation/hazard-drift")
def trigger_hazard_drift(req: SimulationRunRequest):
    """Simulates an iceberg moving into the vessel corridor and dynamically recalculates the route."""
    result = simulation_service.trigger_dynamic_hazard(req.vessel_id, req.destination_id)
    return result

@router.post("/simulation/reset")
def reset_simulation():
    """Resets the simulation to nominal baseline."""
    return simulation_service.reset_simulation()

@router.get("/models/info")
def get_models_info():
    """Returns AI/ML model architecture specs, metrics, and Explainable AI feature importances."""
    return {
        "sea_ice_model": {
            "name": "Antarctic Ensemble Sea-Ice Forecaster",
            "type": "RandomForestRegressor (Multi-Horizon)",
            "horizons": ["+6h", "+12h", "+24h", "+48h"],
            "metrics": sea_ice_forecaster.metrics,
            "feature_importances": sea_ice_forecaster.get_feature_importances(),
            "explainability_summary": "Top predictive drivers are Sea Surface Temperature (SST), historic ice persistence, and southerly wind advection."
        },
        "iceberg_drift_model": {
            "name": "Hydrodynamic Wind-Leeway & Coriolis Drift Model",
            "type": "Physics-Informed Kalman Filter",
            "coriolis_deflection": "Left-hand deflection in Southern Ocean (approx 25°)",
            "underwater_draft_ratio": "0.75 - 0.88 current dominance",
            "wind_leeway_ratio": "0.018 - 0.022 wind speed"
        },
        "route_optimizer_model": {
            "name": "Multi-Objective Antarctic Grid/Graph Pathfinder",
            "cost_function": "Cost = alpha * Risk + beta * Fuel + gamma * Time",
            "objectives": {
                "safest": {"alpha": 0.65, "beta": 0.15, "gamma": 0.20},
                "fuel_efficient": {"alpha": 0.15, "beta": 0.65, "gamma": 0.20},
                "balanced": {"alpha": 0.40, "beta": 0.35, "gamma": 0.25}
            }
        },
        "data_ingestion_schema": METADATA_SPEC
    }

@router.get("/vessels")
def list_vessels():
    """Returns list of configured Antarctic research vessels."""
    return simulation_service.get_vessels()

@router.get("/stations")
def list_stations():
    """Returns list of Antarctic research stations and ports."""
    return simulation_service.get_stations()
