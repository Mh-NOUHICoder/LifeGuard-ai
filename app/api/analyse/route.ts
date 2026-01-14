import { NextResponse } from 'next/server';
import { analyzeEmergency } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, audio, language } = body;

    if (!image) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }

    if (!language) {
      return NextResponse.json(
        { error: "Language is required" },
        { status: 400 }
      );
    }

    const analysis = await analyzeEmergency(image, audio || null, language);
    
    return NextResponse.json(analysis, { status: 200 });
  } catch (error) {
    console.error("Gemini API Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return NextResponse.json(
      { 
        error: "Failed to analyze emergency",
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}