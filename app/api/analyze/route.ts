import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
  try {
    const { image, audio, language } = await request.json();

    if (!image) {
      return NextResponse.json(
        { success: false, error: "Image data is required" },
        { status: 400 }
      );
    }

    if (!process.env.API_KEY) {
      return NextResponse.json(
        { success: false, error: "API_KEY not configured" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const languageMap: { [key: string]: string } = {
      'English': 'English',
      'Arabic': 'Arabic (العربية)',
      'French': 'French (Français)'
    };

    const langName = languageMap[language as string] || 'English';

    const prompt = `You are an emergency response AI assistant. Analyze the provided image and audio to determine if it depicts an emergency situation.

ANALYZE BOTH:
- Image: Visual scene analysis
- Audio: Any sounds, voices, or audio cues (if provided)

Use all available information to make the best emergency assessment.

LANGUAGE INSTRUCTION:
Respond with translations in ${langName} ONLY for the content values.
Keep the JSON structure and keys exactly as shown below - do NOT translate JSON keys.

RESPOND WITH ONLY THIS EXACT JSON FORMAT:
{
  "type": "Severe Bleeding",
  "dangerLevel": "CRITICAL",
  "actions": ["action steps here"],
  "warning": "warning message",
  "reasoning": "brief explanation of analysis"
}

TRANSLATION RULES:
- Keep keys: "type", "dangerLevel", "actions", "warning" (in English)
- Translate ONLY the values to ${langName}
- For "type": use one of: "Severe Bleeding", "Fire or Smoke", "Not an Emergency" (in ${langName})
- For "dangerLevel": use one of: "CRITICAL", "HIGH", "MODERATE", "LOW" (keep in English)
- For "actions": provide 2-3 action steps (in ${langName})
- For "warning": provide urgent warning (in ${langName}, or empty string "")
- For "reasoning": 

IMPORTANT: Return ONLY the JSON with NO additional text or explanation.`;

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
      console.log("[Analyze API] Audio data included, size:", audio.length, "bytes");
      parts.push({
        inlineData: {
          mimeType: "audio/webm",
          data: audio,
        },
      });
    }

    console.log("[Analyze API] Sending to Gemini with model: gemini-3-pro");
    console.log("[Analyze API] Language:", language, "->", langName);
    console.log("[Analyze API] Image size:", image.length, "bytes");
    console.log("[Analyze API] Audio included:", !!audio);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts }],
      config: {
        temperature: 0.1,
      },
    });

    const text = response.text || "{}";
    console.log("[Analyze API] Raw response:", text.substring(0, 500));

    // Parse JSON with robust extraction
    let parsed: any;
    try {
      parsed = JSON.parse(text);
      console.log("[Analyze API] Successfully parsed JSON");
    } catch (e) {
      console.log("[Analyze API] JSON parse failed, attempting extraction...");
      // Extract JSON from response even if surrounded by text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          console.log("[Analyze API] Extracted and parsed JSON");
        } catch (innerE) {
          console.error("[Analyze API] Failed to parse extracted JSON:", innerE);
          throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
        }
      } else {
        throw new Error(`No JSON found in response: ${text}`);
      }
    }

    console.log("[Analyze API] Parsed data:", parsed);

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

    // Ensure dangerLevel is one of the expected values (case-insensitive)
    const validLevels = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
    const normalizedLevel = parsed.dangerLevel.toUpperCase();
    if (!validLevels.includes(normalizedLevel)) {
      parsed.dangerLevel = 'MODERATE'; // Default if invalid
    } else {
      parsed.dangerLevel = normalizedLevel;
    }

    console.log("[Analyze API] Analysis complete. Type:", parsed.type, "Level:", parsed.dangerLevel);

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("[Analyze API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Analysis failed",
      },
      { status: 500 }
    );
  }
}
