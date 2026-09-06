"""
Vessel Navigation Risk Engine.
Evaluates multi-variable operational environmental risks on a scale of 0 to 100:
- Sea-Ice Concentration (0-40 pts)
- Iceberg Proximity & Trajectory Intersection (0-35 pts)
- Wind Speed & Gale Forcing (0-12 pts)
- Heavy Swell & Wave Height (0-8 pts)
- Ocean Current Resistance & Drift Shear (0-5 pts)
Outputs clear factor contributions for Explainable AI (XAI) and maritime decision support.
"""

from typing import Dict, Any, List
import math

class RiskEngine:
    @staticmethod
    def calculate_risk(
        env_cell: Dict[str, Any],
        nearest_iceberg_dist_km: float = 999.0,
        iceberg_trajectory_conflict: bool = False,
        vessel_speed_knots: float = 12.0
    ) -> Dict[str, Any]:
        """
        Calculates a composite risk score (0-100) and extracts itemized factors.
        """
        factors = []
        total_score = 0.0

        ice_conc = env_cell.get("sea_ice_concentration", 0.0)
        wind_spd = env_cell.get("wind_speed", 15.0)
        wave_h = env_cell.get("wave_height", 2.0)
        curr_spd = env_cell.get("ocean_current_speed", 0.8)
        visibility = env_cell.get("visibility_km", 15.0)

        # 1. Sea-Ice Concentration Factor (0 - 40 pts)
        if ice_conc <= 15.0:
            ice_pts = (ice_conc / 15.0) * 5.0
            ice_desc = f"Open water with light bergy bits ({ice_conc:.1f}%)"
        elif ice_conc <= 40.0:
            ice_pts = 5.0 + ((ice_conc - 15.0) / 25.0) * 15.0
            ice_desc = f"Moderate open pack ice ({ice_conc:.1f}%) - ice navigation required"
        elif ice_conc <= 70.0:
            ice_pts = 20.0 + ((ice_conc - 40.0) / 30.0) * 14.0
            ice_desc = f"Dense pack ice ({ice_conc:.1f}%) - severe hull drag and compression"
        else:
            ice_pts = 34.0 + min(6.0, ((ice_conc - 70.0) / 30.0) * 6.0)
            ice_desc = f"Heavy consolidated multi-year ice ({ice_conc:.1f}%) - entrapment hazard"

        total_score += ice_pts
        factors.append({
            "name": "Sea-Ice Concentration",
            "points": round(ice_pts, 1),
            "description": ice_desc,
            "severity": "high" if ice_pts > 20 else ("medium" if ice_pts > 10 else "low")
        })

        # 2. Iceberg Proximity & Trajectory Conflict (0 - 35 pts)
        berg_pts = 0.0
        if iceberg_trajectory_conflict:
            berg_pts = 32.0
            berg_desc = "Iceberg projected trajectory intersects planned navigation route within 12-24h"
            berg_sev = "critical"
        elif nearest_iceberg_dist_km < 15.0:
            berg_pts = 28.0
            berg_desc = f"Large iceberg detected within immediate proximity ({nearest_iceberg_dist_km:.1f} km)"
            berg_sev = "critical"
        elif nearest_iceberg_dist_km < 35.0:
            berg_pts = 19.0
            berg_desc = f"Active iceberg within radar tactical perimeter ({nearest_iceberg_dist_km:.1f} km)"
            berg_sev = "high"
        elif nearest_iceberg_dist_km < 70.0:
            berg_pts = 9.0
            berg_desc = f"Iceberg presence in broader sector ({nearest_iceberg_dist_km:.1f} km)"
            berg_sev = "medium"
        else:
            berg_pts = 2.0
            berg_desc = "No major icebergs detected within 70 km corridor"
            berg_sev = "low"

        total_score += berg_pts
        factors.append({
            "name": "Iceberg Proximity / Trajectory Conflict",
            "points": round(berg_pts, 1),
            "description": berg_desc,
            "severity": berg_sev
        })

        # 3. Wind & Gale Forcing (0 - 12 pts)
        wind_pts = 0.0
        if wind_spd > 45.0:
            wind_pts = 12.0
            wind_desc = f"Storm force winds ({wind_spd:.1f} kts) - dangerous leeway drift"
            wind_sev = "high"
        elif wind_spd > 32.0:
            wind_pts = 8.5
            wind_desc = f"Gale force winds ({wind_spd:.1f} kts) - rapid sea spray icing"
            wind_sev = "medium"
        elif wind_spd > 20.0:
            wind_pts = 4.0
            wind_desc = f"Fresh to strong breeze ({wind_spd:.1f} kts)"
            wind_sev = "low"
        else:
            wind_pts = 1.0
            wind_desc = f"Gentle to moderate breeze ({wind_spd:.1f} kts)"
            wind_sev = "low"

        total_score += wind_pts
        factors.append({
            "name": "Wind Velocity & Superstructure Icing",
            "points": round(wind_pts, 1),
            "description": wind_desc,
            "severity": wind_sev
        })

        # 4. Wave Swell & Sea State (0 - 8 pts)
        wave_pts = 0.0
        if wave_h > 5.5:
            wave_pts = 8.0
            wave_desc = f"Very rough to high sea state ({wave_h:.1f}m waves)"
            wave_sev = "high"
        elif wave_h > 3.5:
            wave_pts = 5.0
            wave_desc = f"Rough sea state ({wave_h:.1f}m waves)"
            wave_sev = "medium"
        elif wave_h > 1.8:
            wave_pts = 2.5
            wave_desc = f"Moderate wave action ({wave_h:.1f}m waves)"
            wave_sev = "low"
        else:
            wave_pts = 0.5
            wave_desc = f"Calm to slight sea ({wave_h:.1f}m waves)"
            wave_sev = "low"

        total_score += wave_pts
        factors.append({
            "name": "Wave Swell & Dynamic Roll",
            "points": round(wave_pts, 1),
            "description": wave_desc,
            "severity": wave_sev
        })

        # 5. Ocean Current & Drift Shear (0 - 5 pts)
        curr_pts = min(5.0, (curr_spd / 2.5) * 5.0)
        total_score += curr_pts
        factors.append({
            "name": "Ocean Current Shear",
            "points": round(curr_pts, 1),
            "description": f"Antarctic current flow at {curr_spd:.1f} kts",
            "severity": "medium" if curr_pts > 3.0 else "low"
        })

        # Boundary clamping to 0-100
        score = min(100.0, max(0.0, total_score))

        # Risk Classification Tiers
        if score <= 30.0:
            tier = "Low"
            recommendation = "Maintain planned cruise speed. Standard polar bridge watch."
        elif score <= 60.0:
            tier = "Moderate"
            recommendation = "Double lookouts on bridge. Engage ice radar. Reduce speed by 15% in low visibility."
        elif score <= 80.0:
            tier = "High"
            recommendation = "Prepare ice management protocols. Reduce speed to maneuverable crawl. Review alternative routes."
        else:
            tier = "Critical"
            recommendation = "EMERGENCY: Immediate detour required. Iceberg collision or pack entrapment imminent."

        return {
            "risk_score": round(score, 1),
            "risk_tier": tier,
            "recommendation": recommendation,
            "factors": factors
        }

risk_engine = RiskEngine()
