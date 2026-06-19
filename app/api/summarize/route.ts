import { generateText } from "@/lib/api/gemini"
import { getErrorMessage, jsonError, jsonOk } from "@/lib/api/response"
import { parseJsonBody, summarizeRequestSchema } from "@/lib/api/validation"

export async function POST(request: Request) {
  try {
    const { text, fileName } = await parseJsonBody(request, summarizeRequestSchema)
    const cleanSubject = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")

    const prompt = `You are an elite academic and professional research assistant. Your task is to provide a highly concise, 1-to-2 sentence summary of the provided text.

CONTEXT/FILENAME: The document is titled "${cleanSubject}".

CRITICAL INSTRUCTIONS:
- Start directly with the core topic (e.g., "This document explores...", "This PDF breaks down...").
- Identify the primary subject domain and list its 3-4 key structural pillars, concepts, or variables discussed in the text.
- Absolutely DO NOT use generic filler or vague fluff.

TEXT STREAM TO SUMMARIZE:
${text.slice(0, 7000)}`

    const summary = await generateText(prompt)
    return jsonOk({ summary: summary || "No summary could be generated for this document." })
  } catch (error) {
    console.error("Summarize API error:", error)
    return jsonError(getErrorMessage(error), error instanceof Error && error.message.includes("configured") ? 503 : 400)
  }
}
