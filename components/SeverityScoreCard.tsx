'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Gauge, AlertTriangle } from 'lucide-react';
import { Language } from '@/types/gemini';
import { t } from '@/lib/translations';

interface SeverityScoreCardProps {
  severity: number; // 0-100
  confidence: number; // 0-100
  lastUpdated: number;
  language: Language;
}

export default function SeverityScoreCard({ severity, confidence, language }: SeverityScoreCardProps) {
  // Determine color based on severity
  // Calculate rotation: 0 -> -90deg, 100 -> 90deg
  const rotation = (severity / 100) * 180 - 90;

  const isCritical = severity >= 80;
  const ticks = [0, 25, 50, 75, 100];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      // Responsive classes: max-w-md for laptop, w-full for mobile
      className={`relative mx-auto w-full max-w-md overflow-hidden rounded-2xl p-6 shadow-xl backdrop-blur-xl border transition-all duration-700 ${
        isCritical 
          ? 'bg-[#0B0F14]/95 border-red-600 shadow-[0_0_50px_rgba(255,0,0,0.3)]' 
          : 'bg-[#0B0F14]/60 border-white/10 shadow-2xl'
      }`}
    >
      {/* Emergency Vignette Pulse Effect */}
      {isCritical && (
        <>
          <style jsx global>{`
            @keyframes EmergencyFlash {
              0%, 100% { opacity: 0.05; }
              50% { opacity: 0.2; }
            }
            .emergency-pulse {
              animation: EmergencyFlash 1.5s ease-in-out infinite;
            }
          `}</style>
          <div className="absolute inset-0 bg-red-600 emergency-pulse pointer-events-none z-0" />
        </>
      )}

      {/* Header Section */}
      <div className="relative z-10 flex justify-between items-start mb-8">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isCritical ? 'bg-red-500/20' : 'bg-slate-800/50'}`}>
            {isCritical ? (
              <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
            ) : (
              <Gauge className="w-5 h-5 text-emerald-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`text-sm font-bold font-mono tracking-tighter leading-tight ${isCritical ? 'text-red-500' : 'text-slate-200'}`}>
              {isCritical ? t(language, 'metrics.criticalThreat') : t(language, 'metrics.threatPriority')}
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mt-1 font-bold tracking-widest uppercase">{t(language, 'metrics.sceneIntel')}</p>
          </div>
        </div>
        <div className="text-right rtl:text-left flex-shrink-0 ml-4 rtl:ml-0 rtl:mr-4">
            <div className="text-[10px] text-slate-500 font-mono uppercase font-bold tracking-widest">{t(language, 'metrics.signalIntegrity')}</div>
            <div className={`text-sm font-black font-mono ${isCritical ? 'text-red-400' : 'text-emerald-400'}`}>
              {Math.round(confidence)}%
            </div>
        </div>
      </div>

      {/* Speedometer Gauge Container */}
      <div className="relative w-full max-w-[280px] mx-auto aspect-[2/1] flex items-end justify-center mb-4">
        <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible z-10">
          <defs>
            <linearGradient id="severity-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FF0000" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Background Track */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1a1f26" strokeWidth="14" strokeLinecap="round" />
          
          {/* Active Gradient Track */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#severity-gradient)" strokeWidth="14" strokeLinecap="round" className="opacity-80" filter={isCritical ? "url(#glow)" : ""} />

          {/* Ticks & Labels */}
          {ticks.map((tick) => {
            const angleDeg = 180 + (tick / 100) * 180;
            const rInner = 75;
            const rOuter = 88;
            const x1 = 100 + rInner * Math.cos(angleDeg * Math.PI / 180);
            const y1 = 100 + rInner * Math.sin(angleDeg * Math.PI / 180);
            const x2 = 100 + rOuter * Math.cos(angleDeg * Math.PI / 180);
            const y2 = 100 + rOuter * Math.sin(angleDeg * Math.PI / 180);

            return (
              <g key={tick}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isCritical ? "#991b1b" : "#334155"} strokeWidth="2" />
              </g>
            );
          })}
        </svg>

        {/* Improved Needle Component */}
        <motion.div
          className="absolute bottom-0 left-1/2 z-20"
          initial={{ rotate: -90 }}
          animate={{ 
            rotate: rotation,
            x: isCritical ? [0, 1, -1, 0] : 0 // Jitter effect on critical
          }}
          transition={{ 
            rotate: { type: "spring", stiffness: 60, damping: 12 },
            x: { repeat: Infinity, duration: 0.1 }
          }}
          style={{ transformOrigin: "bottom center", width: '2px', height: '85px', marginLeft: '-1px' }}
        >
          {/* The Needle Tip */}
          <div className={`w-full h-full rounded-full ${isCritical ? 'bg-red-500 shadow-[0_0_15px_#FF0000]' : 'bg-white shadow-[0_0_10px_white]'}`} />
        </motion.div>
        
        {/* Pivot Point */}
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-5 h-5 rounded-full z-30 border-4 ${
          isCritical ? 'bg-black border-red-600' : 'bg-black border-slate-700'
        }`} />
      </div>

      {/* Severity Score Display */}
      <div className="text-center relative z-10 pt-4">
         <motion.div
           key={severity}
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="relative inline-block"
         >
           <span className={`text-7xl font-black font-mono tracking-tighter ${isCritical ? 'text-red-600' : 'text-white'}`}>
             {Math.round(severity)}
           </span>
           {/* CRT Scanline Effect */}
           <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30" />
         </motion.div>
         
         <div className={`text-xs font-bold uppercase tracking-[0.3em] mt-2 ${isCritical ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>
           {t(language, 'metrics.alertMagnitude')}
         </div>
      </div>
    </motion.div>
  );
}