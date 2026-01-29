import { Language } from '@/types/gemini';

interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

/**
 * Ensure voices are loaded before speaking.
 * Includes a trigger mechanism to force browser to load voices.
 */
function ensureVoicesLoaded(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    const voices = window.speechSynthesis.getVoices();

    // If voices are already available, proceed
    if (voices.length > 0) {
      resolve();
      return;
    }

    // Handler for when voices update
    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      resolve();
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    
    // FORCE TRIGGER: Calling getVoices() again can sometimes kickstart the loading process in Chrome
    window.speechSynthesis.getVoices();

    // Timeout fallback: If voices never load (e.g., restricted OS), resolve anyway
    // so we can at least try to speak using default system language settings
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      resolve();
    }, 2000);
  });
}

/**
 * Convert language enum to browser speech synthesis locale
 */
function getLocale(language: Language): string {
  const localeMap = {
    [Language.ARABIC]: 'ar', 
    [Language.FRENCH]: 'fr-FR',
    [Language.ENGLISH]: 'en-US',
  };
  return localeMap[language] || 'en-US';
}

/**
 * Get best voice for a language with improved Arabic detection logic
 */
export function getBestVoice(language: Language): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
  
  const voices = window.speechSynthesis.getVoices();
  const targetLocale = getLocale(language);
  const targetLangShort = targetLocale.split('-')[0].toLowerCase(); // e.g., 'ar'
  
  if (voices.length === 0) {
    return undefined;
  }
  
  // 1. Exact Locale Match (e.g., 'ar-SA' == 'ar-SA')
  const exactMatch = voices.find(v => v.lang === targetLocale);
  if (exactMatch) {
    console.log(`[TTS] Found exact match: ${exactMatch.name}`);
    return exactMatch;
  }

  // 2. Language Code Match (e.g., 'ar-EG' matches 'ar')
  const langMatches = voices.filter(v => 
    v.lang.toLowerCase().startsWith(targetLangShort)
  );

  if (langMatches.length > 0) {
    // Priority 1: Google Voices (usually high quality neural)
    const googleVoice = langMatches.find(v => v.name.includes('Google'));
    if (googleVoice) return googleVoice;

    // Priority 2: Microsoft Voices (high quality on Windows)
    const msVoice = langMatches.find(v => v.name.includes('Microsoft'));
    if (msVoice) return msVoice;

    // Priority 3: Any match
    return langMatches[0];
  }
  
  // 3. Special Fallbacks for Arabic (Search by Name)
  if (language === Language.ARABIC) {
    const arabicVoice = voices.find(v => 
      v.name.toLowerCase().includes('arabic') || 
      v.name.toLowerCase().includes('sara') ||  // MacOS
      v.name.toLowerCase().includes('maged') || // MacOS
      v.name.toLowerCase().includes('tarik') || // MacOS
      v.name.toLowerCase().includes('laila')    // Windows
    );
    if (arabicVoice) {
      console.log(`[TTS] Found Arabic voice by name: ${arabicVoice.name}`);
      return arabicVoice;
    }
  }
  
  return undefined;
}

/**
 * Speak text using Web Speech API with proper language support
 */
export function speak(
  text: string,
  language: Language,
  options: TTSOptions = {}
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        reject(new Error('Speech Synthesis not available'));
        return;
      }

      // 1. Wait for voices to load
      await ensureVoicesLoaded();

      // 2. Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // 3. Create Utterance
      const utterance = new SpeechSynthesisUtterance(text);
      const targetLocale = getLocale(language);
      
      // 4. Find and assign Voice
      const voice = getBestVoice(language);
      
      if (voice) {
        // Scenario A: Voice found. Use it specifically.
        utterance.voice = voice;
        utterance.lang = voice.lang;
        console.log(`[TTS] Using specific voice: ${voice.name} (${voice.lang})`);
      } else {
        // Scenario B: No voice found in the list.
        // FIX: Use the generic language code (e.g., 'ar') instead of specific locale ('ar-SA').
        // This allows mobile browsers to use their internal network/server voice which often isn't listed in getVoices().
        const genericLang = targetLocale.split('-')[0]; // 'ar'
        utterance.lang = genericLang;
        console.warn(`[TTS] No specific voice found. Forcing generic language: ${genericLang}`);
      }
      
      // 5. Apply Options
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = options.volume ?? 1;

      // 6. Event Handling
      utterance.onend = () => {
        resolve();
      };
      
      utterance.onerror = (event) => {
        // 'interrupted' is not a fatal error
        if (event.error === 'interrupted') {
          resolve();
        } else {
          console.error(`[TTS] Speech error: ${event.error}`);
          reject(new Error(`Speech synthesis error: ${event.error}`));
        }
      };

      // 7. Speak
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('[TTS] Error in speak function:', error);
      reject(error);
    }
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
 * Get available voices for a specific language (Helper for UI)
 */
export function getAvailableVoices(language: Language): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  
  const locale = getLocale(language);
  const voices = window.speechSynthesis.getVoices();
  const shortLang = locale.split('-')[0];
  
  return voices.filter(voice => 
    voice.lang === locale || voice.lang.startsWith(shortLang)
  );
}