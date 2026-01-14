'use client';

import React, { useState, useEffect } from 'react';
import { Fingerprint } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { Language } from '@/types/gemini';
import { t } from '@/lib/translations';

interface EmergencyButtonProps {
  language: Language;
  onStart: () => void;
}

export default function EmergencyButton({
  language,
  onStart,
}: EmergencyButtonProps) {
  const isRTL = language === Language.ARABIC;
  const [isPressing, setIsPressing] = useState(false);
  const controls = useAnimation();

  // Handle the hold logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPressing) {
      controls.start({
        strokeDashoffset: 0,
        transition: { duration: 1.5, ease: "linear" }
      });
      timer = setTimeout(() => {
        onStart();
        setIsPressing(false); // Reset after trigger
      }, 1500); // 1.5 second hold time
    } else {
      controls.start({
        strokeDashoffset: 100, // Assuming pathLength is 100
        transition: { duration: 0.3, ease: "easeOut" }
      });
    }
    return () => clearTimeout(timer);
  }, [isPressing, onStart, controls]);

  return (
    <div className={`mt-20 flex flex-col items-center ${isRTL ? 'rtl' : 'ltr'}`}>
      
      <div className="relative w-56 h-56 flex items-center justify-center">
        {/* Progress Ring SVG */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          {/* Track */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="#334155" strokeWidth="4" />
          {/* Indicator */}
          <motion.circle
            cx="50" cy="50" r="46"
            fill="none"
            stroke="#ef4444"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ strokeDasharray: 289, strokeDashoffset: 289 }} // 2 * PI * 46 ≈ 289
            animate={controls}
            // Overriding SVG units mapping for easier calculation
            custom={289} 
            variants={{
                hidden: { strokeDashoffset: 289 },
                visible: { strokeDashoffset: 0 }
            }}
            style={{ pathLength: 1, strokeDashoffset: 1 }} // Using pathLength 1 for simpler math
          />
        </svg>

        {/* The Button */}
        <button
          onMouseDown={() => setIsPressing(true)}
          onMouseUp={() => setIsPressing(false)}
          onMouseLeave={() => setIsPressing(false)}
          onTouchStart={() => setIsPressing(true)}
          onTouchEnd={() => setIsPressing(false)}
          className={`
            w-44 h-44 rounded-full transition-all duration-200 
            flex flex-col items-center justify-center shadow-xl border-4
            ${isPressing 
              ? 'scale-95 bg-red-600 border-red-500 shadow-red-900/50' 
              : 'scale-100 bg-slate-900 border-slate-700 hover:border-red-500/50'}
          `}
        >
          <Fingerprint 
            className={`w-16 h-16 mb-2 transition-colors duration-300 ${isPressing ? 'text-white scale-110' : 'text-red-500'}`} 
          />
          <span className={`font-bold transition-colors ${isRTL ? 'text-base' : 'text-sm uppercase'} ${isPressing ? 'text-white' : 'text-slate-300'}`}>
            {isPressing ? t(language, 'app.holding') : t(language, 'app.startButton')}
          </span>
        </button>
      </div>

      <p className={`mt-4 text-slate-400 animate-pulse ${isRTL ? 'text-base' : 'text-sm'}`}>
        {isPressing ? t(language, 'app.keepHolding') : t(language, 'app.pressAndHold')}
      </p>
    </div>
  );
}