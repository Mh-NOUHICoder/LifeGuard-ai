"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";

import {
  Language,
  AppState,
  EmergencyInstruction,
} from "@/types/gemini";
import { analyzeEmergency } from "@/lib/gemini";
import { speak as textToSpeech, stopSpeech } from "@/lib/tts";
import {
  requestMediaPermissionsWithFacing,
  isSecureContext,
} from "@/lib/permissions";
import EmergencyButton from "@/components/EmergencyButton";
import CameraCapture from "@/components/CameraCapture";
import DangerAlert from "@/components/DangerAlert";
import LanguageSelector from "@/components/LanguageSelector";

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
    lastInstruction: null,
    error: null,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraFacingRef = useRef<"user" | "environment">("environment");

  // Retry count for failed analyses
  const retryCountRef = useRef<number>(0);
  const MAX_RETRIES = 3;

  // Splash screen timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // --- Speech Engine with error handling ---
  const speak = useCallback(
    (text: string) => {
      textToSpeech(text, state.language).catch((err) => {
        console.error("Speech synthesis failed:", err);
      });
    },
    [state.language]
  );

  // --- Media Management ---
  const stopMediaTracks = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
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
        setState((p) => ({
          ...p,
          error:
            result.error ||
            "Failed to access camera/microphone. Please check permissions in browser settings.",
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
        recorder.start();
        mediaRecorderRef.current = recorder;
        setState((p) => ({ ...p, error: null }));
        retryCountRef.current = 0;
        console.log("Camera and recorder started successfully");
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
      setState((p) => ({
        ...p,
        error: errorMsg,
        isEmergencyActive: false,
      }));
    }
  };

  // --- Flip Camera ---
  const flipCamera = async () => {
    try {
      stopMediaTracks();
      cameraFacingRef.current =
        cameraFacingRef.current === "user" ? "environment" : "user";
      await startCamera();
    } catch (err) {
      console.error("Flip camera error:", err);
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

    setState((p) => ({ ...p, isAnalyzing: true, error: null }));

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
              new Error(
                "Analysis took too long (>30 seconds). Check internet connection and try again."
              )
            ),
          30000
        );
      });

      let instruction: EmergencyInstruction;
      try {
        instruction = await Promise.race([analysisPromise, timeoutPromise]);
      } finally {
        clearTimeout(timeoutHandle!);
      }

      // Validate response
      if (!instruction || !instruction.type) {
        throw new Error("Invalid response from AI analysis");
      }

      console.log("Analysis completed:", instruction.type);

      setState((p) => ({
        ...p,
        lastInstruction: instruction,
        isAnalyzing: false,
      }));
      retryCountRef.current = 0;

      // Auto-speak instructions with proper pausing
      const speechText = [
        instruction.type,
        "Danger level: " + instruction.dangerLevel,
        ...instruction.actions,
        instruction.warning,
        (instruction as ExtendedInstruction).reasoning,
      ]
        .filter(Boolean)
        .join(". ");

      speak(speechText);
    } catch (err) {
      console.error("Full analysis error:", err);
      let errorMsg =
        err instanceof Error ? err.message : "Unknown error occurred";

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
      }

      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        setState((p) => ({
          ...p,
          isAnalyzing: false,
          error: `❌ Analysis failed (${retryCountRef.current}/${MAX_RETRIES}): ${errorMsg}. Retrying in 2 seconds...`,
        }));
        setTimeout(() => captureAndAnalyze(), 2000);
      } else {
        setState((p) => ({
          ...p,
          isAnalyzing: false,
          error: `Analysis failed after ${MAX_RETRIES} attempts: ${errorMsg}. Check connection and try again.`,
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
        lastInstruction: null,
      }));
      startCamera();
    } else {
      stopMediaTracks();
      stopSpeech();
      setState((p) => ({ ...p, isEmergencyActive: false }));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMediaTracks();
      stopSpeech();
    };
  }, []);

  const isRTL = state.language === Language.ARABIC;

  return (
    <div
      className={`min-h-screen bg-black text-slate-50 ${
        isRTL ? "rtl" : "ltr"
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Splash Screen Animation */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
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
                className="object-contain drop-shadow-[0_0_40px_rgba(239,68,68,0.6)]"
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
              LifeGuard <span className="text-red-500">AI</span>
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 flex justify-between items-center bg-black/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0">
            <Image
              src="/assets/logo.png"
              alt="LifeGuard AI Logo"
              fill
              className="object-contain drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]"
            />
          </div>

          {/* Text */}
          <div className="flex flex-col justify-center">
            <span className="font-bold text-lg sm:text-xl tracking-tight text-white leading-none">
              LifeGuard <span className="text-red-500">AI</span>
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium tracking-wide hidden min-[360px]:block opacity-80">
              Intelligent Emergency Response
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
              className="space-y-6"
            >
              <CameraCapture
                videoRef={videoRef}
                isAnalyzing={state.isAnalyzing}
                language={state.language}
                onAnalyze={captureAndAnalyze}
                onStop={toggleEmergency}
                onFlipCamera={flipCamera}
              />

              <AnimatePresence>
                {state.lastInstruction && (
                  <div className="mt-6 mb-24">
                    <DangerAlert
                      instruction={state.lastInstruction}
                      language={state.language}
                      onSpeak={() => {
                        const speechText = [
                          state.lastInstruction!.type,
                          "Danger level: " + state.lastInstruction!.dangerLevel,
                          ...state.lastInstruction!.actions,
                          state.lastInstruction!.warning,
                          (state.lastInstruction as ExtendedInstruction)
                            .reasoning,
                        ]
                          .filter(Boolean)
                          .join(". ");
                        speak(speechText);
                      }}
                    />
                    {/* Display reasoning if available */}
                    {(state.lastInstruction as ExtendedInstruction)
                      .reasoning && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800"
                      >
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                          AI Reasoning
                        </h3>
                        <p className="text-sm text-slate-200 leading-relaxed">
                          {
                            (state.lastInstruction as ExtendedInstruction)
                              .reasoning
                          }
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Error Toast */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 bg-red-900/90 backdrop-blur p-4 rounded-lg border border-red-700 flex justify-between items-center"
          >
            <p className="text-sm font-medium">{state.error}</p>
            <button
              onClick={() => setState((p) => ({ ...p, error: null }))}
              className="ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Panel */}
      {/* <DebugPanel /> */}
    </div>
  );
};

export default App;
