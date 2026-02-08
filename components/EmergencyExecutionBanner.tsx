'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, TriangleAlert } from 'lucide-react';
import { ExecutionEvent } from '@/types/agent';
import { toast } from 'sonner';

interface EmergencyExecutionBannerProps {
  execution: ExecutionEvent | null;
}

export default function EmergencyExecutionBanner({ execution }: EmergencyExecutionBannerProps) {
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showWarning, setShowWarning] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setShowWarning(p => !p), 500);
    return () => clearInterval(interval);
  }, []);

  if (!execution || execution.traceId === dismissedId) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(execution.traceId);
    setIsCopied(true);
    toast.success('Trace ID copied');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed top-20 left-4 right-4 md:top-24 md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-[60]"
      >
        <div className="bg-[#E10600] border border-white/20 shadow-[0_0_30px_rgba(225,6,0,0.6)] rounded-lg overflow-hidden">
          <div className="px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-white/20 rounded-full flex-shrink-0">
              {showWarning ? <TriangleAlert className="w-3.5 h-3.5 text-white" /> : <div className="w-3.5 h-3.5" />}
            </div>
            <div className="min-w-0 flex flex-col">
              <div className="text-[10px] font-bold text-white/90 uppercase tracking-wider leading-none mb-0.5">Autonomous Execution</div>
              <div className="font-black text-xs text-white leading-none truncate uppercase">
                DISPATCHING {execution.type}...
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
             <button 
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 bg-black/20 hover:bg-black/30 border border-white/10 rounded text-[10px] font-mono text-white/80 transition-colors"
              title="Copy Trace ID"
            >
              {isCopied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
              <span className="hidden sm:inline">{execution.traceId}</span>
              <span className="sm:hidden">ID</span>
            </button>
            <button 
              onClick={() => setDismissedId(execution.traceId)}
              className="p-1 hover:bg-black/20 rounded text-white/80 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="h-0.5 bg-black/20 w-full overflow-hidden">
          <motion.div 
            className="h-full bg-[#E10600] w-1/3" 
            animate={{ x: ["-100%", "400%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}