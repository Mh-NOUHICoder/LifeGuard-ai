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

    const prompt = `You are an emergency response AI. Analyze this image and determine if it shows an emergency.

CRITICAL INSTRUCTION - LANGUAGE REQUIREMENT:
You MUST respond ONLY in ${language || 'English'}. Every single word, including JSON keys and values, must be in ${language || 'English'}.
Do NOT respond in any other language. If you cannot respond in ${language || 'English'}, respond with an error message in ${language || 'English'}.

Respond with ONLY valid JSON in this exact format (with all content in ${language || 'English'}):
{
  "type": "Severe Bleeding" | "Fire or Smoke" | "Not an Emergency",
  "dangerLevel": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
  "actions": ["action 1", "action 2", "action 3"],
  "warning": "urgent message or empty string"
}

Remember: ALL text must be in ${language || 'English'}.`;

    const parts: any[] = [
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        },
      },
    ];

    console.log("[Analyze API] Sending to Gemini with model: gemini-3-flash-preview");
    console.log("[Analyze API] Language:", language);
    console.log("[Analyze API] Image size:", image.length, "bytes");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts }],
      config: {
        temperature: 0.1,
      },
    });

    const text = response.text || "{}";
    console.log("[Analyze API] Response received:", text.substring(0, 300));

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid JSON response");
      }
    }

    // Validate
    if (!parsed.type || !parsed.dangerLevel || !Array.isArray(parsed.actions)) {
      throw new Error("Missing required fields in response");
    }

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
