'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  return (
    <div className="fixed bottom-32 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-96 bg-red-600 p-4 rounded-xl flex items-center gap-3 shadow-2xl z-[100] animate-in slide-in-from-bottom">
      <AlertCircle className="flex-shrink-0 w-5 h-5" />
      <p className="flex-1 text-sm font-bold">{message}</p>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
}
