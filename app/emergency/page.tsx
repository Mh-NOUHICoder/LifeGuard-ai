'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, PhoneCall, ShieldAlert, Volume2, RefreshCw, Flame, Droplet, Info, X } from 'lucide-react';
import { Language, EmergencyType, EmergencyInstruction } from '@/types/gemini';

export default function EmergencyPage() {
  const [lang, setLang] = useState<Language>(Language.ENGLISH);
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<EmergencyInstruction | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Speech function
  const speak = (text: string) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === Language.ARABIC ? 'ar-SA' : lang === Language.FRENCH ? 'fr-FR' : 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const startEmergency = async () => {
    setIsActive(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
    if (videoRef.current) videoRef.current.srcObject = stream;

    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
    recorder.start();
    mediaRecorderRef.current = recorder;
  };

  const handleAnalyze = async () => {
    if (!videoRef.current) return;
    setIsAnalyzing(true);

    // 1. Capture Image
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg').split(',')[1];

    // 2. Process Audio
    let audioBase64 = null;
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      await new Promise(r => setTimeout(r, 400)); // wait for blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const reader = new FileReader();
      audioBase64 = await new Promise<string>((res) => {
        reader.onloadend = () => res((reader.result as string).split(',')[1]);
        reader.readAsDataURL(audioBlob);
      });
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
    }

    // 3. API Call
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ image: imageBase64, audio: audioBase64, language: lang })
      });
      const data = await res.json();
      setResult(data);
      speak(`${data.type}. ${data.actions.join('. ')}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={`min-h-screen bg-black text-white p-4 ${lang === Language.ARABIC ? 'text-right' : ''}`}>
      {/* Language Selector */}
      <div className="flex justify-center gap-2 mb-6">
        {Object.values(Language).map(l => (
          <button 
            key={l} 
            onClick={() => setLang(l)}
            className={`px-4 py-2 rounded-full text-xs font-bold ${lang === l ? 'bg-red-600' : 'bg-zinc-800'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {!isActive ? (
        <div className="flex flex-col items-center mt-20">
          <ShieldAlert className="w-20 h-20 text-red-600 mb-8 animate-pulse" />
          <button 
            onClick={startEmergency}
            className="w-64 h-64 bg-red-600 rounded-full text-4xl font-black shadow-[0_0_50px_rgba(220,38,38,0.5)] active:scale-95 transition-transform"
          >
            HELP
          </button>
        </div>
      ) : (
        <div className="max-w-md mx-auto space-y-4">
          <div className="relative rounded-3xl overflow-hidden border-2 border-zinc-800 aspect-video bg-zinc-900">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <RefreshCw className="animate-spin text-white w-10 h-10" />
              </div>
            )}
          </div>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 p-6 rounded-3xl border border-red-900/50">
                <div className="flex items-center gap-3 mb-4">
                  {result.type === EmergencyType.FIRE ? <Flame className="text-orange-500" /> : <Droplet className="text-red-500" />}
                  <h2 className="text-xl font-bold uppercase">{result.type.replace('_', ' ')}</h2>
                </div>
                
                <div className="space-y-3">
                  {result.actions.map((a, i) => (
                    <p key={i} className="text-lg font-medium border-l-2 border-red-600 pl-4">{a}</p>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-red-600/20 rounded-xl text-red-400 text-sm font-bold">
                   ⚠ {result.warning}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => window.open('tel:911')} className="bg-white text-black py-5 rounded-2xl font-black flex items-center justify-center gap-2">
              <PhoneCall /> CALL 911
            </button>
            <button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-blue-600 py-5 rounded-2xl font-black flex items-center justify-center gap-2">
              <Camera /> {isAnalyzing ? '...' : 'ANALYZE'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}