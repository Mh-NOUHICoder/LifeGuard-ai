'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';

interface AIReasoningPanelProps {
  reasoning: string;
}

export default function AIReasoningPanel({ reasoning }: AIReasoningPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!reasoning) return null;

  return (
    <div className="bg-[#0B0F14]/60 border border-white/20 rounded-2xl overflow-hidden backdrop-blur-xl">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-[#E10600]" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">AI Reasoning Engine</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6"
          >
            <p className="text-sm text-slate-200 leading-relaxed border-l-2 border-[#E10600]/30 pl-4 font-mono">
              {reasoning}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}