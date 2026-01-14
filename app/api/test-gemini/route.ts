import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// إنشاء client للـ Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function GET() {
  try {
    const response = await ai.models.generateContent({
      // استخدم موديل متاح لديك
      model: "gemini-3-flash-preview", 
      contents: [
        {
          type: "input_text",
          text: "Explain how AI works in a few words",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      text: response.output_text,
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
