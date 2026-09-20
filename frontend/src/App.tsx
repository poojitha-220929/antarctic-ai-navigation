import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { NavigationTabs, TabId } from "./components/NavigationTabs";
import { DashboardView } from "./views/DashboardView";
import { SeaIceForecastView } from "./views/SeaIceForecastView";
import { IcebergTrackingView } from "./views/IcebergTrackingView";
import { RouteOptimizerView } from "./views/RouteOptimizerView";
import { RiskAnalysisView } from "./views/RiskAnalysisView";
import { AlertsView } from "./views/AlertsView";
import { DataModelsView } from "./views/DataModelsView";
import { SimulationWorkflowModal } from "./components/SimulationWorkflowModal";

import {
  Vessel,
  Station,
  Iceberg,
  Route,
  RiskAssessment,
  EnvironmentalCell,
  SeaIceForecast,
  AIExplanation,
  Alert,
  SimulationResponse,
  DynamicRecalculationData,
} from "./types";
import { api } from "./services/api";

export const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [destination, setDestination] = useState<Station | null>(null);

  const [envGrid, setEnvGrid] = useState<EnvironmentalCell[]>([]);
  const [currentEnv, setCurrentEnv] = useState<EnvironmentalCell | undefined>(undefined);
  const [seaIceForecast, setSeaIceForecast] = useState<SeaIceForecast | undefined>(undefined);
  const [featureImportances, setFeatureImportances] = useState<any[]>([]);
  const [icebergs, setIcebergs] = useState<Iceberg[]>([]);
  const [selectedIceberg, setSelectedIceberg] = useState<Iceberg | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | undefined>(undefined);

  const [routes, setRoutes] = useState<{
    route_a?: Route;
    route_b?: Route;
    route_c?: Route;
  }>({});
  const [aiExplanation, setAiExplanation] = useState<AIExplanation | undefined>(undefined);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [inspectedAlert, setInspectedAlert] = useState<Alert | null>(null);
  const [modelsInfo, setModelsInfo] = useState<any>(null);

  // Simulation & Dynamic Hazard State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState<boolean>(false);
  const [simulationResponse, setSimulationResponse] = useState<SimulationResponse | null>(null);
  const [recalculatedData, setRecalculatedData] = useState<DynamicRecalculationData | null>(null);
  const [isHazardActive, setIsHazardActive] = useState<boolean>(false);

  // Map Controls State
  const [forecastHorizon, setForecastHorizon] = useState<"Now" | "+6h" | "+12h" | "+24h" | "+48h">("Now");
  const [activeLayers, setActiveLayers] = useState({
    seaIce: true,
    icebergs: true,
    trajectories: true,
    routes: true,
    riskZones: true,
    stations: true,
  });

  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);

  // Initial Data Load
  useEffect(() => {
    const initData = async () => {
      try {
        const [vList, sList] = await Promise.all([
          api.getVessels(),
          api.getStations(),
        ]);

        setVessels(vList);
        setStations(sList);

        const initVessel = vList[0];
        const initDest = sList.find((s) => s.id === initVessel.default_destination_id) || sList[2];

        setSelectedVessel(initVessel);
        setDestination(initDest);

        // Load environmental and model data for this vessel
        await loadVesselOperationalContext(initVessel, initDest);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsLoadingInitial(false);
      }
    };

    initData();
  }, []);

  const loadVesselOperationalContext = async (vessel: Vessel, dest: Station) => {
    try {
      const vLoc = vessel.current_location;

      const [envRes, iceForecastRes, bergsRes, alertsRes, optRes, modelsRes] = await Promise.all([
        api.getEnvironment(),
        api.getSeaIceForecast(vLoc.latitude, vLoc.longitude),
        api.getIcebergs(vLoc.latitude, vLoc.longitude),
        api.getAlerts(vessel.id),
        api.optimizeRoute({
          vessel_id: vessel.id,
          destination_id: dest.id,
          objective: "balanced",
        }),
        api.getModelsInfo(),
      ]);

      setEnvGrid(envRes.grid);
      setCurrentEnv(iceForecastRes.environmental_conditions);
      setSeaIceForecast(iceForecastRes.forecast_results);
      setFeatureImportances(iceForecastRes.explainability_feature_importances);
      setIcebergs(bergsRes);
      setAlerts(alertsRes);
      setRoutes(optRes.routing_results.routes);
      setAiExplanation(optRes.routing_results.ai_explanation);
      setModelsInfo(modelsRes);

      // Analyze Risk
      const riskRes = await api.analyzeRisk({
        latitude: vLoc.latitude,
        longitude: vLoc.longitude,
        vessel_speed_knots: vLoc.speed_knots,
        nearest_iceberg_dist_km: bergsRes[0]?.distance_km,
        trajectory_conflict: false,
      });
      setRiskAssessment(riskRes.risk_assessment);
    } catch (err) {
      console.error("Error loading operational context:", err);
    }
  };

  const handleSelectVessel = async (newVessel: Vessel) => {
    setSelectedVessel(newVessel);
    const dest = stations.find((s) => s.id === newVessel.default_destination_id) || destination || stations[0];
    setDestination(dest);
    setRecalculatedData(null);
    setIsHazardActive(false);
    await loadVesselOperationalContext(newVessel, dest);
  };

  const handleSelectDestination = async (newDest: Station) => {
    setDestination(newDest);
    if (selectedVessel) {
      const optRes = await api.optimizeRoute({
        vessel_id: selectedVessel.id,
        destination_id: newDest.id,
        objective: "balanced",
      });
      setRoutes(optRes.routing_results.routes);
      setAiExplanation(optRes.routing_results.ai_explanation);
    }
  };

  const handleToggleLayer = (layerKey: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  // Run AI Simulation (8-step pipeline)
  const handleRunSimulation = async () => {
    if (!selectedVessel || !destination) return;
    setIsSimulating(true);
    setIsWorkflowModalOpen(true);

    try {
      const simRes = await api.runSimulation(selectedVessel.id, destination.id);
      setSimulationResponse(simRes);
      setSeaIceForecast(simRes.sea_ice_forecast);
      setIcebergs(simRes.tracked_icebergs);
      setRiskAssessment(simRes.navigation_risk);
      setRoutes(simRes.routing.routes);
      setAiExplanation(simRes.routing.ai_explanation);
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Trigger Dynamic Hazard Recalculation Scenario
  const handleTriggerHazard = async () => {
    if (!selectedVessel || !destination) return;
    try {
      const hazardRes = await api.triggerHazardDrift(selectedVessel.id, destination.id);
      setRecalculatedData(hazardRes);
      setIsHazardActive(true);
      setIcebergs(hazardRes.tracked_icebergs);

      // Add critical alert to top of alert list
      setAlerts((prev) => [hazardRes.alert, ...prev]);

      // Re-evaluate risk for critical condition
      const riskRes = await api.analyzeRisk({
        latitude: selectedVessel.current_location.latitude,
        longitude: selectedVessel.current_location.longitude,
        vessel_speed_knots: selectedVessel.current_location.speed_knots,
        nearest_iceberg_dist_km: 14.5,
        trajectory_conflict: true,
      });
      setRiskAssessment(riskRes.risk_assessment);
    } catch (err) {
      console.error("Dynamic hazard trigger error:", err);
    }
  };

  // Live Voyage Navigation Simulation State
  const [isVoyageActive, setIsVoyageActive] = useState<boolean>(false);
  const [isVoyagePaused, setIsVoyagePaused] = useState<boolean>(false);
  const [voyageProgress, setVoyageProgress] = useState<number>(0);
  const [voyageSpeed, setVoyageSpeed] = useState<number>(1);
  const [voyagePosition, setVoyagePosition] = useState<{ latitude: number; longitude: number; heading: number } | null>(null);
  const [traveledPath, setTraveledPath] = useState<[number, number][]>([]);

  // Get active route coordinates (Dynamic Recalculated Route if active, otherwise Route C)
  const getActiveRouteCoords = (): [number, number][] => {
    if (recalculatedData?.recalculated_route?.coordinates) {
      return recalculatedData.recalculated_route.coordinates;
    }
    if (routes?.route_c?.coordinates) {
      return routes.route_c.coordinates;
    }
    if (selectedVessel && destination) {
      return [
        [selectedVessel.current_location.latitude, selectedVessel.current_location.longitude],
        [destination.latitude, destination.longitude],
      ];
    }
    return [];
  };

  // Interpolate vessel movement along active route polyline
  useEffect(() => {
    if (!isVoyageActive || isVoyagePaused) return;

    const routeCoords = getActiveRouteCoords();
    if (!routeCoords || routeCoords.length < 2) return;

    const interval = setInterval(() => {
      setVoyageProgress((prev) => {
        const step = 0.5 * voyageSpeed;
        const next = prev + step;
        if (next >= 100) {
          setIsVoyageActive(false);
          return 100;
        }

        const ratio = next / 100;
        let totalDist = 0;
        const segLengths: number[] = [];
        for (let i = 0; i < routeCoords.length - 1; i++) {
          const d = Math.hypot(routeCoords[i + 1][0] - routeCoords[i][0], routeCoords[i + 1][1] - routeCoords[i][1]);
          segLengths.push(d);
          totalDist += d;
        }

        const targetDist = ratio * totalDist;
        let accumulated = 0;
        for (let i = 0; i < segLengths.length; i++) {
          if (accumulated + segLengths[i] >= targetDist || i === segLengths.length - 1) {
            const segRatio = segLengths[i] > 0 ? (targetDist - accumulated) / segLengths[i] : 0;
            const p1 = routeCoords[i];
            const p2 = routeCoords[i + 1];
            const latitude = p1[0] + (p2[0] - p1[0]) * segRatio;
            const longitude = p1[1] + (p2[1] - p1[1]) * segRatio;
            const dy = p2[1] - p1[1];
            const dx = p2[0] - p1[0];
            const heading = Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360);
            
            const pos = { latitude, longitude, heading };
            setVoyagePosition(pos);
            setTraveledPath((path) => {
              if (path.length === 0) return [[routeCoords[0][0], routeCoords[0][1]], [latitude, longitude]];
              return [...path, [latitude, longitude]];
            });
            break;
          }
          accumulated += segLengths[i];
        }

        return next;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isVoyageActive, isVoyagePaused, voyageSpeed, recalculatedData, routes]);

  const handleStartVoyage = () => {
    if (voyageProgress >= 100) {
      setVoyageProgress(0);
      setTraveledPath([]);
      setVoyagePosition(null);
    }
    setIsVoyageActive(true);
    setIsVoyagePaused(false);
  };

  const handlePauseVoyage = () => {
    setIsVoyagePaused(true);
    setIsVoyageActive(false);
  };

  const handleResetVoyage = () => {
    setIsVoyageActive(false);
    setIsVoyagePaused(false);
    setVoyageProgress(0);
    setVoyagePosition(null);
    setTraveledPath([]);
  };

  const handleResetHazard = async () => {
    try {
      await api.resetSimulation();
      setRecalculatedData(null);
      setIsHazardActive(false);
      setInspectedAlert(null);
      handleResetVoyage();
      if (selectedVessel && destination) {
        await loadVesselOperationalContext(selectedVessel, destination);
      }
    } catch (err) {
      console.error("Reset error:", err);
    }
  };

  const handleToggleMode = async () => {
    if (selectedVessel && destination) {
      await loadVesselOperationalContext(selectedVessel, destination);
    }
  };

  const handleInspectAlert = (alert: Alert | null, navigateToMap: boolean = false) => {
    setInspectedAlert(alert);
    if (alert) {
      // Find matching iceberg if the alert references one
      const targetBerg =
        icebergs.find(
          (b) =>
            alert.message.includes(b.id) ||
            alert.title.includes(b.id) ||
            alert.message.includes(b.name)
        ) || (alert.category === "Iceberg" ? icebergs[0] : null);

      if (targetBerg) {
        setSelectedIceberg(targetBerg);
      }

      if (navigateToMap) {
        setActiveTab("dashboard");
      }
    }
  };

  if (isLoadingInitial || !selectedVessel || !destination) {
    return (
      <div className="min-h-screen w-full bg-[#080d1a] flex flex-col items-center justify-center text-slate-200">
        <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-500 flex items-center justify-center mb-4 animate-spin">
          <div className="w-4 h-4 bg-cyan-400 rounded-sm"></div>
        </div>
        <div className="text-base font-bold tracking-widest text-cyan-400 uppercase">
          ANTARCTIC AI NAVIGATION DECISION SUPPORT SYSTEM
        </div>
        <div className="text-xs text-slate-400 font-mono mt-1">
          Initializing polar telemetry, Random Forest forecasters & hydrodynamic drift models...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#080d1a] text-slate-100 flex flex-col font-sans">
      {/* 1. Header with live status, vessel selector, and simulation actions */}
      <Header
        vessels={vessels}
        selectedVessel={selectedVessel}
        onSelectVessel={handleSelectVessel}
        onRunSimulation={handleRunSimulation}
        onTriggerHazard={handleTriggerHazard}
        onResetSimulation={handleResetHazard}
        isHazardActive={isHazardActive}
        isSimulating={isSimulating}
        isVoyageActive={isVoyageActive}
        isVoyagePaused={isVoyagePaused}
        onStartVoyage={handleStartVoyage}
        onPauseVoyage={handlePauseVoyage}
        onResetVoyage={handleResetVoyage}
        onToggleMode={handleToggleMode}
      />

      {/* 2. Main Navigation Bar with the 7 Sections */}
      <NavigationTabs
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        alertCount={alerts.filter((a) => a.severity === "CRITICAL").length}
      />

      {/* 3. Dynamic Section Content */}
      <main className="flex-1 flex flex-col">
        {activeTab === "dashboard" && (
          <DashboardView
            vessel={selectedVessel}
            destination={destination}
            icebergs={icebergs}
            routes={routes}
            recalculatedData={recalculatedData}
            onDismissHazard={() => setRecalculatedData(null)}
            envGrid={envGrid}
            currentEnv={currentEnv}
            seaIceForecast={seaIceForecast}
            riskAssessment={riskAssessment}
            aiExplanation={aiExplanation}
            selectedIceberg={selectedIceberg}
            onSelectIceberg={setSelectedIceberg}
            inspectedAlert={inspectedAlert}
            onClearInspectedAlert={() => setInspectedAlert(null)}
            forecastHorizon={forecastHorizon}
            onHorizonChange={setForecastHorizon}
            activeLayers={activeLayers}
            onToggleLayer={handleToggleLayer}
            onNavigateToTab={setActiveTab}
            voyagePosition={voyagePosition}
            traveledPath={traveledPath}
            isVoyageActive={isVoyageActive}
            isVoyagePaused={isVoyagePaused}
            voyageProgress={voyageProgress}
            voyageSpeed={voyageSpeed}
            onStartVoyage={handleStartVoyage}
            onPauseVoyage={handlePauseVoyage}
            onResetVoyage={handleResetVoyage}
            onSetVoyageSpeed={setVoyageSpeed}
          />
        )}

        {activeTab === "sea_ice" && (
          <SeaIceForecastView
            forecastData={seaIceForecast}
            currentEnv={currentEnv}
            featureImportances={featureImportances}
          />
        )}

        {activeTab === "icebergs" && (
          <IcebergTrackingView
            icebergs={icebergs}
            vessel={selectedVessel}
            selectedIceberg={selectedIceberg}
            onSelectIceberg={setSelectedIceberg}
            onNavigateToMap={() => setActiveTab("dashboard")}
          />
        )}

        {activeTab === "route_optimizer" && (
          <RouteOptimizerView
            vessel={selectedVessel}
            destination={destination}
            stations={stations}
            onSelectDestination={handleSelectDestination}
            routes={routes}
            aiExplanation={aiExplanation}
            onNavigateToMap={() => setActiveTab("dashboard")}
          />
        )}

        {activeTab === "risk_analysis" && (
          <RiskAnalysisView
            riskAssessment={riskAssessment}
            vessel={selectedVessel}
            currentEnv={currentEnv}
            isHazardActive={isHazardActive}
          />
        )}

        {activeTab === "alerts" && (
          <AlertsView
            alerts={alerts}
            onTriggerRecalculation={handleTriggerHazard}
            onNavigateToMap={() => setActiveTab("dashboard")}
            onInspectAlert={handleInspectAlert}
            inspectedAlert={inspectedAlert}
            isHazardActive={isHazardActive}
          />
        )}

        {activeTab === "data_models" && (
          <DataModelsView modelsInfo={modelsInfo} />
        )}
      </main>

      {/* 4. Interactive 8-Stage Simulation Workflow Modal */}
      <SimulationWorkflowModal
        isOpen={isWorkflowModalOpen}
        onClose={() => setIsWorkflowModalOpen(false)}
        simulationData={simulationResponse}
        isLoading={isSimulating}
      />
    </div>
  );
};

export default App;
