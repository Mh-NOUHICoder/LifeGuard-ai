import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getEmergencyPrompt } from "@/lib/prompt";

interface AnalysisResponse {
  type: string;
  dangerLevel: string;
  actions: string[];
  warning: string;
  reasoning: string;
}

const VALID_LEVELS = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];

const LANGUAGE_MAP: Record<string, string> = {
  'English': 'English',
  'Arabic': 'Arabic (العربية)',
  'French': 'French (Français)'
};

const MODEL_NAME = "gemini-3-flash-preview";

export async function POST(request: NextRequest) {
  try {
    // Security: Validate API Key configuration early
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("[Analyze API] API_KEY not configured");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Security: Handle malformed JSON body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { image, audio, language } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: "Image data is required" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const langName = LANGUAGE_MAP[language as string] || 'English';

    const prompt = getEmergencyPrompt(langName);

    const parts: any[] = [
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        },
      },
    ];

    // Add audio data if provided
    if (audio) {
      parts.push({
        inlineData: {
          mimeType: "audio/webm",
          data: audio,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts }],
      config: {
        temperature: 0.1,
      },
    });

    const text = response.text || "{}";

    // Parse JSON with robust extraction
    let parsed: AnalysisResponse;
    try {
      parsed = JSON.parse(text) as AnalysisResponse;
    } catch (e) {
      // Extract JSON from response even if surrounded by text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]) as AnalysisResponse;
        } catch (innerE) {
          console.error("[Analyze API] Failed to parse extracted JSON:", innerE);
          throw new Error("Failed to parse AI response");
        }
      } else {
        throw new Error("Invalid AI response format");
      }
    }

    // Validate required fields
    if (!parsed.type) {
      throw new Error("Missing 'type' field in response");
    }
    if (!parsed.dangerLevel) {
      throw new Error("Missing 'dangerLevel' field in response");
    }
    if (!Array.isArray(parsed.actions)) {
      throw new Error("'actions' must be an array");
    }
    if (!parsed.reasoning) {
      parsed.reasoning = "No specific reasoning provided.";
    }

    // Enforce consistency: Non-emergencies should always be LOW risk
    if (parsed.type.toLowerCase().includes('not an emergency')) {
      parsed.dangerLevel = 'LOW';
    }

    // Ensure dangerLevel is one of the expected values (case-insensitive)
    const normalizedLevel = parsed.dangerLevel.toUpperCase();
    parsed.dangerLevel = VALID_LEVELS.includes(normalizedLevel) 
      ? normalizedLevel 
      : 'MODERATE';

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("[Analyze API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 }
    );
  }
}
