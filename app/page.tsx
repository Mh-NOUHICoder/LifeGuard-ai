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
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const cameraFacingRef = useRef<"user" | "environment">("environment");
  const isActiveRef = useRef<boolean>(false);
  const analysisAbortControllerRef = useRef<AbortController | null>(null);

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
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : Date.now().toString(),
          timestamp: Date.now(),
          type,
          message,
        },
      ],
    }));
  };

  /* ------------------------------- CAMERA LOGIC ------------------------------ */

  const startCamera = useCallback(async () => {
    try {
      if (!isActiveRef.current) return;

      if (!isSecureContext()) console.warn("Insecure context");

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const result = await requestMediaPermissionsWithFacing(
        cameraFacingRef.current,
      );

      if (!isActiveRef.current) {
        result.stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (!result.stream) {
        toast.error(result.error || "Camera permission denied");
        return;
      }

      streamRef.current = result.stream;

      if (videoRef.current) {
        videoRef.current.srcObject = result.stream;
        videoRef.current.onloadedmetadata = () => {
          if (!isActiveRef.current) return;
          videoRef.current?.play().catch((e) => {
            console.warn("Auto-play failed", e);
            // Retry play if failed (sometimes needed on mobile)
          });
          console.log("Camera stream ready");
        };
      }

      // Initialize Audio Recorder
      let mimeType = "";
      const possibleMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
      ];

      for (const type of possibleMimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      try {
        const recorder = new MediaRecorder(
          result.stream,
          mimeType ? { mimeType } : {},
        );
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch (e) {
        console.warn("Audio recording not supported or failed", e);
      }
    } catch (err: any) {
      toast.error(
        "Failed to start camera: " + (err.message || "Unknown error"),
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
      videoRef.current.srcObject = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    stopSpeech();
  }, []);

  const flipCamera = async () => {
    stopCamera();
    cameraFacingRef.current =
      cameraFacingRef.current === "user" ? "environment" : "user";
    await startCamera();
  };

  // Lifecycle Management
  useEffect(() => {
    if (state.isEmergencyActive) {
      isActiveRef.current = true;
      startCamera();
    }
    return () => {
      isActiveRef.current = false;
      stopCamera();
    };
  }, [state.isEmergencyActive, startCamera, stopCamera]);

  /* ------------------------------ AI ANALYSIS -------------------------------- */

  const cancelAnalysis = () => {
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
      analysisAbortControllerRef.current = null;
    }
    setState((p) => ({
      ...p,
      isAnalyzing: false,
      agentState: AgentState.MONITORING,
    }));
    addLog("FAST_PATH", "Analysis manually stopped.");
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || state.isAnalyzing) return;

    const abortController = new AbortController();
    analysisAbortControllerRef.current = abortController;

    addLog("FAST_PATH", "VERIFYING THREAT...");

    setState((p) => ({
      ...p,
      isAnalyzing: true,
      agentState: AgentState.ANALYZING,
    }));

    try {
      const video = videoRef.current;

      // Ensure camera is actually ready to prevent black frames or errors
      if (video.readyState < 2) {
        // HAVE_CURRENT_DATA
        toast.warning("Camera initializing...");
        throw new Error("Camera stream not ready");
      }

      const canvas = canvasRef.current;
      canvas.width = 640;
      canvas.height = (video.videoHeight / video.videoWidth) * 640;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageBase64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];

      if (abortController.signal.aborted) return;

      // Process Audio
      let audioBase64: string | null = null;
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        const stopPromise = new Promise<void>((resolve) => {
          if (!mediaRecorderRef.current) return resolve();
          mediaRecorderRef.current.onstop = () => resolve();
        });

        mediaRecorderRef.current.stop();
        await stopPromise;

        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const reader = new FileReader();
          audioBase64 = await new Promise<string>((resolve) => {
            reader.onloadend = () =>
              resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(blob);
          });
        }
        audioChunksRef.current = [];
        mediaRecorderRef.current.start();
      }

      if (abortController.signal.aborted) return;

      addLog("DEEP_PATH", "Streaming to Gemini 3 Flash...");

      const analysis = await analyzeEmergency(
        imageBase64,
        audioBase64,
        state.language,
      );

      if (abortController.signal.aborted) return;

      if (!analysis.success) throw new Error(analysis.error.message);

      const instruction = analysis.data;

      addLog("DECISION", `Event Detected: ${instruction.type}`);
      addLog(
        "POLICY",
        `Loading protocol: ${instruction.type.toUpperCase()}_RESPONSE`,
      );

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
      if (abortController.signal.aborted) return;

      addLog(
        "FAST_PATH",
        `Analysis retry ${retryCountRef.current + 1}/${MAX_RETRIES}`,
      );

      // Don't retry if it was a camera ready error, just reset
      if (e.message === "Camera stream not ready") {
        setState((p) => ({
          ...p,
          isAnalyzing: false,
          agentState: AgentState.MONITORING,
        }));
        return;
      }

      if (++retryCountRef.current <= MAX_RETRIES) {
        setTimeout(captureAndAnalyze, 1500);
      } else {
        toast.error(e.message || "Analysis failed");
        addLog("FAST_PATH", `Critical failure: ${e.message}`);
        retryCountRef.current = 0;
        setState((p) => ({ ...p, isAnalyzing: false }));
      }
    } finally {
      analysisAbortControllerRef.current = null;
    }
  };

  /* ------------------------------- UI STATE ---------------------------------- */

  const toggleEmergency = () => {
    if (!state.isEmergencyActive) {
      isActiveRef.current = true;
      setState((p) => ({ ...p, isEmergencyActive: true }));
      addLog("FAST_PATH", "System activated. Initializing sensors...");
    } else {
      cancelAnalysis();
      stopSpeech();
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
      className={`min-h-screen  bg-[#050507] text-slate-200 ${
        isRTL ? "rtl" : "ltr"
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[100] bg-[#050507] flex items-center justify-center overflow-hidden"
          >
            {/* Centered Wrapper */}
            <div className="relative flex flex-col items-center justify-center w-full h-full">
              {/* LOGO - Forced to center and scale from its own middle */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1, 20], // smoothly grows from 0 → normal → huge
                  opacity: [0, 1, 1, 0], // fades in, stays visible
                }}
                transition={{
                  duration: 4,
                  ease: [0.25, 0.1, 0.25, 1], // smooth easeInOut curve
                  times: [0, 0.3, 0.7, 1], // controls pacing of zoom
                }}
                className="absolute z-10 flex items-center justify-center"
              >
                <Image
                  src="/assets/logo.png"
                  alt="LifeGuard AI"
                  width={180}
                  height={180}
                  priority
                  className="drop-shadow-[0_0_50px_rgba(225,6,0,0.6)] object-contain"
                />
              </motion.div>

              {/* TEXT & PROGRESS - Fades away just as logo starts to explode */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: 0,
                }}
                transition={{
                  duration: 4,
                  times: [0, 0.15, 0.75, 0.85],
                  ease: "easeOut",
                }}
                className="mt-48 flex flex-col items-center"
              >
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                  LIFEGUARD <span className="text-[#E10600]">AI</span>
                </h1>

                <div className="mt-6 h-1.5 w-40 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#E10600]"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3, ease: "easeInOut" }}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
      <main className="pt-24 pb-16 px-4 ">
        {!state.isEmergencyActive && (
          <div className="max-w-md mx-auto flex items-center justify-center h-[calc(100vh-6rem)] px-4">
            <EmergencyButton
              language={state.language}
              onStart={toggleEmergency}
            />
          </div>
        )}
        {state.isEmergencyActive && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* LEFT */}
            <div className="space-y-6">
              <CameraCapture
                videoRef={videoRef}
                isAnalyzing={state.isAnalyzing}
                agentState={state.agentState}
                language={state.language}
                onManualTrigger={captureAndAnalyze}
                onCancelAnalysis={cancelAnalysis}
                onStop={toggleEmergency}
                onFlipCamera={flipCamera}
                isCritical={isCritical}
                emergencyNumber={emergencyNumber}
                onStartStream={startCamera}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:mb-16">
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
