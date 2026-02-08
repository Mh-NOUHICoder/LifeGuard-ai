'use client';

import React, { RefObject, useEffect } from 'react';
import { Camera, X, SwitchCamera, Phone, Loader2, Circle, Activity, Eye, Zap } from 'lucide-react';
import { Language, AgentState } from '@/types/gemini';
import { t } from '@/lib/translations';
import { triggerEmergencyDialer } from '@/lib/utils';

interface CameraCaptureProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isAnalyzing: boolean;
  agentState: AgentState;
  language: Language;
  onManualTrigger: () => void;
  onCancelAnalysis: () => void;
  onStop: () => void;
  onFlipCamera: () => void;
  isCritical: boolean;
  emergencyNumber: string;
  onStartStream?: () => void;
}

export default function CameraCapture({
  videoRef,
  agentState,
  language,
  onManualTrigger,
  onCancelAnalysis,
  onStop,
  onFlipCamera,
  isCritical: isCriticalProp,
  emergencyNumber,
  onStartStream,
}: CameraCaptureProps) {
  // Determine UI state based on Agent State
  const isMonitoring = agentState === AgentState.MONITORING;
  const isFastPathActive = agentState === AgentState.ASSESSING;
  const isDeepPathActive = agentState === AgentState.ANALYZING || agentState === AgentState.VERIFYING;
  const isCritical = isCriticalProp || agentState === AgentState.ACTIVE;

  // useEffect(() => {
  //   if (onStartStream) {
  //     onStartStream();
  //   }
  // }, [onStartStream]);

  const getBorderColor = () => {
    if (isCritical) return 'border-[#E10600] shadow-[0_0_30px_rgba(225,6,0,0.6)] animate-pulse';
    if (isDeepPathActive) return 'border-[#00F2FF] shadow-[0_0_20px_rgba(0,242,255,0.4)]';
    if (isFastPathActive) return 'border-[#00F2FF] shadow-[0_0_20px_rgba(0,242,255,0.4)]';
    if (isMonitoring) return 'border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
    return 'border-slate-800';
  };

  return (
    <div className="space-y-6">
      {/* Camera Feed */}
      <div className={`relative rounded-lg overflow-hidden bg-black aspect-video border-2 shadow-2xl transition-all duration-500 ${getBorderColor()}`}>
        
        {/* Agent HUD Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
           <div className="flex items-center gap-2">
              <Activity className={`w-5 h-5 ${isMonitoring ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-xs font-mono text-emerald-400/80">
                {isMonitoring ? t(language, 'hud.fastPathActive') : t(language, 'hud.systemReady')}
              </span>
           </div>
        </div>

        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Deep Path Overlay */}
        {isDeepPathActive && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#00F2FF] blur-xl rounded-full animate-pulse" />
              <Loader2 className="w-16 h-16 text-[#00F2FF] animate-spin relative z-10" />
            </div>
            <span className="mt-4 font-black text-[#00F2FF] tracking-widest animate-pulse text-lg font-mono">
              {t(language, 'app.deepPathProcess')}
            </span>
            <span className="text-xs text-[#00F2FF]/70 mt-2 font-mono uppercase">{t(language, 'hud.reasoningEngine')}</span>
          </div>
        )}

        {/* Fast Path Trigger Overlay */}
        {isFastPathActive && (
           <div className="absolute inset-0 border-4 border-[#00F2FF]/50 flex items-center justify-center">
            <span className="bg-[#00F2FF] text-black px-4 py-2 rounded-lg font-bold animate-bounce font-mono">
              {t(language, 'app.fastPathTrigger')}
            </span>
          </div>
        )}

        <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4 px-3 py-1 bg-[#E10600] text-[10px] font-bold rounded-sm animate-pulse flex items-center gap-1 font-mono">
          {t(language, 'app.recording')}{' '}
          <Circle className="w-2 h-2 fill-white" />
        </div>

        {/* Flip Camera Button */}
        <button
          onClick={onFlipCamera}
          className="absolute bottom-4 right-4 rtl:right-auto rtl:left-4 p-2 bg-black/60 hover:bg-black/80 border border-white/10 rounded-lg transition-colors backdrop-blur-sm"
          title={t(language, 'app.flipCamera')}
        >
          <SwitchCamera className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 sm:gap-3 flex-nowrap">
        <button
          onClick={() => triggerEmergencyDialer(emergencyNumber)}
          className={`flex-1 bg-[#E10600] text-white h-12 sm:h-14 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-[#c00500] transition-all shadow-lg font-mono uppercase tracking-wider px-2 ${
            isCritical ? 'shadow-[0_0_25px_rgba(225,6,0,0.4)] border border-white/20' : ''
          }`}
        >
          <Phone className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="truncate">{t(language, 'app.callEmergency')} ({emergencyNumber})</span>
        </button>
        <button
          onClick={onStop}
          className="flex-shrink-0 px-4 sm:px-6 h-12 sm:h-14 bg-slate-900/80 backdrop-blur-md border border-white/20 text-slate-200 rounded-xl font-bold hover:bg-red-950/40 hover:text-red-400 transition-all flex items-center gap-2 whitespace-nowrap text-sm sm:text-base font-mono uppercase"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden xs:inline">{t(language, 'app.exit')}</span>
        </button>
      </div>

      {/* Agent Status / Manual Trigger */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-50">
        <div className="max-w-2xl mx-auto space-y-3">
          <button
            onClick={isDeepPathActive ? onCancelAnalysis : onManualTrigger}
            className={`w-full py-4 rounded-xl font-black text-lg sm:text-xl flex items-center justify-center gap-2 transition-all border ${
              isDeepPathActive
                ? 'bg-slate-900/80 text-red-400 border-red-500/50 hover:bg-red-900/20 cursor-pointer'
                : isMonitoring 
                  ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/50 hover:bg-emerald-900/50'
                  : isCritical
                    ? 'bg-[#E10600] text-white border-[#E10600] opacity-90'
                  : 'bg-[#E10600] hover:bg-[#c00500] text-white border-[#E10600] shadow-[0_0_20px_rgba(225,6,0,0.4)]'
            }`}
          >
            {isDeepPathActive ? (
              <>
                <X className="w-5 h-5 animate-pulse text-red-400" />
                {t(language, 'app.stopAnalysis')}
              </>
            ) : (
              <>
                {isMonitoring ? <Eye className="w-5 h-5 animate-pulse" /> : <Camera className="w-5 h-5" />}
                {isMonitoring ? t(language, 'app.monitoring') : t(language, 'app.analyzeScene')}
              </>
            )}
          </button>
          
          {!isDeepPathActive && (
            <p className="text-xs text-slate-400 text-center font-mono uppercase tracking-widest font-bold">
              {t(language, 'app.pointCamera')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}