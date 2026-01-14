import { Language } from '@/types/gemini';

interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

/**
 * Convert language enum to browser speech synthesis locale
 */
function getLocale(language: Language): string {
  const localeMap = {
    [Language.ARABIC]: 'ar-SA',
    [Language.FRENCH]: 'fr-FR',
    [Language.ENGLISH]: 'en-US',
  };
  return localeMap[language];
}

/**
 * Speak text using Web Speech API with proper language support
 */
export function speak(
  text: string,
  language: Language,
  options: TTSOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('Speech Synthesis not available'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLocale(language);
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;

    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(event.error));

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stop all ongoing speech
 */
export function stopSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check if speech synthesis is available
 */
export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}

/**
 * Get available voices for a specific language
 */
export function getAvailableVoices(language: Language): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  
  const locale = getLocale(language);
  return window.speechSynthesis
    .getVoices()
    .filter(voice => voice.lang.startsWith(locale.split('-')[0]));
}
