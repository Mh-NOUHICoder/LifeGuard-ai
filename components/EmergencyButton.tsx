'use client';

import React from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { Language } from '@/types/gemini';

interface EmergencyButtonProps {
  language: Language;
  onStart: () => void;
}

export default function EmergencyButton({
  language,
  onStart,
}: EmergencyButtonProps) {
  const isRTL = language === Language.ARABIC;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`mt-20 flex flex-col items-center text-center ${
        isRTL ? 'rtl' : 'ltr'
      }`}
    >
      <div className="relative mb-12">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-red-500 blur-3xl opacity-20 animate-pulse rounded-full" />

        {/* Main button */}
        <button
          onClick={onStart}
          className="relative w-48 h-48 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex flex-col items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.5)] border-8 border-red-900/50 font-black text-white"
        >
          <AlertCircle className="w-12 h-12 mb-2" />
          <span className="text-2xl">START</span>
        </button>
      </div>

      <p className="text-slate-400 max-w-xs text-sm">
        Tap to begin real-time emergency analysis and AI guidance.
      </p>
    </motion.div>
  );
}
