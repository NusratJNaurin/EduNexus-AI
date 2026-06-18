// Avoid importing next/server to prevent module/type resolution errors in some environments.
// Use the standard Web Response API instead.
import { GoogleGenAI } from "@google/genai";

// Provide a minimal declaration for `process.env` to avoid TS errors in
// environments where Node types are not available (e.g., edge/runtime).
declare const process: { env: { GEMINI_API_KEY?: string } };

export async function POST(request: Request) {
  try {
    const { text, fileName } = await request.json();

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ summary: "No text content found to summarize." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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

    
    return new Response(JSON.stringify({ summary: realSummary }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    } catch (error) {
      console.error("Summarization error:", error);
      return new Response(JSON.stringify({ error: "Internal server error during analysis" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
}