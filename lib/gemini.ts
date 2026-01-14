
import { GoogleGenAI, Type } from "@google/genai";
import { Language, EmergencyInstruction, EmergencyType, DangerLevel } from "@/types/gemini";

if (!process.env.API_KEY) {
  console.warn('GEMINI API_KEY not set in environment variables');
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeEmergency = async (
  imageBuffer: string,
  audioBuffer: string | null,
  lang: Language
): Promise<EmergencyInstruction> => {
  try {
    console.log('[analyzeEmergency] Starting analysis...');
    console.log('[analyzeEmergency] Image size:', imageBuffer?.length || 0, 'bytes');
    console.log('[analyzeEmergency] Audio included:', !!audioBuffer);
    console.log('[analyzeEmergency] Language:', lang);

    // Call the API endpoint
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageBuffer,
        audio: audioBuffer,
        language: lang,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Analysis failed');
    }

    console.log('[analyzeEmergency] Analysis successful:', result.data.type);
    return result.data as EmergencyInstruction;
  } catch (error) {
    console.error('[analyzeEmergency] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to analyze emergency: ${errorMessage}`);
  }
};
