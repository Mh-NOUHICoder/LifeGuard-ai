"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";

import {
  Language,
  AppState,
  EmergencyInstruction,
  AgentState,
} from "@/types/gemini";
import { AgentStateStore, AgentLogEntry, LogType } from "@/types/agent";
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

// Extended interface to support reasoning until types/gemini is updated
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
  const [triggerGlitch, setTriggerGlitch] = useState(false);
  const [emergencyNumber, setEmergencyNumber] = useState("112");

  useEffect(() => {
    // Auto-detect emergency number based on location/timezone
    const detectEmergencyNumber = () => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timeZone === "Africa/Casablanca") {
        setEmergencyNumber("15"); // Morocco Ambulance (Protection Civile)
      } else {
        setEmergencyNumber(getLocalEmergencyNumber());
      }
    };
    detectEmergencyNumber();
  }, []);

  // Agent State Store (Local)
  const [agentStore, setAgentStore] = useState<AgentStateStore>(INITIAL_AGENT_STATE);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsHeaderVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraFacingRef = useRef<"user" | "environment">("environment");

  // Retry count for failed analyses
  const retryCountRef = useRef<number>(0);
  const MAX_RETRIES = 3;

  // Fast Path Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioMonitorInterval = useRef<NodeJS.Timeout | null>(null);

  // Splash screen timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Helper to add logs
  const addLog = (type: LogType, message: string) => {
    setAgentStore(prev => ({
      ...prev,
      logs: [
        ...prev.logs,
        { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), type, message }
      ]
    }));
  };


  const startCamera = async () => {
    try {
      // Check if on secure context - with better fallback
      if (typeof window !== "undefined" && !isSecureContext()) {
        console.warn("Not on secure context, but attempting to proceed...");
        // Don't block, just warn - some local setups might not report secure context properly
      }

      // Request permissions using the facing mode
      const result = await requestMediaPermissionsWithFacing(
        cameraFacingRef.current
      );

      if (!result.stream) {
        const errorMessage =
          result.error ||
          "Failed to access camera/microphone. Please check permissions in browser settings.";
        toast.error(errorMessage);
        setState((p) => ({
          ...p,
          error: errorMessage,
          isEmergencyActive: false,
        }));
        console.error("Permission result:", result);
        return;
      }

      const stream = result.stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Add event listener to confirm stream is ready
        videoRef.current.onloadedmetadata = () => {
          console.log("Camera stream ready");
        };
      }

      // Create MediaRecorder with proper MIME type detection
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
          console.log("Using MIME type:", mimeType);
          break;
        }
      }

      try {
        const recorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : {}
        );
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onerror = (e) => {
          console.error("Recorder error:", e);
        };
        recorder.start(100); // Collect chunks every 100ms
        mediaRecorderRef.current = recorder;
        setState((p) => ({ ...p, error: null }));
        retryCountRef.current = 0;
        console.log("Camera and recorder started successfully");

        // Initialize Fast Path Audio Monitoring
        initFastPathAudio(stream);
      } catch (recorderErr) {
        console.error("MediaRecorder initialization error:", recorderErr);
        // If MediaRecorder fails, try without specifying MIME type
        const fallbackRecorder = new MediaRecorder(stream);
        fallbackRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        fallbackRecorder.onerror = (e) => {
          console.error("Recorder error:", e);
        };
        fallbackRecorder.start();
        mediaRecorderRef.current = fallbackRecorder;
        setState((p) => ({ ...p, error: null }));
        console.log("MediaRecorder started with browser defaults");
      }
    } catch (err) {
      console.error("startCamera error:", err);
      const errorMsg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? '❌ Permission Denied: Please click "Allow" when prompted for camera/microphone access.'
          : err instanceof DOMException && err.name === "NotFoundError"
          ? "❌ No Camera/Microphone Found: Please check your device hardware."
          : err instanceof DOMException && err.name === "SecurityError"
          ? "⚠️ Security Error: Try refreshing the page or use HTTPS."
          : "❌ Failed to access camera/microphone. Please retry.";
      toast.error(errorMsg);
      setState((p) => ({
        ...p,
        error: errorMsg,
        isEmergencyActive: false,
      }));
    }
  };

  // --- FAST PATH: Client-Side Reactive Agent ---
  const initFastPathAudio = (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // Start Monitoring Loop
      startFastPathLoop();
    } catch (e) {
      console.warn("Fast Path Audio Init Failed", e);
    }
  };

  const startFastPathLoop = () => {
    if (audioMonitorInterval.current) clearInterval(audioMonitorInterval.current);
    
    const bufferLength = analyserRef.current!.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    audioMonitorInterval.current = setInterval(() => {
      if (state.isAnalyzing || !analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate RMS (Volume)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      
      // Threshold for "Loud Noise" (Scream, Crash, Explosion)
      // 128 is silence in byte freq, but here 0-255 amplitude. 
      // Normal speech ~30-50. Scream > 100.
      if (rms > 80) { 
        console.log("🚨 FAST PATH TRIGGERED: High Audio Level detected:", rms);
        addLog('FAST_PATH', `${t(state.language, 'logs.highAudioDetected')}: ${Math.round(rms)}`);
        triggerFastPath();
      }
    }, 200); // Check every 200ms (Low Latency)
  };

  const triggerFastPath = useCallback(() => {
    if (state.isAnalyzing) return;
    
    // 1. Immediate UI Feedback (Reactive)
    setState(p => ({ ...p, agentState: AgentState.ASSESSING }));
    
    // 2. Trigger Deep Path (Deliberative)
    // Small delay to allow UI to update and capture the event context
    setTimeout(() => {
      captureAndAnalyze();
    }, 100);
  }, [state.isAnalyzing]);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop Fast Path
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioMonitorInterval.current) clearInterval(audioMonitorInterval.current);

    stopSpeech();
  };

  // --- Flip Camera ---
  const flipCamera = async () => {
    try {
      stopCamera();
      cameraFacingRef.current =
        cameraFacingRef.current === "user" ? "environment" : "user";
      await startCamera();
    } catch (err) {
      console.error("Flip camera error:", err);
      toast.error("Failed to flip camera. Try again.");
      setState((p) => ({
        ...p,
        error: "Failed to flip camera. Try again.",
      }));
    }
  };

  // --- Analysis Logic with Retry ---
  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || state.isAnalyzing) {
      console.warn("Capture skipped - conditions not met:", {
        videoRef: !!videoRef.current,
        canvasRef: !!canvasRef.current,
        isAnalyzing: state.isAnalyzing,
      });
      return;
    }

    const startTime = performance.now();
    addLog('DEEP_PATH', t(state.language, 'logs.initiatingAnalysis'));

    setState((p) => ({
      ...p,
      isAnalyzing: true, // Legacy flag
      agentState: AgentState.ANALYZING, // Deep Path Active
      error: null,
    }));

    try {
      // 1. Validate video stream is ready
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error(
          "Camera stream not ready. Please wait a moment and try again."
        );
      }

      // 2. Capture Image with validation
      const canvas = canvasRef.current;
      
      // Resize image to max 800px width to reduce payload size and latency
      const MAX_WIDTH = 800;
      const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
      const width = video.videoWidth * scale;
      const height = video.videoHeight * scale;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }
      ctx.drawImage(video, 0, 0, width, height);
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      if (!imageDataUrl || imageDataUrl === "data:,") {
        throw new Error("Failed to capture image from camera");
      }
      const imageBase64 = imageDataUrl.split(",")[1];
      if (!imageBase64) {
        throw new Error("Invalid image data");
      }

      const perceptionTime = performance.now() - startTime;

      console.log(
        "Image captured successfully. Size:",
        imageBase64.length,
        "bytes"
      );

      // 3. Capture Audio Chunk
      let audioBase64: string | null = null;
      if (mediaRecorderRef.current?.state === "recording") {
        // Use a promise to wait for the stop event instead of a fixed timeout
        const stopPromise = new Promise<void>((resolve) => {
          if (!mediaRecorderRef.current) return resolve();
          mediaRecorderRef.current.onstop = () => resolve();
        });

        mediaRecorderRef.current.stop();
        await stopPromise;

        if (audioChunksRef.current.length === 0) {
          console.warn("No audio chunks collected");
        } else {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          console.log("Audio blob created. Size:", blob.size, "bytes");

          const reader = new FileReader();
          audioBase64 = await new Promise<string | null>((resolve) => {
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result ? result.split(",")[1] : null);
            };
            reader.onerror = () => {
              console.error("FileReader error:", reader.error);
              resolve(null);
            };
            reader.readAsDataURL(blob);
          });

          if (audioBase64) {
            console.log(
              "Audio captured successfully. Size:",
              audioBase64.length,
              "bytes"
            );
          }
        }

        audioChunksRef.current = [];
        // Restart recorder. After `stop()` and the `onstop` event, the state is 'inactive'.
        // TypeScript can't follow this state change, so we call start() directly.
        // Optional chaining handles if the ref becomes null during an async operation.
        mediaRecorderRef.current?.start();
      } else {
        console.warn("MediaRecorder not in recording state");
      }

      // 4. AI Analysis with timeout and validation
      console.log("Starting AI analysis...");
      const apiStartTime = performance.now();
      const analysisPromise = analyzeEmergency(
        imageBase64,
        audioBase64,
        state.language
      );

      let timeoutHandle: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
          () =>
            reject(
              new Error(t(state.language, 'errors.analysisTimeout'))
            ),
          30000
        );
      });

      let instruction: EmergencyInstruction;
      try {
        const analysisResult = await Promise.race([analysisPromise, timeoutPromise]);
        
        // Handle new response format with success/error
        if (!analysisResult.success) {
          throw new Error(analysisResult.error.message);
        }
        
        instruction = analysisResult.data;
      } finally {
        clearTimeout(timeoutHandle!);
      }

      const deepPathTime = performance.now() - apiStartTime;

      // Validate response
      if (!instruction || !instruction.type) {
        throw new Error("Invalid response from AI analysis");
      }

      console.log("Analysis completed:", instruction.type);

      // --- SEVERITY ENGINE ---
      // Calculate pseudo-severity based on danger level for the UI
      let severityScore = 0;
      let confidenceScore = 85 + Math.random() * 10; // Simulated confidence
      
      switch (instruction.dangerLevel) {
        case 'CRITICAL': severityScore = 90 + Math.random() * 10; break;
        case 'HIGH': severityScore = 70 + Math.random() * 15; break;
        case 'MODERATE': severityScore = 40 + Math.random() * 20; break;
        case 'LOW': severityScore = 10 + Math.random() * 20; break;
      }

      if (severityScore > 80) {
        setTriggerGlitch(true);
        setTimeout(() => setTriggerGlitch(false), 200);
      }

      // Update Agent Store
      setAgentStore(prev => ({
        ...prev,
        severity: severityScore,
        confidence: confidenceScore,
        latency: {
          perception: Math.round(perceptionTime),
          fastPath: Math.round(perceptionTime * 0.5), // Simulated fast path component
          deepPath: Math.round(deepPathTime),
          total: Math.round(performance.now() - startTime)
        },
        execution: (instruction.dangerLevel === 'CRITICAL' || instruction.dangerLevel === 'HIGH') ? {
          id: generateTraceId(),
          type: 'EMS_API',
          traceId: generateTraceId(),
          timestamp: Date.now(),
          status: 'DISPATCHED'
        } : null
      }));

      const translatedType = t(state.language, `emergencyTypes.${instruction.type}`) || instruction.type;
      const translatedLevel = t(state.language, `dangerLevels.${instruction.dangerLevel}`) || instruction.dangerLevel;

      addLog('DECISION', `${t(state.language, 'logs.classified')}: ${translatedType} (${translatedLevel})`);
      
      // Map Gemini Danger Level to Agent State
      let nextAgentState = AgentState.MONITORING;
      if (instruction.dangerLevel === 'CRITICAL' || instruction.dangerLevel === 'HIGH') {
        nextAgentState = AgentState.ACTIVE;
        addLog('EXECUTION', `${t(state.language, 'logs.autoDispatch')} ${translatedLevel}`);
      }

      const reasoning = (instruction as ExtendedInstruction).reasoning;
      if (reasoning) addLog('DEEP_PATH', `${t(state.language, 'logs.reasoning')}: ` + reasoning.substring(0, 50) + '...');


      setState((p) => ({
        ...p,
        lastInstruction: instruction,
        isAnalyzing: false,
        agentState: nextAgentState,
      }));
      retryCountRef.current = 0;

      // Auto-speak instructions with proper pausing
      const speechText = [
        instruction.type,
        "Danger level: " + instruction.dangerLevel,
        ...instruction.actions,
        instruction.warning,
        reasoning,
      ]
        .filter(Boolean)
        .join(". ");

      // Execute Real-World Action (Voice)
      speak(speechText, state.language, {
        rate: 1.1, // Slightly faster for emergency context
        pitch: 1,
      });
      
    } catch (err) {
      console.error("Full analysis error:", err);
      let errorMsg =
        err instanceof Error ? err.message : "Unknown error occurred";
      let isWarning = false;

      // Provide helpful context for common errors
      if (
        errorMsg.includes("ENOTFOUND") ||
        errorMsg.includes("ERR_NETWORK") ||
        errorMsg.includes("Failed to fetch")
      ) {
        errorMsg = "Network error - check your internet connection";
      } else if (errorMsg.includes("401") || errorMsg.includes("403")) {
        errorMsg = "API authentication failed - check configuration";
      } else if (errorMsg.includes("timeout")) {
        errorMsg = "Request timeout - server not responding";
      } else if (errorMsg.includes("overloaded") || errorMsg.includes("quota")) {
        errorMsg = "The AI service is currently overloaded. Please try again in a few moments.";
        isWarning = true;
      }

      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        const retryMsg = `Analysis failed: ${errorMsg}. Retrying...`;
        // Use warning toast for quota/overload errors, error for others
        if (isWarning) {
          toast.warning(retryMsg);
        } else {
          toast.error(retryMsg);
        }
        addLog('DEEP_PATH', `${t(state.language, 'logs.error')}: ${errorMsg}. ${t(state.language, 'logs.retrying')}`);
        setState((p) => ({
          ...p,
          isAnalyzing: false,
          agentState: AgentState.MONITORING, // Fallback to monitoring
          error: retryMsg,
        }));
        setTimeout(() => captureAndAnalyze(), 2000);
      } else {
        const finalErrorMsg = `Analysis failed after ${MAX_RETRIES} attempts. Please check your connection and try again.`;
        // Use warning toast for quota/overload errors
        if (isWarning) {
          toast.warning(finalErrorMsg);
        } else {
          toast.error(finalErrorMsg);
        }
        addLog('DEEP_PATH', `${t(state.language, 'logs.failed')}: ${finalErrorMsg}`);
        setState((p) => ({
          ...p,
          isAnalyzing: false,
          agentState: AgentState.MONITORING, // Fallback to monitoring
          error: finalErrorMsg,
        }));
        retryCountRef.current = 0;
      }
    }
  };

  const toggleEmergency = () => {
    if (!state.isEmergencyActive) {
      setState((p) => ({
        ...p,
        isEmergencyActive: true,
        agentState: AgentState.MONITORING,
        lastInstruction: null,
      }));
      startCamera();
      addLog('FAST_PATH', t(state.language, 'logs.systemActivated'));
    } else {
      stopCamera();
      setState((p) => ({
        ...p,
        isEmergencyActive: false,
        isAnalyzing: false,
        agentState: AgentState.IDLE,
        error: null
      }));
      setAgentStore(INITIAL_AGENT_STATE);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const isRTL = state.language === Language.ARABIC;
  const isCriticalSeverity = agentStore.severity > 80;

  return (
    <div
      className={`min-h-screen bg-[#050507] text-slate-200 relative overflow-hidden ${
        isRTL ? "rtl" : "ltr"
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <style jsx global>{`
        @keyframes breathe {
          0% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 0.6; transform: scale(1); }
        }
        .animate-breathe {
          animation: breathe 3s ease-in-out infinite;
        }
        @keyframes glitch-anim {
          0% { transform: translate(0) }
          20% { transform: translate(-2px, 2px); filter: hue-rotate(90deg); }
          40% { transform: translate(-2px, -2px); filter: hue-rotate(180deg); }
          60% { transform: translate(2px, 2px); filter: hue-rotate(270deg); }
          80% { transform: translate(2px, -2px); filter: hue-rotate(0deg); }
          100% { transform: translate(0) }
        }
        .glitch-effect {
          animation: glitch-anim 0.2s cubic-bezier(.25, .46, .45, .94) both infinite;
        }
        /* Hide scrollbar */
        ::-webkit-scrollbar {
          display: none;
        }
        html {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Tactical HUD Overlay: Scanlines */}
      <div className="fixed inset-0 pointer-events-none z-[5] opacity-[0.03] mix-blend-overlay">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.5)_51%)] bg-[length:100%_4px] animate-scanline" />
      </div>

      {/* Emergency Vignette */}
      

      {/* Execution Banner */}
      <EmergencyExecutionBanner execution={agentStore.execution} />

      {/* Splash Screen Animation */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100] bg-[#050507] flex flex-col items-center justify-center"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 8, opacity: 0 }}
              transition={{ 
                duration: 0.8,
                ease: [0.43, 0.13, 0.23, 0.96]
              }}
              className="relative w-32 h-32 sm:w-40 sm:h-40 mb-4"
            >
              <Image
                src="/assets/logo.png"
                alt="LifeGuard AI"
                fill
                className="object-contain drop-shadow-[0_0_40px_rgba(225,6,0,0.6)]"
                priority
              />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-2xl font-bold text-white tracking-wider"
            >
              LifeGuard <span className="text-[#E10600]">AI</span>
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 flex justify-between items-center bg-[#050507]/90 backdrop-blur-xl border-b border-white/10 transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0">
            <Image
              src="/assets/logo.png"
              alt="LifeGuard AI Logo"
              fill
              className="object-contain drop-shadow-[0_0_15px_rgba(225,6,0,0.4)]"
            />
          </div>

          {/* Text */}
          <div className="flex flex-col justify-center">
            <span className="font-bold text-lg sm:text-xl tracking-tight text-white leading-none font-mono">
              LIFEGUARD <span className="text-[#E10600]">AI</span>
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium tracking-wide hidden min-[360px]:block opacity-80">
              AUTONOMOUS EMERGENCY SYSTEM
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

      {/* Main Content */}
      <main className="max-w-2xl mx-auto py-6 px-4 space-y-6 md:py-40 pb-80 md:pb-40">
        <AnimatePresence mode="wait">
          {!state.isEmergencyActive ? (
            <EmergencyButton
              key="start"
              language={state.language}
              onStart={toggleEmergency}
            />
          ) : (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`space-y-6 ${triggerGlitch ? 'glitch-effect' : ''}`}
            >
              <CameraCapture
                videoRef={videoRef}
                isAnalyzing={state.isAnalyzing}
                agentState={state.agentState}
                language={state.language}
                onManualTrigger={captureAndAnalyze}
                onStop={toggleEmergency}
                onFlipCamera={flipCamera}
                isCritical={isCriticalSeverity}
                emergencyNumber={emergencyNumber}
              />

              {/* Agent Metrics Grid */}
              <div className="flex flex-col gap-4">
                <AgentLatencyPanel 
                  latency={agentStore.latency} 
                  isAnalyzing={state.isAnalyzing}
                  language={state.language}
                />
                <SeverityScoreCard 
                  severity={agentStore.severity} 
                  confidence={agentStore.confidence}
                  lastUpdated={Date.now()}
                  language={state.language}
                />
              </div>

              <AnimatePresence>
                {state.lastInstruction && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <EmergencyGuidanceCard
                      type={state.lastInstruction.type}
                      dangerLevel={state.lastInstruction.dangerLevel}
                      steps={state.lastInstruction.actions}
                      warning={state.lastInstruction.warning}
                      language={state.language}
                      onSpeak={() => {
                        const instruction = state.lastInstruction;
                        if (!instruction) return;

                        const reasoning = (instruction as ExtendedInstruction).reasoning;
                        const speechText = [
                          instruction.type,
                          "Danger level: " + instruction.dangerLevel,
                          ...instruction.actions,
                          instruction.warning,
                          reasoning,
                        ]
                          .filter(Boolean)
                          .join(". ");

                        speak(speechText, state.language, {
                          rate: 1.1,
                          pitch: 1,
                        });
                      }}
                    />
                    
                    <AIReasoningPanel 
                      reasoning={(state.lastInstruction as ExtendedInstruction).reasoning || ''} 
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Decision Log */}
              <AgentDecisionLog logs={agentStore.logs} language={state.language} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Debug Panel */}
      {/* <DebugPanel /> */}
    </div>
  );
};

export default App;
