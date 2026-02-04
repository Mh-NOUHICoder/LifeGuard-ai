
import { Language, EmergencyInstruction } from "@/types/gemini";

export interface AnalysisError {
  message: string;
  errorType?: 'error' | 'warning';
}

export const analyzeEmergency = async (
  imageBuffer: string,
  audioBuffer: string | null,
  lang: Language
): Promise<{ success: true; data: EmergencyInstruction } | { success: false; error: AnalysisError }> => {
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
      return {
        success: false,
        error: {
          message: errorData.error || `API error: ${response.status}`,
          errorType: errorData.errorType || 'error',
        },
      };
    }

    const result = await response.json();
    
    if (!result.success) {
      return {
        success: false,
        error: {
          message: result.error || 'Analysis failed',
          errorType: result.errorType || 'error',
        },
      };
    }

    console.log('[analyzeEmergency] Analysis successful:', result.data.type);
    return {
      success: true,
      data: result.data as EmergencyInstruction,
    };
  } catch (error) {
    console.error('[analyzeEmergency] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        message: `Failed to analyze emergency: ${errorMessage}`,
        errorType: 'error',
      },
    };
  }
};
