import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateContentWithRetry } from "@/lib/gemini-api";
import { getEmergencyPrompt, SYSTEM_PROMPT, buildContextPrompt } from "@/lib/prompt";
import { t } from "@/lib/translations";
import { Language } from "@/types/gemini";

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

interface ContentPart {
  text?: string;
  inlineData?: {
    mimeType: "image/jpeg" | "audio/webm";
    data: string;
  };
}

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
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { image, audio, language } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: "Image data is required" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const langName = LANGUAGE_MAP[language as string] || 'English';

    const contextPrompt = buildContextPrompt([], []); // Initialize with empty context for now
    const decisionPrompt = getEmergencyPrompt(langName);

    const parts: ContentPart[] = [
      { text: contextPrompt },
      { text: decisionPrompt },
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

    // Use retry wrapper to handle 429 errors gracefully
    const response = await generateContentWithRetry(ai, MODEL_NAME, {
      contents: [
        {
          role: "user",
          parts: parts as unknown as Parameters<typeof generateContentWithRetry>[2]["contents"][0]["parts"],
        },
      ],
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.1,
      },
    });

    // Extract text from response - handle different response formats
    let text = "{}";
    try {
      const resp = response as unknown as {text?: () => string; response?: {text?: () => string}};
      // Try the text() method first (standard SDK method)
      if (typeof resp.text === 'function') {
        text = resp.text();
      } else if (typeof resp.text === 'string') {
        text = resp.text;
      } else if (resp.response && typeof resp.response.text === 'function') {
        text = resp.response.text();
      } else {
        text = "{}";
      }
    } catch {
      console.warn('[Analyze API] Could not extract text from response, using fallback');
      text = "{}";
    }

    // Validate that we got actual text content
    if (!text || text === "{}" || typeof text !== 'string' || text.trim().length === 0) {
      console.error('[Analyze API] Empty response text received');
      throw new Error('Empty response from AI service');
    }

    // Parse JSON with robust extraction
    // Clean up markdown code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed: AnalysisResponse;
    try {
      parsed = JSON.parse(cleanText) as AnalysisResponse;
    } catch {
      // Extract JSON from response even if surrounded by text
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
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
  } catch (error: unknown) {
    console.error("[Analyze API] Error:", error);
    
    // Get the language from request body for error translation
    let language: Language = Language.ENGLISH;
    try {
      const body = await request.clone().json();
      const langParam = body.language;
      if (langParam === 'Arabic') language = Language.ARABIC;
      else if (langParam === 'French') language = Language.FRENCH;
    } catch {
      // Use default language if body parsing fails
    }

    // Extract error message with user-friendly fallback
    let userMessage = t(language, 'errors.analysisFailed');
    let errorType = 'error';
    
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      
      // Detect rate limiting / quota exhaustion
      if (msg.includes("overloaded") || msg.includes("quota") || msg.includes("busy") || msg.includes("resource_exhausted")) {
        userMessage = t(language, 'errors.analysisFailed') || "The AI service is currently overloaded. Please try again in a few moments.";
        errorType = 'warning';
      } 
      // Network error
      else if (msg.includes("network") || msg.includes("timeout") || msg.includes("fetch")) {
        userMessage = t(language, 'errors.networkError');
      }
      // Empty response error
      else if (msg.includes("empty response")) {
        userMessage = "No response from AI service. Please check your connection and try again.";
      }
      // Parse/JSON error
      else if (msg.includes("parse") || msg.includes("json") || msg.includes("invalid")) {
        userMessage = "Failed to process AI response. Please try again.";
      }
      // API authentication error
      else if (msg.includes("auth") || msg.includes("401") || msg.includes("403")) {
        userMessage = t(language, 'errors.apiAuthFailed');
      }
      // Generic API error
      else if (msg.includes("api") || msg.includes("service")) {
        userMessage = "An issue occurred with the AI service. Please try again.";
      }
      // Fall back to actual error message
      else {
        userMessage = error.message;
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: userMessage,
        errorType: errorType,
      },
      { status: 500 }
    );
  }
}
