'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, AlertTriangle, Flame, Droplet, Activity } from 'lucide-react';
import { Language } from '@/types/gemini';
import { t } from '@/lib/translations';

interface EmergencyGuidanceCardProps {
  type: string;
  dangerLevel: string;
  steps: string[];
  warning?: string;
  onSpeak: () => void;
  language: Language;
}

export default function EmergencyGuidanceCard({ type, dangerLevel, steps, warning, onSpeak, language }: EmergencyGuidanceCardProps) {
  const isCritical = dangerLevel === 'CRITICAL' || dangerLevel === 'HIGH';

  const getIcon = () => {
    const iconClass = `w-7 h-7 ${isCritical ? 'text-red-500' : 'text-emerald-500'}`;
    if (type.toLowerCase().includes('fire')) return <Flame className={iconClass} />;
    if (type.toLowerCase().includes('bleed') || type.toLowerCase().includes('blood')) return <Droplet className={iconClass} />;
    return <Activity className={iconClass} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-3xl border-2 shadow-2xl backdrop-blur-2xl transition-colors duration-500 ${
        isCritical 
          ? 'bg-slate-950/80 border-red-500/50 shadow-red-900/20' 
          : 'bg-slate-950/80 border-emerald-500/30 shadow-emerald-900/10'
      }`}
    >
      {/* Top Status Bar */}
      <div className={`h-1.5 w-full ${isCritical ? 'bg-red-600' : 'bg-emerald-500'} animate-pulse`} />

      {/* Header Section */}
      <div className="p-6 md:p-8 flex items-center justify-between gap-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-5">
          <div className={`relative p-4 rounded-2xl flex items-center justify-center ${
            isCritical ? 'bg-red-500/10 ring-1 ring-red-500/50' : 'bg-emerald-500/10 ring-1 ring-emerald-500/50'
          }`}>
            {getIcon()}
            {isCritical && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>
          
          <div>
            <div className={`flex items-center gap-2 mb-1`}>
              <span className={`text-[10px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded ${
                isCritical ? 'bg-red-500 text-white' : 'bg-emerald-500 text-slate-950'
              }`}>
                {t(language, `dangerLevels.${dangerLevel}`) || dangerLevel}
              </span>
              <span className="text-white/40 text-[10px] font-mono tracking-widest uppercase">{t(language, 'app.systemActive')}</span>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase italic leading-none">
              {t(language, `emergencyTypes.${type}`) || type}
            </h2>
          </div>
        </div>

        <button 
          onClick={onSpeak}
          className="group relative p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-90"
          aria-label="Listen to instructions"
        >
          <Volume2 className="w-6 h-6 text-white group-hover:text-emerald-400 transition-colors" />
        </button>
      </div>

      <div className="p-6 md:p-8">
        {/* Warning Alert - Only shows if warning exists */}
        <AnimatePresence>
          {warning && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mb-8 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex gap-3 items-center"
            >
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
              <p className="text-orange-200 text-sm font-bold uppercase tracking-wide leading-tight">
                {warning}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Steps List */}
        <div className="relative space-y-8">
          {/* Vertical Timeline Line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-white/20 via-white/10 to-transparent" />

          {steps.map((step, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
              className="relative flex gap-6"
            >
              {/* Step Number Circle */}
              <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                index === 0 
                  ? (isCritical ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white text-black') 
                  : 'bg-slate-900 border border-white/20 text-white/60'
              }`}>
                {index + 1}
              </div>

              <div className="flex-1 pt-1">
                <p className={`text-xl md:text-2xl leading-snug font-semibold tracking-tight ${
                  index === 0 ? 'text-white' : 'text-slate-400'
                }`}>
                  {step}
                </p>
                {index === 0 && (
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: '100%' }} 
                    className={`h-0.5 mt-2 rounded-full ${isCritical ? 'bg-red-500/50' : 'bg-emerald-500/50'}`} 
                  />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-8 py-4 bg-white/[0.03] flex justify-between items-center text-[10px] font-mono text-white/30 uppercase tracking-[0.3em]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Real-time Guidance
        </div>
        <span>Step {steps.length} of {steps.length}</span>
      </div>
    </motion.div>
  );
}