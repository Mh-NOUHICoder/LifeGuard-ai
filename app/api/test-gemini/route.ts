import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateContentWithRetry } from "@/lib/gemini-api";

// Create Gemini client
const ai = new GoogleGenerativeAI(process.env.API_KEY || "");

export async function GET() {
  try {
    if (!process.env.API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API_KEY not configured' },
        { status: 500 }
      );
    }

    // Use retry wrapper to handle 429 errors gracefully
    const response = await generateContentWithRetry(ai, "gemini-3-flash-preview", {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Explain how AI works in a few words",
            },
          ] as Array<{text?: string; inlineData?: {mimeType: string; data: string}}>,
        },
      ],
    });

    const resp = response as unknown as {text?: () => string; response?: {text?: () => string}};
    let text = "";
    if (typeof resp.text === 'function') {
      text = resp.text();
    } else if (typeof resp.text === 'string') {
      text = resp.text;
    } else if (resp.response && typeof resp.response.text === 'function') {
      text = resp.response.text();
    }

    return NextResponse.json({
      success: true,
      text: text,
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
