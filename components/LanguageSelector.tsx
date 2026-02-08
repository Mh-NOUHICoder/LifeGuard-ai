'use client';

import React, { useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Language } from '@/types/gemini';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export default function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-all backdrop-blur-md active:scale-95"
      >
        <Globe className="w-4 h-4 text-[#E10600]" />
        <span className="text-xs font-medium hidden sm:block font-mono uppercase">{selectedLanguage}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-2 w-40 bg-[#0B0F14] backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50 py-1 ring-1 ring-black/5"
            >
              {Object.values(Language).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    onLanguageChange(lang);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-xs sm:text-sm flex items-center justify-between hover:bg-white/5 transition-colors font-mono uppercase ${
                    selectedLanguage === lang ? 'text-[#E10600] font-bold bg-[#E10600]/10' : 'text-slate-300'
                  }`}
                >
                  {lang}
                  {selectedLanguage === lang && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
