"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";

import {
  Language,
  AppState,
  EmergencyInstruction,
  AgentState,
} from "@/types/gemini";
import { AgentStateStore, LogType } from "@/types/agent";
import { analyzeEmergency } from "@/lib/gemini";
import { speak, stopSpeech } from "@/lib/tts";
import { t } from "@/lib/translations";
import {
  requestMediaPermissionsWithFacing,
  isSecureContext,
} from "@/lib/permissions";
import { getLocalEmergencyNumber } from "@/lib/utils";

import EmergencyButton from "@/components/EmergencyButton";
import CameraCapture from "@/components/CameraCapture";
import LanguageSelector from "@/components/LanguageSelector";
import SeverityScoreCard from "@/components/SeverityScoreCard";
import AgentLatencyPanel from "@/components/AgentLatencyPanel";
import EmergencyExecutionBanner from "@/components/EmergencyExecutionBanner";
import EmergencyGuidanceCard from "@/components/EmergencyGuidanceCard";
import AgentDecisionLog from "@/components/AgentDecisionLog";
import AIReasoningPanel from "@/components/AIReasoningPanel";
import { INITIAL_AGENT_STATE, generateTraceId } from "@/lib/agent-store";

interface ExtendedInstruction extends EmergencyInstruction {
  reasoning?: string;
}

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [state, setState] = useState<AppState>({
    language: Language.ENGLISH,
    isEmergencyActive: false,
    isAnalyzing: false,
    agentState: AgentState.IDLE,
    lastInstruction: null,
    error: null,
  });

  const [agentStore, setAgentStore] =
    useState<AgentStateStore>(INITIAL_AGENT_STATE);

  const [emergencyNumber, setEmergencyNumber] = useState("112");
  const [triggerGlitch, setTriggerGlitch] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const cameraFacingRef = useRef<"user" | "environment">("environment");

  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  /* ---------------------------------- INIT ---------------------------------- */

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setEmergencyNumber(
      tz === "Africa/Casablanca" ? "15" : getLocalEmergencyNumber(),
    );
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  /* --------------------------------- HELPERS -------------------------------- */

  const addLog = (type: LogType, message: string) => {
    setAgentStore((p) => ({
      ...p,
      logs: [
        ...p.logs,
        {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          timestamp: Date.now(),
          type,
          message,
        },
      ],
    }));
  };

  /* ------------------------------- CAMERA LOGIC ------------------------------ */

  const startCamera = async () => {
    try {
      if (!isSecureContext()) console.warn("Insecure context");

      const result = await requestMediaPermissionsWithFacing(
        cameraFacingRef.current,
      );

      if (!result.stream) {
        toast.error(result.error || "Camera permission denied");
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = result.stream;
      }

      const recorder = new MediaRecorder(result.stream);
      recorder.ondataavailable = (e) =>
        e.data.size && audioChunksRef.current.push(e.data);
      recorder.start(100);
      mediaRecorderRef.current = recorder;
    } catch {
      toast.error("Failed to start camera");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
    }
    mediaRecorderRef.current?.stop();
    stopSpeech();
  };

  const flipCamera = async () => {
    stopCamera();
    cameraFacingRef.current =
      cameraFacingRef.current === "user" ? "environment" : "user";
    await startCamera();
  };

  /* ------------------------------ AI ANALYSIS -------------------------------- */

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || state.isAnalyzing) return;

    addLog("FAST_PATH", "Acquiring visual target...");

    setState((p) => ({
      ...p,
      isAnalyzing: true,
      agentState: AgentState.ANALYZING,
    }));

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 640;
      canvas.height = (video.videoHeight / video.videoWidth) * 640;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageBase64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];

      addLog("DEEP_PATH", "Streaming to Gemini 1.5 Flash...");

      const analysis = await analyzeEmergency(
        imageBase64,
        null,
        state.language,
      );

      if (!analysis.success) throw new Error(analysis.error.message);

      const instruction = analysis.data;
      
      addLog("DECISION", `Event Detected: ${instruction.type}`);
      addLog("POLICY", `Loading protocol: ${instruction.type.toUpperCase()}_RESPONSE`);

      const severity =
        instruction.dangerLevel === "CRITICAL"
          ? 95
          : instruction.dangerLevel === "HIGH"
            ? 75
            : 40;

      setAgentStore((p) => ({
        ...p,
        severity,
        confidence: 90,
      }));

      addLog("EXECUTION", "Broadcasting emergency guidance...");

      setState((p) => ({
        ...p,
        lastInstruction: instruction,
        isAnalyzing: false,
        agentState:
          instruction.dangerLevel === "CRITICAL"
            ? AgentState.ACTIVE
            : AgentState.MONITORING,
      }));

      speak(
        [...instruction.actions, instruction.warning].join(". "),
        state.language,
      );
    } catch (e: any) {
      addLog("FAST_PATH", `Analysis retry ${retryCountRef.current + 1}/${MAX_RETRIES}`);
      if (++retryCountRef.current <= MAX_RETRIES) {
        setTimeout(captureAndAnalyze, 1500);
      } else {
        toast.error(e.message || "Analysis failed");
        addLog("FAST_PATH", `Critical failure: ${e.message}`);
        retryCountRef.current = 0;
        setState((p) => ({ ...p, isAnalyzing: false }));
      }
    }
  };

  /* ------------------------------- UI STATE ---------------------------------- */

  const toggleEmergency = () => {
    if (!state.isEmergencyActive) {
      setState((p) => ({ ...p, isEmergencyActive: true }));
      addLog("FAST_PATH", "System activated. Initializing sensors...");
      startCamera();
    } else {
      stopCamera();
      setState((p) => ({
        ...p,
        isEmergencyActive: false,
        lastInstruction: null,
      }));
      setAgentStore(INITIAL_AGENT_STATE);
    }
  };

  const isRTL = state.language === Language.ARABIC;
  const isCritical = agentStore.severity > 80;

  /* ---------------------------------- RENDER --------------------------------- */

  return (
    <div
      className={`min-h-screen bg-[#050507] text-slate-200 ${
        isRTL ? "rtl" : "ltr"
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <EmergencyExecutionBanner execution={agentStore.execution} />

      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#050507]/90 backdrop-blur border-b border-white/10 px-6 py-3 flex justify-between">
        <div className="flex items-center gap-3">
          <Image src="/assets/logo.png" alt="logo" width={36} height={36} />
          <div className="flex flex-col justify-center">
            <span className="font-mono font-bold tracking-wide text-sm sm:text-base leading-tight">
              LIFEGUARD <span className="text-red-600">AI</span>
            </span>

            <span className="text-[10px] sm:text-xs text-slate-400 leading-tight">
              Autonomous Emergency Response Agent
            </span>
          </div>
        </div>
        <LanguageSelector
          selectedLanguage={state.language}
          onLanguageChange={(lang) =>
            setState((p) => ({ ...p, language: lang }))
          }
        />
      </header>

      {/* MAIN */}
      <main className="pt-24 pb-16 px-4">
        {!state.isEmergencyActive ? (
          <div className="max-w-md mx-auto flex items-center justify-center h-[calc(100vh-6rem)] px-4">
            <EmergencyButton
              language={state.language}
              onStart={toggleEmergency}
            />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* LEFT */}
            <div className="space-y-6">
              <CameraCapture
                videoRef={videoRef}
                isAnalyzing={state.isAnalyzing}
                agentState={state.agentState}
                language={state.language}
                onManualTrigger={captureAndAnalyze}
                onStop={toggleEmergency}
                onFlipCamera={flipCamera}
                isCritical={isCritical}
                emergencyNumber={emergencyNumber}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SeverityScoreCard
                  severity={agentStore.severity}
                  confidence={agentStore.confidence}
                  lastUpdated={Date.now()}
                  language={state.language}
                />
                <AgentLatencyPanel
                  latency={agentStore.latency}
                  isAnalyzing={state.isAnalyzing}
                  language={state.language}
                />
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-6">
              {state.lastInstruction && (
                <>
                  <EmergencyGuidanceCard
                    type={state.lastInstruction.type}
                    dangerLevel={state.lastInstruction.dangerLevel}
                    steps={state.lastInstruction.actions}
                    warning={state.lastInstruction.warning}
                    language={state.language}
                    onSpeak={() =>
                      speak(
                        state.lastInstruction?.actions.join(". ") || "",
                        state.language,
                      )
                    }
                  />

                  <AIReasoningPanel
                    reasoning={
                      (state.lastInstruction as ExtendedInstruction)
                        .reasoning || ""
                    }
                  />
                </>
              )}

              <AgentDecisionLog
                logs={agentStore.logs}
                language={state.language}
              />
            </div>
          </div>
        )}
      </main>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default App;
