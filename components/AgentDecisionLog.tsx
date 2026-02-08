//Agent Decision Log 
'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ChevronDown } from 'lucide-react';
import { AgentLogEntry, LogType } from '@/types/agent';
import { Language } from '@/types/gemini';
import { t } from '@/lib/translations';

interface AgentDecisionLogProps {
  logs: AgentLogEntry[];
  language: Language;
}

export default function AgentDecisionLog({ logs, language }: AgentDecisionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getTypeColor = (type: LogType) => {
    switch (type) {
      case 'EXECUTION': return 'text-green-500';
      case 'POLICY': return 'text-orange-500';
      case 'DECISION': return 'text-cyan-400';
      case 'DEEP_PATH': return 'text-indigo-400';
      case 'FAST_PATH': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getPathColor = (path: string) => {
    switch (path) {
      case 'FAST': return 'text-yellow-400';
      case 'ESCALATED': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  const getSevColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'text-red-500';
      case 'HIGH': return 'text-orange-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="bg-black border border-blue-900/30 rounded-lg overflow-hidden flex flex-col h-48 sm:h-64 shadow-2xl font-mono text-[13px]">
      <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 opacity-50">
          <Terminal className="w-3 h-3" />
          <span className="text-[10px] font-bold tracking-widest">{t(language, 'app.agentLogTitle')}</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
        <AnimatePresence initial={false}>
          {logs.map((log) => {
            // Derive signals
            const traceId = log.id.substring(0, 6).toUpperCase();
            
            let path = 'DEEP';
            if (log.type === 'FAST_PATH') path = 'FAST';
            else if (log.type === 'EXECUTION' || log.message.includes('CRITICAL')) path = 'ESCALATED';

            let sev = 'NORMAL';
            const upperMsg = log.message.toUpperCase();
            if (upperMsg.includes('CRITICAL') || upperMsg.includes('EMERGENCY')) sev = 'CRITICAL';
            else if (upperMsg.includes('HIGH')) sev = 'HIGH';

            return (
             <motion.div 
              key={log.id} 
              initial={{ opacity: 0, x: -5 }} 
              animate={{ opacity: 1, x: 0 }} 
              className={`flex items-start gap-2 leading-relaxed ${log.message.includes('CRITICAL') || log.message.includes('EMERGENCY') ? 'bg-red-900/30 text-white px-2 py-0.5 rounded border-l-2 border-[#E10600]' : ''}`}
            >
              <span className="text-slate-600 flex-shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]</span>
              
              {/* Observability Badges */}
              <span className="text-[10px] text-slate-700 font-bold tracking-wider flex-shrink-0 opacity-60">[TRACE:{traceId}]</span>
              <span className={`text-[10px] font-bold tracking-wider flex-shrink-0 ${getPathColor(path)} opacity-80`}>[PATH:{path}]</span>
              <span className={`text-[10px] font-bold tracking-wider flex-shrink-0 ${getSevColor(sev)} opacity-80`}>[SEV:{sev}]</span>

              <span className={`font-bold flex-shrink-0 ${getTypeColor(log.type)}`}>{log.type}:</span>
              <span className={`${log.message.includes('CRITICAL') || log.message.includes('EMERGENCY') ? 'text-white font-bold' : 'text-slate-300'} break-words`}>{log.message}</span>
            </motion.div>
          );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}