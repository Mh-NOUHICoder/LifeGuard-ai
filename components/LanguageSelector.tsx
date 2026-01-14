'use client';

import React from 'react';
import { Language } from '@/types/gemini';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export default function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
}: LanguageSelectorProps) {
  return (
    <div className="flex bg-slate-800 p-1 rounded-lg gap-1">
      {Object.values(Language).map((lang) => (
        <button
          key={lang}
          onClick={() => onLanguageChange(lang)}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
            selectedLanguage === lang
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
