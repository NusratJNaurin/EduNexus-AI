import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { text, fileName } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ summary: "No text content found to summarize." }, { status: 400 });
    }

    const cleanSubject = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

    const genericPrompt = `
      You are an elite academic and professional research assistant. Your task is to provide a highly concise, 1-to-2 sentence summary of the provided text.
      
      CONTEXT/FILENAME: The document is titled "${cleanSubject}".
      
      CRITICAL INSTRUCTIONS:
      - Start directly with the core topic (e.g., "This document explores...", "This PDF breaks down...").
      - Identify the primary subject domain and list its 3-4 key structural pillars, concepts, or variables discussed in the text.
      - Absolutely DO NOT use generic filler or vague fluff.
      
      TEXT STREAM TO SUMMARIZE:
      ${text.substring(0, 7000)}
    `;

    // 2. RUN THE ACTUAL LLM PIPELINE INVOCATION HERE
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: genericPrompt,
    });
    const realSummary = (response.text || "").trim();

    
    return NextResponse.json({ summary: realSummary });
    } catch (error) {
      console.error("Summarization error:", error);
      return NextResponse.json({ error: "Internal server error during analysis" }, { status: 500 });
    }
}