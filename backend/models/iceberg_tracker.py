"""
Iceberg Detection & Trajectory Prediction Engine.
Combines hydrodynamic drift physics, atmospheric wind drag, Coriolis deflection (left-turning in Southern Hemisphere),
and Kalman-inspired trajectory extrapolation for +6h, +12h, +24h, and +48h forecast intervals.
"""

import math
from typing import List, Dict, Any, Tuple
from backend.data.generator import get_initial_icebergs, generate_environmental_cell

# Conversion constants
NM_TO_KM = 1.852
KM_PER_LAT_DEG = 111.32  # 1 degree lat approx 111.32 km

def get_km_per_lon_deg(lat: float) -> float:
    return 111.32 * math.cos(math.radians(lat))

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points on Earth in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class IcebergTracker:
    def __init__(self):
        self.icebergs: Dict[str, Dict[str, Any]] = {
            berg["id"]: berg for berg in get_initial_icebergs()
        }
        # Simulation override flag for dynamic demonstration scenario
        self.hazard_injected = False

    def reset_icebergs(self):
        self.icebergs = {berg["id"]: berg for berg in get_initial_icebergs()}
        self.hazard_injected = False

    def inject_corridor_hazard(self, vessel_lat: float, vessel_lon: float):
        """
        Dynamically positions or steers Iceberg A-102 into the vessel's forward corridor (~12h ahead).
        Used for the dynamic recalculation demonstration!
        """
        self.hazard_injected = True
        if "A-102" in self.icebergs:
            # Shift A-102 into the navigation corridor ~62.0S, ~61.5W
            self.icebergs["A-102"]["latitude"] = round(vessel_lat - 0.75, 2)
            self.icebergs["A-102"]["longitude"] = round(vessel_lon + 0.35, 2)
            self.icebergs["A-102"]["speed_knots"] = 1.45
            self.icebergs["A-102"]["heading_degrees"] = 295.0
            self.icebergs["A-102"]["risk_level"] = "Critical"
            self.icebergs["A-102"]["collision_risk_radius_km"] = 22.0

    def compute_drift_vector(self, berg: Dict[str, Any], env: Dict[str, Any]) -> Tuple[float, float, float]:
        """
        Computes composite drift speed (knots) and heading (degrees) using ocean current and wind leeway.
        In the Southern Hemisphere (Coriolis parameter f < 0), wind leeway is deflected ~20-30° to the LEFT of the wind.
        Deep draft (>150m) icebergs are dominated 80-85% by ocean current.
        """
        curr_spd = env["ocean_current_speed"]
        curr_dir = env["ocean_current_direction"]
        wind_spd = env["wind_speed"]
        wind_dir = env["wind_direction"]

        # Wind leeway: ~1.8% to 2.2% of wind speed
        leeway_spd = wind_spd * 0.02
        # Coriolis deflection in Southern Ocean: 25 degrees counterclockwise (to the left)
        leeway_dir = (wind_dir - 25.0) % 360.0

        # Convert both vectors to cartesian (knots)
        curr_rad = math.radians(curr_dir)
        curr_u = curr_spd * math.sin(curr_rad)
        curr_v = curr_spd * math.cos(curr_rad)

        leeway_rad = math.radians(leeway_dir)
        leeway_u = leeway_spd * math.sin(leeway_rad)
        leeway_v = leeway_spd * math.cos(leeway_rad)

        # Draft mass weighting
        draft = berg.get("draft_m", 180.0)
        draft_weight = min(0.90, max(0.65, draft / 250.0))
        wind_weight = 1.0 - draft_weight

        tot_u = (curr_u * draft_weight * 1.1) + (leeway_u * wind_weight * 2.2)
        tot_v = (curr_v * draft_weight * 1.1) + (leeway_v * wind_weight * 2.2)

        drift_spd = math.sqrt(tot_u**2 + tot_v**2)
        drift_dir = (math.degrees(math.atan2(tot_u, tot_v)) + 360.0) % 360.0

        return drift_spd, drift_dir, draft_weight

    def predict_trajectory(self, berg_id: str) -> Dict[str, Any]:
        """
        Predicts positions for +6h, +12h, +24h, and +48h horizons with uncertainty envelopes.
        """
        if berg_id not in self.icebergs:
            raise ValueError(f"Iceberg {berg_id} not found.")

        berg = self.icebergs[berg_id]
        cur_lat = berg["latitude"]
        cur_lon = berg["longitude"]

        # Initial environmental conditions at iceberg location
        env = generate_environmental_cell(cur_lat, cur_lon, None)
        drift_spd, drift_dir, draft_weight = self.compute_drift_vector(berg, env)

        horizons = [6, 12, 24, 48]
        trajectory_points = []

        running_lat = cur_lat
        running_lon = cur_lon
        prev_hour = 0

        # Trajectory point at t=0
        trajectory_points.append({
            "hour": 0,
            "horizon": "Now",
            "latitude": round(cur_lat, 3),
            "longitude": round(cur_lon, 3),
            "drift_speed_knots": round(drift_spd, 2),
            "heading_degrees": round(drift_dir, 1),
            "uncertainty_radius_km": 0.5
        })

        for h in horizons:
            dt_hours = h - prev_hour
            # Distance travelled in nautical miles and km
            dist_nm = drift_spd * dt_hours
            dist_km = dist_nm * NM_TO_KM

            # Displace coordinates
            rad = math.radians(drift_dir)
            d_north_km = dist_km * math.cos(rad)
            d_east_km = dist_km * math.sin(rad)

            d_lat = d_north_km / KM_PER_LAT_DEG
            km_lon = get_km_per_lon_deg(running_lat)
            d_lon = d_east_km / km_lon if km_lon > 10 else d_east_km / 50.0

            running_lat += d_lat
            running_lon += d_lon
            prev_hour = h

            # Re-evaluate local ocean/wind conditions at new location
            env_next = generate_environmental_cell(running_lat, running_lon, None)
            drift_spd, drift_dir, _ = self.compute_drift_vector(berg, env_next)

            # Uncertainty expands with time (Kalman state covariance growth)
            uncertainty_km = round(1.2 + (h * 0.42), 1)

            trajectory_points.append({
                "hour": h,
                "horizon": f"+{h}h",
                "latitude": round(running_lat, 3),
                "longitude": round(running_lon, 3),
                "drift_speed_knots": round(drift_spd, 2),
                "heading_degrees": round(drift_dir, 1),
                "uncertainty_radius_km": uncertainty_km
            })

        return {
            "iceberg_id": berg["id"],
            "name": berg["name"],
            "size_class": berg["size_class"],
            "draft_m": berg["draft_m"],
            "risk_level": berg["risk_level"],
            "current_position": {"latitude": cur_lat, "longitude": cur_lon},
            "trajectory": trajectory_points
        }

    def get_all_icebergs_with_status(self, vessel_lat: float, vessel_lon: float) -> List[Dict[str, Any]]:
        """
        Returns all active icebergs annotated with relative distance, bearing, and trajectory summary.
        """
        results = []
        for b_id, berg in self.icebergs.items():
            dist_km = haversine_distance_km(vessel_lat, vessel_lon, berg["latitude"], berg["longitude"])
            dist_nm = dist_km / NM_TO_KM

            # Bearing from vessel to iceberg
            d_lon = math.radians(berg["longitude"] - vessel_lon)
            y = math.sin(d_lon) * math.cos(math.radians(berg["latitude"]))
            x = (math.cos(math.radians(vessel_lat)) * math.sin(math.radians(berg["latitude"])) -
                 math.sin(math.radians(vessel_lat)) * math.cos(math.radians(berg["latitude"])) * math.cos(d_lon))
            bearing = (math.degrees(math.atan2(y, x)) + 360.0) % 360.0

            # Dynamic risk classification based on proximity & size
            if dist_km < 30.0 or (self.hazard_injected and b_id == "A-102"):
                risk_lvl = "Critical"
            elif dist_km < 65.0:
                risk_lvl = "High"
            elif dist_km < 120.0:
                risk_lvl = "Medium"
            else:
                risk_lvl = "Low"

            # Get full predicted trajectory
            traj_data = self.predict_trajectory(b_id)

            item = {
                **berg,
                "distance_km": round(dist_km, 1),
                "distance_nm": round(dist_nm, 1),
                "bearing_degrees": round(bearing, 1),
                "risk_level": risk_lvl,
                "trajectory": traj_data["trajectory"]
            }
            results.append(item)

        # Sort by distance
        results.sort(key=lambda x: x["distance_km"])
        return results

# Global singleton
iceberg_tracker = IcebergTracker()
