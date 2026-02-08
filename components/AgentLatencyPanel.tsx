'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Activity, ShieldCheck, Brain, Zap, CheckCircle2 } from 'lucide-react';
import { AgentLatency } from '@/types/agent';
import { Language } from '@/types/gemini';
import { t } from '@/lib/translations';

interface AgentLatencyPanelProps {
  latency: AgentLatency;
  isAnalyzing: boolean;
  language: Language;
}

type PipelineStage = {
  id: string;
  icon: React.ReactNode;
};

const PIPELINE: PipelineStage[] = [
  { id: 'vision', icon: <Activity className="w-4 h-4" /> },
  { id: 'spatial', icon: <Brain className="w-4 h-4" /> },
  { id: 'risk', icon: <Zap className="w-4 h-4" /> },
  { id: 'policy', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'final', icon: <Cpu className="w-4 h-4" /> }
];

export default function AgentLatencyPanel({
  latency,
  isAnalyzing,
  language
}: AgentLatencyPanelProps) {
  const [activeStage, setActiveStage] = useState(0);
  const [tps, setTps] = useState('0.0');

  useEffect(() => {
    if (!isAnalyzing) {
      setActiveStage(0);
      setTps('0.0');
      return;
    }

    const interval = setInterval(() => {
      setActiveStage((prev) => {
        if (prev < PIPELINE.length - 1) return prev + 1;
        return prev;
      });
      setTps((120 + Math.random() * 40).toFixed(1));
    }, 700 + Math.random() * 400); // organic timing

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const isComplete = !isAnalyzing && latency.total > 0;

  return (
    <div className="relative w-full bg-[#050507] border-2 border-emerald-500/20 rounded-xl p-5 font-mono shadow-[0_0_30px_rgba(16,185,129,0.08)] overflow-hidden">

      {/* Subtle scan glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/[0.02] to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-emerald-500/10 pb-3 mb-4">
        <div className="flex items-center gap-2 text-emerald-500/60 text-[10px] tracking-widest font-black uppercase">
          <Cpu className="w-3 h-3" />
          {t(language, 'pipeline.title')}
        </div>
        <div
          className={`w-2 h-2 rounded-full ${
            isAnalyzing ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-900'
          }`}
        />
      </div>

      {/* Pipeline */}
      <div className="space-y-2">
        {PIPELINE.map((stage, index) => {
          const isActive = isAnalyzing && index === activeStage;
          const isDone = index < activeStage || isComplete;

          return (
            <motion.div
              key={stage.id}
              layout
              className={`flex items-center justify-between px-3 py-2 rounded-md border transition-all ${
                isActive
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : isDone
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-white/5 bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`${
                    isActive
                      ? 'text-emerald-400'
                      : isDone
                      ? 'text-emerald-600'
                      : 'text-slate-500'
                  }`}
                >
                  {stage.icon}
                </div>

                <div className="text-xs">
                  <div
                    className={`font-bold ${
                      isActive
                        ? 'text-emerald-400'
                        : isDone
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {t(language, `pipeline.stages.${stage.id}`)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isActive
                      ? t(language, 'pipeline.status.processing')
                      : isDone
                      ? t(language, 'pipeline.status.completed')
                      : t(language, 'pipeline.status.queued')}
                  </div>
                </div>
              </div>

              {/* Right status */}
              <div className="flex items-center gap-2">
                {isActive && (
                  <motion.div
                    className="h-1 w-12 bg-emerald-500/20 overflow-hidden rounded-full"
                    initial={false}
                  >
                    <motion.div
                      className="h-full bg-emerald-500"
                      animate={{ x: [-48, 48] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    />
                  </motion.div>
                )}

                {isDone && !isActive && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer Telemetry */}
      <div className="mt-4 pt-3 border-t border-emerald-500/10 grid grid-cols-3 gap-3 text-[10px]">
        <div>
          <div className="text-emerald-500/40 uppercase">{t(language, 'pipeline.telemetry.tokensPerSec')}</div>
          <div className="text-emerald-500 font-bold">
            {tps}
          </div>
        </div>
        <div>
          <div className="text-emerald-500/40 uppercase">{t(language, 'pipeline.telemetry.activeModality')}</div>
          <div className="text-emerald-500 font-bold">{t(language, 'pipeline.telemetry.modalityValue')}</div>
        </div>
        <div>
          <div className="text-emerald-500/40 uppercase">{t(language, 'pipeline.telemetry.pipelineState')}</div>
          <div className="text-emerald-500 font-bold">
            {isAnalyzing ? 'EXECUTING' : isComplete ? 'COMPLETE' : 'IDLE'}
          </div>
        </div>
      </div>

      {/* Final Result Overlay */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between"
          >
            <div className="text-emerald-500 text-xs font-bold tracking-widest uppercase">
              {t(language, 'pipeline.complete')}
            </div>
            <div className="text-white font-black text-lg tabular-nums">
              {(latency.total / 1000).toFixed(2)}
              <span className="text-xs ml-1 text-emerald-500">SEC</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
