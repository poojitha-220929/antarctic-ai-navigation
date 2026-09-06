"""
Automated Test Suite for the Antarctic AI Navigation Backend.
Verifies:
- Data generation sanity
- Sea-ice ML forecasting inference and metrics
- Iceberg drift physics and Coriolis trajectory prediction
- Risk engine scoring and factor extraction
- Safe & fuel-efficient route optimization
- Dynamic hazard simulation and recalculation
- FastAPI endpoint responses
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.data.generator import generate_environmental_cell, generate_environmental_grid, get_initial_icebergs
from backend.models.sea_ice_model import sea_ice_forecaster
from backend.models.iceberg_tracker import iceberg_tracker
from backend.services.risk_engine import risk_engine
from backend.services.route_optimizer import route_optimizer
from backend.services.simulation_service import simulation_service

client = TestClient(app)

def test_data_generation():
    cell = generate_environmental_cell(-63.5, -62.0, None)
    assert "sea_ice_concentration" in cell
    assert -2.0 <= cell["sea_surface_temperature"] <= 5.0
    assert 0.0 <= cell["sea_ice_concentration"] <= 100.0
    assert cell["wind_speed"] >= 0.0
    assert 0.0 <= cell["wind_direction"] <= 360.0

def test_sea_ice_model():
    assert sea_ice_forecaster.is_trained
    cell = generate_environmental_cell(-64.5, -60.0, None)
    res = sea_ice_forecaster.predict_point(cell)
    assert "forecasts" in res
    for h in ["+6h", "+12h", "+24h", "+48h"]:
        assert h in res["forecasts"]
        assert 0.0 <= res["forecasts"][h]["concentration_percent"] <= 100.0
        assert res["forecasts"][h]["confidence_percent"] >= 70.0

    importances = sea_ice_forecaster.get_feature_importances()
    assert len(importances) > 0
    assert importances[0]["importance"] > 0

def test_iceberg_tracker():
    icebergs = get_initial_icebergs()
    assert len(icebergs) >= 4
    traj = iceberg_tracker.predict_trajectory("A-102")
    assert traj["iceberg_id"] == "A-102"
    assert len(traj["trajectory"]) == 5  # Now, +6h, +12h, +24h, +48h
    # In Southern Hemisphere, Coriolis deflects to the left
    for pt in traj["trajectory"]:
        assert -75.0 <= pt["latitude"] <= -50.0

def test_risk_engine():
    low_cell = {"sea_ice_concentration": 10.0, "wind_speed": 12.0, "wave_height": 1.5, "ocean_current_speed": 0.5}
    low_res = risk_engine.calculate_risk(low_cell, nearest_iceberg_dist_km=90.0)
    assert low_res["risk_tier"] == "Low"
    assert low_res["risk_score"] <= 30.0

    high_cell = {"sea_ice_concentration": 75.0, "wind_speed": 40.0, "wave_height": 5.0, "ocean_current_speed": 1.8}
    high_res = risk_engine.calculate_risk(high_cell, nearest_iceberg_dist_km=10.0, iceberg_trajectory_conflict=True)
    assert high_res["risk_tier"] in ["High", "Critical"]
    assert high_res["risk_score"] >= 65.0

def test_route_optimizer():
    vessels = simulation_service.get_vessels()
    vessel = vessels[0]
    origin = {"latitude": -60.85, "longitude": -63.50}
    dest = {"latitude": -64.77, "longitude": -64.05}
    active_bergs = iceberg_tracker.get_all_icebergs_with_status(origin["latitude"], origin["longitude"])

    routing = route_optimizer.generate_candidate_routes(origin, dest, vessel, active_bergs)
    assert "route_a" in routing["routes"]
    assert "route_b" in routing["routes"]
    assert "route_c" in routing["routes"]
    assert routing["routes"]["route_c"]["is_recommended"] is True
    # Route C risk should be lower than Route B direct risk
    assert routing["ai_explanation"]["risk_reduction_percent"] >= 0

def test_api_endpoints():
    r1 = client.get("/api/environment")
    assert r1.status_code == 200
    assert "grid" in r1.json()

    r2 = client.get("/api/sea-ice/forecast?lat=-63.5&lon=-62.0")
    assert r2.status_code == 200
    assert "forecast_results" in r2.json()

    r3 = client.get("/api/icebergs")
    assert r3.status_code == 200
    assert r3.json()["count"] >= 4

    r4 = client.post("/api/simulation/run", json={"vessel_id": "polarstern", "destination_id": "palmer"})
    assert r4.status_code == 200
    data4 = r4.json()
    assert len(data4["pipeline_steps"]) == 8

    r5 = client.post("/api/simulation/hazard-drift", json={"vessel_id": "polarstern", "destination_id": "palmer"})
    assert r5.status_code == 200
    data5 = r5.json()
    assert data5["alert"]["severity"] == "CRITICAL"
    assert "recalculated_route" in data5
