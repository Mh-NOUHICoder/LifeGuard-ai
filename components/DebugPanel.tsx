'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';

interface DebugInfo {
  https: boolean;
  mediaDevices: boolean;
  getUserMedia: boolean;
  speechSynthesis: boolean;
  canvas: boolean;
}

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    https: false,
    mediaDevices: false,
    getUserMedia: false,
    speechSynthesis: false,
    canvas: false,
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const info: DebugInfo = {
      https: typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'),
      mediaDevices: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
      getUserMedia: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
      speechSynthesis: typeof window !== 'undefined' && !!window.speechSynthesis,
      canvas: typeof HTMLCanvasElement !== 'undefined',
    };
    setDebugInfo(info);

    // Get available voices
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        console.log('[DebugPanel] Available voices:', availableVoices);
      };

      // Load voices - may need event listener
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const allGood = Object.values(debugInfo).every(v => v);

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg border border-slate-700 flex items-center gap-2 text-xs"
      >
        {allGood ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        )}
        Debug
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 bg-slate-800 border border-slate-700 rounded-lg p-3 w-72 text-xs space-y-2 text-slate-300 max-h-96 overflow-y-auto">
          {Object.entries(debugInfo).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="capitalize">{key}:</span>
              <span className={value ? 'text-green-400' : 'text-red-400'}>
                {value ? '✓' : '✗'}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-slate-700">
            <p className="text-slate-400 font-bold mb-1">Available Voices ({voices.length}):</p>
            {voices.length > 0 ? (
              <div className="space-y-1">
                {voices.map((voice, i) => (
                  <div key={i} className="text-[10px] text-slate-400 truncate">
                    <span className={voice.lang.includes('ar') ? 'text-blue-400' : voice.lang.includes('fr') ? 'text-purple-400' : 'text-green-400'}>
                      {voice.name}
                    </span>
                    <span className="text-slate-500"> ({voice.lang})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-red-400">No voices available</p>
            )}
          </div>
          <div className="pt-2 border-t border-slate-700 text-slate-400">
            <p>Check browser console for detailed logs</p>
          </div>
        </div>
      )}
    </div>
  );
}
