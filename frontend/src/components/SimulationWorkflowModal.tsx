import React, { useState, useEffect } from "react";
import { CheckCircle2, Circle, Clock, Cpu, Database, Compass, ShieldAlert, Navigation, ArrowRight, X } from "lucide-react";
import { SimulationResponse } from "../types";

interface SimulationWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationData: SimulationResponse | null;
  isLoading: boolean;
}

export const SimulationWorkflowModal: React.FC<SimulationWorkflowModalProps> = ({
  isOpen,
  onClose,
  simulationData,
  isLoading,
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Animate through steps when loading finishes or modal opens
  useEffect(() => {
    if (!isOpen) {
      setActiveStepIndex(0);
      return;
    }

    if (simulationData?.pipeline_steps) {
      // Step animation sequence
      const totalSteps = simulationData.pipeline_steps.length;
      let cur = 0;
      const interval = setInterval(() => {
        cur += 1;
        if (cur >= totalSteps) {
          setActiveStepIndex(totalSteps);
          clearInterval(interval);
        } else {
          setActiveStepIndex(cur);
        }
      }, 350);

      return () => clearInterval(interval);
    }
  }, [isOpen, simulationData]);

  if (!isOpen) return null;

  const pipeline = simulationData?.pipeline_steps || [];
  const recRoute = simulationData?.routing?.routes?.route_c;
  const explanation = simulationData?.routing?.ai_explanation;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>AI NAVIGATION PIPELINE SIMULATION</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  REAL-TIME INFERENCE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                DATA → PREDICTION → RISK → OPTIMIZATION → DECISION
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pipeline Stage Bar */}
        <div className="bg-slate-950/60 px-6 py-3 border-b border-slate-800 flex items-center justify-between overflow-x-auto text-[11px] font-semibold">
          {[
            { label: "1. DATA", icon: Database },
            { label: "2. PREDICTION", icon: Cpu },
            { label: "3. RISK ENGINE", icon: ShieldAlert },
            { label: "4. ROUTE OPTIMIZER", icon: Navigation },
            { label: "5. AI DECISION", icon: CheckCircle2 },
          ].map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <React.Fragment key={idx}>
                <div className="flex items-center gap-1.5 text-cyan-300 whitespace-nowrap">
                  <Icon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{stage.label}</span>
                </div>
                {idx < 4 && <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0 mx-2" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Content Body: Steps List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Cpu className="w-10 h-10 text-cyan-400 animate-spin" />
              <div className="text-sm font-semibold text-slate-200">
                Running Antarctic Environmental Ingestion & ML Inference...
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Computing Random Forest sea-ice forecasts & Kalman drift equations...
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                {pipeline.map((step, idx) => {
                  const isVisible = idx <= activeStepIndex;
                  return (
                    <div
                      key={step.step_number}
                      className={`p-3 rounded-xl border transition-all duration-300 ${
                        isVisible
                          ? "bg-slate-800/80 border-slate-700 opacity-100 translate-x-0"
                          : "bg-slate-950/40 border-slate-800/40 opacity-40 -translate-x-2"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {isVisible ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <span className="text-xs font-bold text-slate-100 font-mono">
                            STEP {step.step_number}: {step.title}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-600/40">
                          {step.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 pl-6">
                        {step.summary}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Final Decision Callout Card */}
              {activeStepIndex >= pipeline.length && recRoute && (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/50 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-black tracking-wider text-emerald-300 uppercase flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      FINAL AI NAVIGATION RECOMMENDATION
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold font-mono text-[11px]">
                      ROUTE C (BALANCED)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-emerald-500/30 font-mono mb-3">
                    <div>
                      <div className="text-[10px] text-slate-400">RISK REDUCTION</div>
                      <div className="text-base font-bold text-emerald-400">-{explanation?.risk_reduction_percent}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">FUEL SAVING</div>
                      <div className="text-base font-bold text-emerald-400">{explanation?.fuel_saving_percent}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">TRAJECTORY CONFLICTS</div>
                      <div className="text-base font-bold text-emerald-400">0 DETECTED</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">ESTIMATED TIME</div>
                      <div className="text-base font-bold text-slate-200">{recRoute.estimated_travel_time_hours} hrs</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1">
                    <div className="font-semibold text-emerald-200">Decision Support Explainability:</div>
                    {explanation?.justification_bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-1.5 text-slate-300 pl-1 text-[11px]">
                        <span className="text-emerald-400">▪</span> {bullet}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Simulated using Random Forest & Kalman hydrodynamic vector models.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all cursor-pointer"
          >
            Apply to Tactical Map
          </button>
        </div>
      </div>
    </div>
  );
};
