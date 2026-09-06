"""
Realistic Synthetic Environmental & Oceanographic Data Generator for the Antarctic Region.
Focus Area: Southern Ocean, Drake Passage, Antarctic Peninsula, and NW Weddell Sea.
Coordinates: 55.0°S to 70.0°S, 75.0°W to 45.0°W.
Clearly labeled synthetic/demo dataset structured for drop-in replacement with real CMEMS/NOAA/AMSR2 feeds.
"""

import math
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

# Spatial Bounding Box for the Antarctic Peninsula & Approaches
LAT_MIN = -70.0
LAT_MAX = -55.0
LON_MIN = -75.0
LON_MAX = -45.0
GRID_RES = 0.5  # half-degree resolution grid

METADATA_SPEC = {
    "dataset_source": "SYNTHETIC_ANTARCTIC_OCEAN_REPRESENTATION_V2",
    "target_satellite_equivalent": "Copernicus Marine CMEMS Sea-Ice & NOAA GFS Weather",
    "is_synthetic": True,
    "disclaimer": "SYNTHETIC PROTOTYPE DATA: Modeled with realistic Antarctic thermodynamics and ACC/Weddell Gyre dynamics. Do not use for actual maritime navigation.",
    "spatial_bounds": {
        "lat_min": LAT_MIN,
        "lat_max": LAT_MAX,
        "lon_min": LON_MIN,
        "lon_max": LON_MAX,
        "resolution_deg": GRID_RES
    },
    "variables": [
        "sea_ice_concentration", "sea_surface_temperature", "air_temperature",
        "wind_speed", "wind_direction", "ocean_current_speed", "ocean_current_direction",
        "wave_height", "atmospheric_pressure", "visibility_km"
    ]
}

def generate_environmental_cell(lat: float, lon: float, sim_time: datetime = None, noise_seed: int = None) -> Dict[str, Any]:
    """
    Computes realistic continuous physical fields based on latitude, longitude, and seasonal/synoptic forcing.
    """
    if sim_time is None:
        sim_time = datetime.now(timezone.utc)

    if noise_seed is not None:
        np.random.seed(noise_seed)

    # Southward progression increases cold and ice
    southness = (abs(lat) - 55.0) / 15.0  # 0.0 at 55S, 1.0 at 70S
    southness = max(0.0, min(1.0, southness))

    # Weddell Sea (east of peninsula: lon > -60.0) has colder waters, pack ice extends further north
    is_weddell = 1.0 if lon >= -60.0 else 0.0
    weddell_factor = is_weddell * (0.2 + 0.3 * ((lon - (-60.0)) / 15.0))

    # Land/Shelf proximity bonus for coastal ice shelf
    shelf_factor = 0.15 * math.sin((lat + 60.0) * math.pi / 10.0)

    # 1. Sea Surface Temperature (deg C)
    # 55S is ~ +3.0 to +1.0 deg C, 65S-70S is -1.5 to -1.8 deg C (freezing point of seawater ~ -1.8C)
    base_sst = 2.5 - (4.3 * southness) - (0.8 * weddell_factor)
    sst = float(np.clip(base_sst + np.random.normal(0, 0.15), -1.85, 4.5))

    # 2. Air Temperature (deg C)
    # Range from +2.0C at 55S down to -18.0C at 70S
    base_air_temp = 2.0 - (18.0 * southness) - (3.0 * weddell_factor)
    air_temp = float(np.clip(base_air_temp + np.random.normal(0, 0.6), -30.0, 5.0))

    # 3. Sea-Ice Concentration (%)
    # Freezes below -1.0C SST, heavy pack ice near Antarctic continent and Weddell Sea
    if sst < -0.8:
        freeze_potential = ((-0.8 - sst) / 1.05) ** 1.3
        ice_conc = float(np.clip(freeze_potential * 65.0 + (southness * 35.0) + (weddell_factor * 25.0) + np.random.normal(0, 3.5), 0.0, 98.0))
    else:
        ice_conc = 0.0 if sst > 1.2 else float(np.clip(np.random.exponential(1.5), 0.0, 15.0))

    # 4. Wind Speed (knots) & Direction (degrees)
    # Drake Passage (56-62S) is famous for westerly gales (240 - 290 deg)
    base_wind_speed = 22.0 + (12.0 * math.sin((abs(lat) - 55.0) * math.pi / 7.0))
    wind_speed = float(np.clip(base_wind_speed + np.random.normal(0, 4.0), 5.0, 55.0))
    # Predominantly Westerlies (ACC) or Southerlies off the continent
    base_wind_dir = 270.0 - (40.0 * weddell_factor)
    wind_direction = float((base_wind_dir + np.random.normal(0, 15.0)) % 360.0)

    # 5. Ocean Current Speed (knots) & Direction (degrees)
    # Antarctic Circumpolar Current (ACC) flows eastward/northeastward (045-090 deg) at 0.5-2.0 kts
    # Weddell Gyre flows clockwise, sending currents NW toward Elephant Island
    if is_weddell:
        current_speed = float(np.clip(0.6 + np.random.normal(0, 0.15), 0.1, 1.6))
        current_direction = float((320.0 + np.random.normal(0, 12.0)) % 360.0)  # NW
    else:
        current_speed = float(np.clip(0.9 + np.random.normal(0, 0.25), 0.2, 2.3))
        current_direction = float((65.0 + np.random.normal(0, 10.0)) % 360.0)   # ENE (ACC)

    # 6. Wave Height (meters)
    # Open Drake passage gets 3.5-7.0m waves; sea-ice dampens waves dramatically
    open_sea_wave = 2.5 + (wind_speed / 10.0) * 0.9 + np.random.normal(0, 0.3)
    damping = max(0.05, 1.0 - (ice_conc / 70.0))
    wave_height = float(np.clip(open_sea_wave * damping, 0.2, 9.5))

    # 7. Atmospheric Pressure (hPa)
    base_pres = 985.0 - (8.0 * math.sin(lat * 0.2)) + np.random.normal(0, 4.0)
    atmospheric_pressure = float(np.clip(base_pres, 940.0, 1030.0))

    # 8. Visibility (km) - reduced by snow, sea fog, freeze haze
    fog_factor = 1.0 if abs(air_temp - sst) < 1.5 else 0.3
    vis_base = 20.0 - (fog_factor * 8.0) - (wind_speed * 0.15)
    visibility_km = float(np.clip(vis_base + np.random.normal(0, 2.0), 0.8, 30.0))

    return {
        "timestamp": sim_time.isoformat(),
        "latitude": round(lat, 2),
        "longitude": round(lon, 2),
        "sea_ice_concentration": round(ice_conc, 1),
        "sea_surface_temperature": round(sst, 2),
        "air_temperature": round(air_temp, 2),
        "wind_speed": round(wind_speed, 1),
        "wind_direction": round(wind_direction, 1),
        "ocean_current_speed": round(current_speed, 2),
        "ocean_current_direction": round(current_direction, 1),
        "wave_height": round(wave_height, 2),
        "atmospheric_pressure": round(atmospheric_pressure, 1),
        "visibility_km": round(visibility_km, 1)
    }

def generate_environmental_grid(sim_time: datetime = None, step: float = 1.0) -> List[Dict[str, Any]]:
    """
    Generates a full spatial grid of environmental parameters across the Antarctic operations area.
    """
    if sim_time is None:
        sim_time = datetime.now(timezone.utc)

    grid = []
    lats = np.arange(LAT_MIN, LAT_MAX + step, step)
    lons = np.arange(LON_MIN, LON_MAX + step, step)

    for i, lat in enumerate(lats):
        for j, lon in enumerate(lons):
            seed = int(abs(lat * 100) + abs(lon * 10))
            cell = generate_environmental_cell(float(lat), float(lon), sim_time, noise_seed=seed)
            grid.append(cell)

    return grid

def generate_historical_training_dataset(n_samples: int = 1200) -> pd.DataFrame:
    """
    Generates a tabular dataset with environmental drivers and future sea ice concentration
    at +6h, +12h, +24h, and +48h for training the predictive ML model.
    """
    np.random.seed(42)
    records = []
    start_date = datetime(2025, 1, 1, 0, 0, tzinfo=timezone.utc)

    for i in range(n_samples):
        dt_offset = timedelta(hours=int(np.random.randint(0, 720)))
        t_sample = start_date + dt_offset
        lat = np.random.uniform(LAT_MIN, LAT_MAX)
        lon = np.random.uniform(LON_MIN, LON_MAX)

        current_cell = generate_environmental_cell(lat, lon, t_sample)
        ice_0 = current_cell["sea_ice_concentration"]
        sst = current_cell["sea_surface_temperature"]
        air = current_cell["air_temperature"]
        wind_spd = current_cell["wind_speed"]
        wind_dir = current_cell["wind_direction"]
        curr_spd = current_cell["ocean_current_speed"]
        curr_dir = current_cell["ocean_current_direction"]
        wave = current_cell["wave_height"]
        pres = current_cell["atmospheric_pressure"]

        # Physics thermodynamic forcing:
        # If air & SST are cold, ice tends to expand/thicken.
        # If southerly wind pushes ice north, concentration shifts.
        southerly_wind_comp = -math.cos(math.radians(wind_dir)) * wind_spd
        freezing_degree_hours = max(0.0, -1.8 - air)

        # Realistic future concentrations with physical trend + noise
        d_ice_6h = (freezing_degree_hours * 0.4) - (sst * 1.5) + (southerly_wind_comp * 0.12) + np.random.normal(0, 1.2)
        d_ice_12h = (freezing_degree_hours * 0.9) - (sst * 3.2) + (southerly_wind_comp * 0.25) + np.random.normal(0, 2.1)
        d_ice_24h = (freezing_degree_hours * 1.8) - (sst * 6.0) + (southerly_wind_comp * 0.50) + np.random.normal(0, 3.5)
        d_ice_48h = (freezing_degree_hours * 3.2) - (sst * 10.5) + (southerly_wind_comp * 0.95) + np.random.normal(0, 5.0)

        # Baseline persistence with boundary clipping
        ice_6h = float(np.clip(ice_0 + d_ice_6h, 0.0, 100.0))
        ice_12h = float(np.clip(ice_0 + d_ice_12h, 0.0, 100.0))
        ice_24h = float(np.clip(ice_0 + d_ice_24h, 0.0, 100.0))
        ice_48h = float(np.clip(ice_0 + d_ice_48h, 0.0, 100.0))

        records.append({
            "latitude": lat,
            "longitude": lon,
            "sea_ice_concentration_current": ice_0,
            "sea_surface_temperature": sst,
            "air_temperature": air,
            "wind_speed": wind_spd,
            "wind_direction": wind_dir,
            "ocean_current_speed": curr_spd,
            "ocean_current_direction": curr_dir,
            "wave_height": wave,
            "atmospheric_pressure": pres,
            "target_ice_6h": ice_6h,
            "target_ice_12h": ice_12h,
            "target_ice_24h": ice_24h,
            "target_ice_48h": ice_48h
        })

    return pd.DataFrame(records)

def get_initial_icebergs() -> List[Dict[str, Any]]:
    """
    Realistic catalog of active icebergs in the Antarctic Peninsula and Weddell Sea corridor.
    Includes large tabular bergs, medium bergs, and hazardous fragments.
    """
    return [
        {
            "id": "A-102",
            "name": "Tabular Iceberg A-102",
            "type": "Tabular",
            "size_class": "Large",
            "length_km": 18.5,
            "width_km": 8.2,
            "freeboard_m": 42.0,
            "draft_m": 235.0,
            "latitude": -62.40,
            "longitude": -48.70,
            "speed_knots": 0.85,
            "heading_degrees": 315.0,  # Drifting NW
            "detected_source": "Sentinel-1 SAR / NIC Catalog",
            "risk_level": "High",
            "collision_risk_radius_km": 15.0
        },
        {
            "id": "B-09F",
            "name": "Iceberg B-09F (Calved Segment)",
            "type": "Tabular / Deteriorating",
            "size_class": "Medium",
            "length_km": 6.8,
            "width_km": 3.4,
            "freeboard_m": 30.0,
            "draft_m": 180.0,
            "latitude": -63.85,
            "longitude": -58.20,
            "speed_knots": 1.15,
            "heading_degrees": 25.0,  # Drifting NNE
            "detected_source": "Sentinel-2 Optical & RADARSAT",
            "risk_level": "High",
            "collision_risk_radius_km": 10.0
        },
        {
            "id": "A-23A-FRAG",
            "name": "A-23a Outflow Fragment-7",
            "type": "Grounded / Calving",
            "size_class": "Giant Fragment",
            "length_km": 14.2,
            "width_km": 6.5,
            "freeboard_m": 38.0,
            "draft_m": 210.0,
            "latitude": -61.15,
            "longitude": -52.60,
            "speed_knots": 1.40,
            "heading_degrees": 60.0,  # Accelerated by ACC to ENE
            "detected_source": "MODIS Aqua & SAR Ground Station",
            "risk_level": "Critical",
            "collision_risk_radius_km": 20.0
        },
        {
            "id": "C-34",
            "name": "Pinnacled Berg C-34",
            "type": "Pinnacle / Bergy Bit Cluster",
            "size_class": "Small / High Hazard",
            "length_km": 1.8,
            "width_km": 1.1,
            "freeboard_m": 18.0,
            "draft_m": 95.0,
            "latitude": -64.50,
            "longitude": -63.20,
            "speed_knots": 0.65,
            "heading_degrees": 210.0,  # Swirling in Gerlache Strait eddy
            "detected_source": "Marine Radar & Patrol Helicopter",
            "risk_level": "Medium",
            "collision_risk_radius_km": 6.0
        },
        {
            "id": "D-18",
            "name": "Marguerite Berg D-18",
            "type": "Tabular",
            "size_class": "Medium",
            "length_km": 5.4,
            "width_km": 2.9,
            "freeboard_m": 28.0,
            "draft_m": 165.0,
            "latitude": -66.80,
            "longitude": -69.20,
            "speed_knots": 0.45,
            "heading_degrees": 340.0,
            "detected_source": "CryoSat-2 Altimetry & SAR",
            "risk_level": "Medium",
            "collision_risk_radius_km": 8.0
        },
        {
            "id": "A-76-D",
            "name": "Iceberg A-76-D",
            "type": "Tabular",
            "size_class": "Large",
            "length_km": 11.0,
            "width_km": 4.5,
            "freeboard_m": 35.0,
            "draft_m": 195.0,
            "latitude": -62.90,
            "longitude": -55.40,
            "speed_knots": 0.95,
            "heading_degrees": 355.0,  # Northward along Peninsula flank
            "detected_source": "Sentinel-1 Synthetic Aperture Radar",
            "risk_level": "High",
            "collision_risk_radius_km": 12.0
        }
    ]
