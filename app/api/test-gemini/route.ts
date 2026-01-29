import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Create Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY,
});

export async function GET() {
  try {
    if (!process.env.API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API_KEY not configured' },
        { status: 500 }
      );
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: "Explain how AI works in a few words",
            },
          ],
        },
      ],
    });

    return NextResponse.json({
      success: true,
      text: response.text,
    });

  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
