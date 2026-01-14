'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X } from 'lucide-react';

import { Language, AppState, EmergencyType, EmergencyInstruction } from '@/types/gemini';
import { analyzeEmergency } from '@/lib/gemini';
import { speak as textToSpeech, stopSpeech } from '@/lib/tts';
import { requestMediaPermissions, isSecureContext } from '@/lib/permissions';
import EmergencyButton from '@/components/EmergencyButton';
import CameraCapture from '@/components/CameraCapture';
import DangerAlert from '@/components/DangerAlert';
import LanguageSelector from '@/components/LanguageSelector';
import ErrorToast from '@/components/ErrorToast';
import DebugPanel from '@/components/DebugPanel';

const App: React.FC = () => {
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

  // Retry count for failed analyses
  const retryCountRef = useRef<number>(0);
  const MAX_RETRIES = 3;

  // --- Speech Engine with error handling ---
  const speak = useCallback(
    (text: string) => {
      textToSpeech(text, state.language).catch((err) => {
        console.error('Speech synthesis failed:', err);
      });
    },
    [state.language]
  );

  // --- Media Management ---
  const stopMediaTracks = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    try {
      // Check if on secure context - with better fallback
      if (typeof window !== 'undefined' && !isSecureContext()) {
        console.warn('Not on secure context, but attempting to proceed...');
        // Don't block, just warn - some local setups might not report secure context properly
      }

      // Request permissions using the new utility
      const result = await requestMediaPermissions();

      if (!result.stream) {
        setState((p) => ({
          ...p,
          error: result.error || 'Failed to access camera/microphone. Please check permissions in browser settings.',
          isEmergencyActive: false,
        }));
        console.error('Permission result:', result);
        return;
      }

      const stream = result.stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Add event listener to confirm stream is ready
        videoRef.current.onloadedmetadata = () => {
          console.log('Camera stream ready');
        };
      }

      // Create MediaRecorder with proper MIME type detection
      let mimeType = '';
      const possibleMimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      
      for (const type of possibleMimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('Using MIME type:', mimeType);
          break;
        }
      }

      try {
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onerror = (e) => {
          console.error('Recorder error:', e);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setState((p) => ({ ...p, error: null }));
        retryCountRef.current = 0;
        console.log('Camera and recorder started successfully');
      } catch (recorderErr) {
        console.error('MediaRecorder initialization error:', recorderErr);
        // If MediaRecorder fails, try without specifying MIME type
        const fallbackRecorder = new MediaRecorder(stream);
        fallbackRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        fallbackRecorder.onerror = (e) => {
          console.error('Recorder error:', e);
        };
        fallbackRecorder.start();
        mediaRecorderRef.current = fallbackRecorder;
        setState((p) => ({ ...p, error: null }));
        console.log('MediaRecorder started with browser defaults');
      }
    } catch (err) {
      console.error('startCamera error:', err);
      const errorMsg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? '❌ Permission Denied: Please click "Allow" when prompted for camera/microphone access.'
          : err instanceof DOMException && err.name === 'NotFoundError'
          ? '❌ No Camera/Microphone Found: Please check your device hardware.'
          : err instanceof DOMException && err.name === 'SecurityError'
          ? '⚠️ Security Error: Try refreshing the page or use HTTPS.'
          : '❌ Failed to access camera/microphone. Please retry.';
      setState((p) => ({
        ...p,
        error: errorMsg,
        isEmergencyActive: false,
      }));
    }
  };

  // --- Analysis Logic with Retry ---
  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || state.isAnalyzing) return;

    setState((p) => ({ ...p, isAnalyzing: true, error: null }));

    try {
      // 1. Capture Image
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

      // 2. Capture Audio Chunk
      let audioBase64: string | null = null;
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        await new Promise((r) => setTimeout(r, 400));

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        audioBase64 = await new Promise<string | null>((resolve) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result ? result.split(',')[1] : null);
          };
          reader.readAsDataURL(blob);
        });

        audioChunksRef.current = [];
        mediaRecorderRef.current.start();
      }

      // 3. AI Analysis with timeout
      const analysisPromise = analyzeEmergency(
        imageBase64,
        audioBase64,
        state.language
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timeout')), 30000)
      );

      const instruction: EmergencyInstruction = await Promise.race([
        analysisPromise,
        timeoutPromise,
      ]);

      setState((p) => ({
        ...p,
        lastInstruction: instruction,
        isAnalyzing: false,
      }));
      retryCountRef.current = 0;

      // Auto-speak instructions with proper pausing
      const speechText = [
        instruction.type,
        'Danger level: ' + instruction.dangerLevel,
        ...instruction.actions,
        instruction.warning,
      ]
        .filter(Boolean)
        .join('. ');

      speak(speechText);
    } catch (err) {
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        setState((p) => ({
          ...p,
          isAnalyzing: false,
          error: `Analysis failed (attempt ${retryCountRef.current}/${MAX_RETRIES}). Retrying...`,
        }));
        setTimeout(() => captureAndAnalyze(), 2000);
      } else {
        setState((p) => ({
          ...p,
          isAnalyzing: false,
          error:
            'Analysis failed after multiple attempts. Check connection and try again.',
        }));
        retryCountRef.current = 0;
      }
    }
  };

  const toggleEmergency = () => {
    if (!state.isEmergencyActive) {
      setState((p) => ({ ...p, isEmergencyActive: true, lastInstruction: null }));
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
      className={`min-h-screen bg-slate-950 text-slate-50 ${
        isRTL ? 'rtl' : 'ltr'
      }`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 p-4 flex justify-between items-center bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <ShieldAlert className="text-red-500 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">LifeGuard AI</h1>
            <p className="text-[10px] text-slate-400">Real-time Emergency Response</p>
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
      <main className="max-w-2xl mx-auto py-6 px-4 space-y-6 md:py-40">
        <AnimatePresence mode="wait">
          {!state.isEmergencyActive ? (
            <EmergencyButton
              key="start"
              language={state.language}
              onStart={toggleEmergency}
            />
          ) : (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CameraCapture
                videoRef={videoRef}
                isAnalyzing={state.isAnalyzing}
                onAnalyze={captureAndAnalyze}
                onStop={toggleEmergency}
              />

              <AnimatePresence>
                {state.lastInstruction && (
                  <div className="mt-6">
                    <DangerAlert
                      instruction={state.lastInstruction}
                      onSpeak={() => {
                        const speechText = [
                          state.lastInstruction!.type,
                          'Danger level: ' +
                            state.lastInstruction!.dangerLevel,
                          ...state.lastInstruction!.actions,
                          state.lastInstruction!.warning,
                        ]
                          .filter(Boolean)
                          .join('. ');
                        speak(speechText);
                      }}
                    />
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
            <button onClick={() => setState(p => ({ ...p, error: null }))} className="ml-4">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Panel */}
      <DebugPanel />
    </div>
  );
};

export default App;