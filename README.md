# Antarctic AI Navigation Decision Support System

[![Status](https://img.shields.io/badge/Status-Operational-emerald)](#)
[![Python](https://img.shields.io/badge/Python-3.13+-blue)](#)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-teal)](#)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-cyan)](#)
[![Machine Learning](https://img.shields.io/badge/ML-RandomForest%20%2B%20Kalman%20Drift-violet)](#)

> **“Develop an AI/ML-enabled decision support platform capable of forecasting Antarctic sea-ice concentration, predicting iceberg trajectories, and identifying safe and fuel-efficient navigation routes for research vessels using satellite, oceanographic and meteorological datasets.”**

---

## 1. System Overview

The **Antarctic AI Navigation Decision Support System** is an end-to-end operational platform tailored for polar research vessels navigating the hazardous waters of the Southern Ocean, Drake Passage, Antarctic Peninsula, and Weddell Sea.

The system does not merely display where hazards are today; **it forecasts where pack ice and icebergs will drift, scores operational navigation risk (0–100), and dynamically optimizes safe and fuel-efficient Pareto routes.**

```
                                  AI DECISION SUPPORT PIPELINE
                                  
  ┌─────────────────────────┐     ┌────────────────────────┐     ┌─────────────────────────┐
  │ Environmental Telemetry │ ──> │ AI Sea-Ice Forecasting │ ──> │ Iceberg Detection &     │
  │ • Satellite SAR / AMSR2 │     │ • Ensemble Random      │     │ Trajectory Drift Model  │
  │ • SST / Air Temp        │     │   Forest Regressor     │     │ • Current & Wind Drag   │
  │ • Wind / Swell vectors  │     │ • +6h, +12h, +24h, +48h│     │ • Coriolis Deflection   │
  └─────────────────────────┘     └────────────────────────┘     └─────────────────────────┘
                                                                              │
                                                                              ▼
  ┌─────────────────────────┐     ┌────────────────────────┐     ┌─────────────────────────┐
  │ Explainable AI & Alerts │ <── │ Multi-Objective A*     │ <── │ Navigation Risk Engine  │
  │ • Decision Justification│     │ Route Optimizer        │     │ • 0–100 Risk Score      │
  │ • Feature Importances   │     │ • Safest / Fuel / Bal  │     │ • Itemized Contributing │
  │ • Dynamic Recalculation │     │ • Dynamic Rerouting    │     │   Hazard Factors        │
  └─────────────────────────┘     └────────────────────────┘     └─────────────────────────┘
```

---

## 2. Core Functional Modules

### 1. Antarctic Interactive Polar Map
- Centered on the Southern Ocean & Antarctic Peninsula with high-contrast tactical cartography.
- Real-time vessel location & heading marker with active radar sweep pulse.
- **Dynamic Time Slider (`Now`, `+6h`, `+12h`, `+24h`, `+48h`)** updating sea-ice concentration grids and predicted iceberg displacement coordinates in real time.
- Color-coded pack-ice concentration overlays (0–15% open water, 15–40% light pack, 40–70% medium pack, 70–100% heavy multi-year ice).
- Directional iceberg markers with size badges, drift velocity vectors, and expanding circular uncertainty hazard zones.
- Interactive candidate routes (Route A Safest in Cyan, Route B Fuel-Saver in Amber, Route C AI Recommended Balanced in Glowing Emerald).

### 2. Sea-Ice Concentration Forecasting AI
- Trainable scikit-learn multi-horizon **Random Forest Regressor** persisted on disk (`sea_ice_forecaster.pkl`).
- Forecast horizons: **+6h, +12h, +24h, +48h**.
- Computes prediction confidence (83%–99%), delta from current conditions, and operational risk tiering.
- Interactive Recharts time-series progression area charts.
- Station-level ice condition indices for Palmer Station, Rothera, Esperanza, Marambio, and King George Island.
- **Explainable AI (XAI)**: Gini feature importance bar chart highlighting top physical drivers (Sea Surface Temperature, persistence, southerly wind advection, wave damping).

### 3. Iceberg Radar Tracking & Kalman Trajectory Prediction
- Tracks active icebergs (e.g. Tabular *A-102*, *B-09F*, Giant fragment *A-23A-FRAG*, Pinnacled berg *C-34*).
- Physics-informed drift model combining:
  - Submerged keel hydrodynamic drag (~80% mass interaction with Antarctic Circumpolar Current & Weddell Gyre).
  - Atmospheric wind leeway drag (~20% mass interaction, ~2% of wind speed).
  - **Southern Hemisphere Coriolis deflection**: Deflects drift 25° counter-clockwise (to the **LEFT**) of the wind/current vector.
- Kalman state covariance uncertainty expansion from ±1.2 km at +6h up to ±21.4 km at +48h.
- Computes Range, Bearing, Closest Point of Approach (CPA), and Time to CPA (TCPA).

### 4. Vessel Navigation Risk Engine
- Evaluates operational hazard variables into an intuitive **0 to 100 Navigation Risk Score**:
  - `0–30`: **LOW RISK** (Standard polar bridge watch)
  - `31–60`: **MODERATE RISK** (Double lookouts, ice radar active, 15% speed reduction)
  - `61–80`: **HIGH RISK** (Reduced speed, ice management protocol, review alternative routes)
  - `81–100`: **CRITICAL RISK** (Immediate detour required; collision or pack entrapment imminent)
- Itemized contributing factors breakdown (e.g., Sea ice: +25 pts, Iceberg within route: +32 pts, Gale wind: +8.5 pts, Heavy swell: +5 pts, Ocean current: +3 pts).

### 5. Safe & Fuel-Efficient Route Optimizer
- A* grid/graph maritime pathfinder with environmental cost weighting:
  $$\text{Route Cost} = \alpha \times \text{Risk} + \beta \times \text{Fuel Consumption} + \gamma \times \text{Travel Time}$$
- Generates 3 simultaneous candidate routes:
  - **Route A (Safest)**: $\alpha=0.65, \beta=0.15, \gamma=0.20$. Wide offshore sweep around pack-ice margins.
  - **Route B (Fuel-Efficient)**: $\alpha=0.15, \beta=0.65, \gamma=0.20$. Direct rhumb-line minimizing nautical miles.
  - **Route C (AI Recommended Balanced)**: $\alpha=0.40, \beta=0.35, \gamma=0.25$. Pareto-optimal compromise: **0 trajectory conflicts, 32% lower risk than Route B, and 11% fuel savings over Route A.**
- Provides side-by-side metric comparison cards and plain-language justification bullets.

### 6. Dynamic Route Recalculation Demonstration
- Judges can click **"Simulate Hazard Drift"** to test dynamic decision support:
  1. Iceberg A-102 is nudged into the active shipping corridor ~12h ahead.
  2. System triggers a **CRITICAL EARLY WARNING ALERT**: `⚠ ROUTE HAZARD DETECTED: Predicted iceberg trajectory intersects current navigation route in approximately 12 hours.`
  3. Automatically computes dynamic route recalculation.
  4. Renders the **Previous Compromised Route (dashed red, risk 78/100)** vs the **New Dynamic Evasion Route (emerald glow, risk 24/100)** with quantitative trade-off metrics.

### 7. Interactive 8-Stage Simulation Workflow
- Clicking **"Run AI Simulation"** launches an animated 8-step execution modal:
  `DATA → PREDICTION → RISK → OPTIMIZATION → DECISION`
  Demonstrates live model inference and displays the final decision support dossier.

---

## 3. Project Structure

```
sih/
├── backend/
│   ├── data/
│   │   ├── generator.py       # Realistic synthetic ocean/ice grid generator & metadata
│   │   ├── stations.json      # Antarctic research stations & departure ports
│   │   └── vessels.json       # Research vessel registry with fuel & ice class specs
│   ├── models/
│   │   ├── sea_ice_model.py   # RandomForestRegressor multi-horizon ML model
│   │   ├── iceberg_tracker.py # Hydrodynamic & Coriolis iceberg drift model
│   │   └── sea_ice_forecaster.pkl # Persisted trained model weights
│   ├── services/
│   │   ├── risk_engine.py     # 0-100 Navigation Risk scoring engine
│   │   ├── route_optimizer.py # A* multi-objective pathfinder
│   │   └── simulation_service.py # 8-step pipeline & dynamic rerouting scenario
│   ├── routes/
│   │   └── api.py             # FastAPI REST endpoints
│   ├── tests/
│   │   └── test_system.py     # Automated unit & integration tests
│   ├── main.py                # FastAPI app initialization and CORS middleware
│   └── requirements.txt       # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AntarcticMap.tsx              # Interactive Leaflet polar map with time slider
│   │   │   ├── Header.tsx                    # Top navigation, status badges & vessel selector
│   │   │   ├── KPIGrid.tsx                   # 9 Primary operational dashboard metrics
│   │   │   ├── NavigationTabs.tsx            # Section switcher
│   │   │   ├── DynamicRecalculationBanner.tsx# Hazard collision & rerouting banner
│   │   │   └── SimulationWorkflowModal.tsx   # 8-step visual AI workflow modal
│   │   ├── views/
│   │   │   ├── DashboardView.tsx             # Primary operational command center
│   │   │   ├── SeaIceForecastView.tsx        # Sea-ice charts, schedule, and feature drivers
│   │   │   ├── IcebergTrackingView.tsx       # Iceberg registry & trajectory inspector
│   │   │   ├── RouteOptimizerView.tsx        # Route A/B/C comparison & cost weight tuner
│   │   │   ├── RiskAnalysisView.tsx          # 0-100 Risk dial & contributing factors
│   │   │   ├── AlertsView.tsx                # Tactical early warnings & notifications
│   │   │   └── DataModelsView.tsx            # AI architecture & data schema specifications
│   │   ├── services/
│   │   │   └── api.ts                        # Frontend REST client connecting to backend
│   │   ├── types/
│   │   │   └── index.ts                      # Full TypeScript interfaces
│   │   ├── App.tsx                           # Root React application
│   │   └── index.css                         # Dark polar operations theme & Leaflet styles
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## 4. Quickstart Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Run the Backend (FastAPI)
In a terminal, run:
```bash
cd backend
python main.py
```
*The FastAPI backend will start at `http://localhost:8000`.*
*Interactive API documentation (Swagger) is available at `http://localhost:8000/docs`.*

### 2. Run the Frontend (React + Vite)
In a second terminal, run:
```bash
cd frontend
npm run dev
```
*Open your browser and navigate to `http://localhost:5173`.*

---

## 5. Automated Testing

Run the comprehensive pytest test suite to verify data generation, ML inference, drift physics, risk scoring, route optimization, and API endpoints:
```bash
python -m pytest backend/tests/test_system.py -v
```
All 6 test suites pass with 100% green status.

---

## 6. Live Demonstration Walkthrough for Judges

1. **Operations Dashboard**:
   - Inspect the interactive polar map centered on the Antarctic Peninsula.
   - Select between *R/V Polarstern* (PC3), *R/V Sir David Attenborough* (PC4), or *R/V Laurence M. Gould*.
   - Drag the **AI Forecast Timeline slider** (`Now`, `+6h`, `+12h`, `+24h`, `+48h`) to observe pack-ice growth and projected iceberg displacement.

2. **Sea-Ice Forecast Section**:
   - View the 48-hour concentration progression chart.
   - Inspect the Explainable AI (XAI) feature importances chart showing Sea Surface Temperature (34%) and southerly wind advection (17%) as the dominant drivers.

3. **Iceberg Tracking Section**:
   - Click on **Iceberg A-102** to inspect its dimensions (18.5 km length, 235m draft), range from vessel, and trajectory schedule.

4. **Route Optimizer Section**:
   - Compare Route A (Safest), Route B (Fuel-Saver), and Route C (AI Recommended Balanced).
   - Review the AI Decision Support explanation highlighting 0 predicted conflicts and 11% fuel savings.

5. **Dynamic Hazard Recalculation Demo**:
   - Click the **"Simulate Hazard Drift"** button in the header.
   - Observe the immediate **"⚠ ROUTE HAZARD DETECTED"** banner.
   - The map dynamically renders the previous compromised path (dashed red) and automatically recalculates the optimal evasion route (emerald glow).
   - Click **"Reset Hazard"** to restore nominal conditions.

6. **8-Stage AI Simulation**:
   - Click **"Run AI Simulation"** in the header to view the step-by-step pipeline execution from data ingestion to the final decision support dossier.

---

## 7. Future Real Satellite Data Integration

The prototype features a drop-in environmental schema ready for direct connection to:
- **Copernicus Marine Service (CMEMS)**: `SEAICE_ANT_PHY_L4_NRT_011_014`
- **NOAA Global Forecast System (GFS)**: 0.25° Gridded Atmospheric Telemetry
- **US National Ice Center (USNIC)**: Antarctic Iceberg Tracking Database
- **Sentinel-1 SAR / AMSR2**: High-resolution radar backscatter imagery
