
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
  const model = 'gemini-2.0-flash-001';

  const prompt = `You are an emergency response AI assistant specialized in real-time emergency detection.
Your mission is to save lives and minimize harm. Analyze the provided image${audioBuffer ? ' and audio' : ''}.
Target Language: ${lang}

You MUST determine the emergency situation as one of:
- Severe Bleeding (heavy bleeding, blood loss, wounds)
- Fire or Smoke (flames, smoke, fire emergency)
- Not an Emergency (no emergency situation)

Critical Rules:
- Do NOT describe the scene. Focus ONLY on immediate life-saving actions.
- Give short, commanding instructions (1-3 steps maximum).
- If it's a real emergency, ALWAYS include a step to call emergency services immediately.
- Be extremely clear and concise.
- Use the specified language for ALL output.
- Return valid JSON only - no markdown or extra text.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: "Emergency type: 'Severe Bleeding', 'Fire or Smoke', or 'Not an Emergency'",
      },
      dangerLevel: {
        type: Type.STRING,
        enum: ["CRITICAL", "HIGH", "MODERATE", "LOW"],
        description: "Danger level assessment",
      },
      actions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "1-3 immediate life-saving steps in the specified language",
      },
      warning: {
        type: Type.STRING,
        description: "Critical warning if needed (e.g., 'CALL EMERGENCY SERVICES IMMEDIATELY')",
      },
    },
    required: ["type", "dangerLevel", "actions"],
  };

  const parts: any[] = [
    { text: prompt },
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBuffer,
      },
    },
  ];

  if (audioBuffer) {
    parts.push({
      inlineData: {
        mimeType: "audio/wav",
        data: audioBuffer,
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text) as EmergencyInstruction;
    
    // Validate response
    if (!parsed.type || !parsed.dangerLevel || !Array.isArray(parsed.actions)) {
      throw new Error('Invalid response format from Gemini');
    }

    return parsed;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error(
      `Failed to analyze emergency: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
