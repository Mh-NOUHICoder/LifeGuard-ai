'use client';

import React from 'react';
import { AlertCircle, Flame, Droplet, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { EmergencyType, EmergencyInstruction, Language } from '@/types/gemini';
import { t } from '@/lib/translations';

interface DangerAlertProps {
  instruction: EmergencyInstruction;
  language: Language;
  onSpeak: () => void;
}

export default function DangerAlert({
  instruction,
  language,
  onSpeak,
}: DangerAlertProps) {
  const isDangerCritical =
    instruction.dangerLevel === 'CRITICAL' ||
    instruction.dangerLevel === 'HIGH';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-2xl border shadow-xl ${
        isDangerCritical
          ? 'bg-red-950 border-red-700'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`p-3 rounded-xl ${
            instruction.type === EmergencyType.FIRE
              ? 'bg-red-500/20'
              : 'bg-blue-500/20'
          }`}
        >
          {instruction.type === EmergencyType.FIRE ? (
            <Flame className="text-red-500 w-6 h-6" />
          ) : (
            <Droplet className="text-blue-500 w-6 h-6" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{instruction.type}</h2>
          <span
            className={`text-xs font-bold uppercase tracking-tighter ${
              isDangerCritical
                ? 'text-red-400'
                : 'text-orange-400'
            }`}
          >
            {t(language, 'emergency.dangerLevel')}: {instruction.dangerLevel}
          </span>
        </div>
        <button
          onClick={onSpeak}
          className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
          title={t(language, 'app.repeatInstructions')}
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      {/* Actions */}
      <div className="space-y-4 mb-6">
        {instruction.actions.map((action, i) => (
          <div key={i} className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
              {i + 1}
            </span>
            <p className="text-slate-200 font-medium leading-relaxed">
              {action}
            </p>
          </div>
        ))}
      </div>

      {/* Warning */}
      {instruction.warning && (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3">
          <AlertCircle className="text-orange-500 flex-shrink-0 w-5 h-5 mt-0.5" />
          <p className="text-sm text-orange-200 font-semibold">
            {instruction.warning}
          </p>
        </div>
      )}
    </motion.div>
  );
}
