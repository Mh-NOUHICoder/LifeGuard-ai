'use client';

import React, { RefObject, useState } from 'react';
import { Camera, X, SwitchCamera, Phone, Loader2, Circle } from 'lucide-react';
import { Language } from '@/types/gemini';
import { t } from '@/lib/translations';
import { getLocalEmergencyNumber, triggerEmergencyDialer } from '@/lib/utils';

interface CameraCaptureProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isAnalyzing: boolean;
  language: Language;
  onAnalyze: () => void;
  onStop: () => void;
  onFlipCamera: () => void;
}

export default function CameraCapture({
  videoRef,
  isAnalyzing,
  language,
  onAnalyze,
  onStop,
  onFlipCamera,
}: CameraCaptureProps) {
  const [emergencyNumber] = useState(getLocalEmergencyNumber());

  return (
    <div className="space-y-6">
      {/* Camera Feed */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800 shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {isAnalyzing && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="font-bold text-blue-400 tracking-widest animate-pulse">
              {t(language, 'app.analyzing')}
            </span>
          </div>
        )}

        <div className="absolute top-4 right-4 px-3 py-1 bg-red-600 text-[10px] font-bold rounded-full animate-pulse flex items-center gap-1">
          {t(language, 'app.recording')}{' '}
          <Circle className="w-2 h-2 fill-white" />
        </div>

        {/* Flip Camera Button */}
        <button
          onClick={onFlipCamera}
          className="absolute top-4 left-4 p-2 bg-slate-800/60 hover:bg-slate-700/80 rounded-full transition-colors backdrop-blur-sm"
          title={t(language, 'app.flipCamera')}
        >
          <SwitchCamera className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 sm:gap-4 flex-wrap">
        <button
          onClick={() => triggerEmergencyDialer(emergencyNumber)}
          className="flex-1 min-w-max bg-white text-black h-14 sm:h-16 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors shadow-lg"
        >
          <Phone className="w-5 h-5" />
          {t(language, 'app.callEmergency')} ({emergencyNumber})
        </button>
        <button
          onClick={onStop}
          className="px-4 sm:px-8 h-14 sm:h-16 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-red-900/40 hover:text-red-400 transition-all flex items-center gap-2 whitespace-nowrap text-sm sm:text-base"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" /> {t(language, 'app.exit')}
        </button>
      </div>

      {/* Floating Analyze Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
        <div className="max-w-2xl mx-auto space-y-3">
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all ${
              isAnalyzing
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)]'
            }`}
          >
            <Camera className={isAnalyzing ? 'animate-pulse' : ''} />
            {isAnalyzing ? (
              <>
                <Loader2 className="animate-spin" />
                {t(language, 'app.processing')}
              </>
            ) : (
              t(language, 'app.analyzeScene')
            )}
          </button>
          {!isAnalyzing && (
            <p className="text-xs text-slate-400 text-center">
              {t(language, 'app.pointCamera')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}