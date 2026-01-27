'use client';

import React, { useState, useEffect } from 'react';
import { Siren } from 'lucide-react';
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

  const CIRCUMFERENCE = 2 * Math.PI * 46; // ≈ 289

  // Press & hold logic
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (isPressing) {
      controls.start({
        strokeDashoffset: 0,
        transition: { duration: 1.5, ease: 'linear' },
      });

      timer = setTimeout(() => {
        onStart();
        setIsPressing(false);
      }, 1500);
    } else {
      controls.start({
        strokeDashoffset: CIRCUMFERENCE,
        transition: { duration: 0.3, ease: 'easeOut' },
      });
    }

    return () => timer && clearTimeout(timer);
  }, [isPressing, onStart, controls, CIRCUMFERENCE]);

  return (
    <div className={`mt-20 flex flex-col items-center ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="relative w-56 h-56 flex items-center justify-center">

        {/* LIVE EMERGENCY GLOW */}
        {!isPressing && (
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500/20 blur-2xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        )}

        {/* PROGRESS RING */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 100 100"
        >
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="#f31515ef"
            strokeWidth="4"
          />

          {/* Live / Progress Ring */}
          <motion.circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="#ef4444"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animate={
              isPressing
                ? controls
                : {
                    rotate: 360,
                    opacity: [0.6, 1, 0.6],
                  }
            }
            transition={
              isPressing
                ? undefined
                : {
                    rotate: {
                      duration: 6,
                      ease: 'linear',
                      repeat: Infinity,
                    },
                    opacity: {
                      duration: 1.8,
                      repeat: Infinity,
                    },
                  }
            }
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
          />
        </svg>

        {/* MAIN BUTTON */}
        <button
          onMouseDown={() => setIsPressing(true)}
          onMouseUp={() => setIsPressing(false)}
          onMouseLeave={() => setIsPressing(false)}
          onTouchStart={() => setIsPressing(true)}
          onTouchEnd={() => setIsPressing(false)}
          className={`
            relative z-10 w-44 h-44 rounded-full border-4
            flex flex-col items-center justify-center
            transition-all duration-200 shadow-xl
            ${
              isPressing
                ? 'scale-95 bg-red-600 border-red-500 shadow-red-900/60'
                : 'bg-slate-900 border-slate-700 hover:border-red-500/70 animate-emergency'
            }
          `}
        >
          <Siren
            className={`w-16 h-16 mb-2 transition-all ${
              isPressing ? 'text-white scale-110' : 'text-red-500'
            }`}
          />

          <span
            className={`font-bold transition-colors ${
              isRTL ? 'text-base' : 'text-sm uppercase'
            } ${isPressing ? 'text-white' : 'text-slate-300'}`}
          >
            {isPressing
              ? t(language, 'app.holding')
              : t(language, 'app.startButton')}
          </span>
        </button>
      </div>

      {/* HELPER TEXT */}
      <p
        className={`mt-4 text-slate-400 animate-pulse ${
          isRTL ? 'text-base' : 'text-sm'
        }`}
      >
        {isPressing
          ? t(language, 'app.keepHolding')
          : t(language, 'app.pressAndHold')}
      </p>
    </div>
  );
}
