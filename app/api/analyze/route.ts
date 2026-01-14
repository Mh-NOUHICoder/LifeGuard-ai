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

IMPORTANT: Respond ONLY in ${language || 'English'}. All text must be in this language.

Respond with ONLY valid JSON in this exact format:
{
  "type": "Severe Bleeding" | "Fire or Smoke" | "Not an Emergency",
  "dangerLevel": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
  "actions": ["action 1 in ${language || 'English'}", "action 2 in ${language || 'English'}"],
  "warning": "urgent message in ${language || 'English'} or empty string"
}`;

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
