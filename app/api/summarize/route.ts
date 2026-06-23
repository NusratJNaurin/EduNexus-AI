import { generateJson, ServiceUnavailableError } from "@/lib/api/gemini"
import { getErrorMessage, jsonOk, jsonError } from "@/lib/api/response"
import { parseJsonBody, summarizeRequestSchema, summarizeResponseSchema } from "@/lib/api/validation"
import type { SummarizeResponse } from "@/lib/types"

const SUMMARIZE_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    main_concepts: { type: "ARRAY", items: { type: "STRING" } },
    prerequisite_concepts: { type: "ARRAY", items: { type: "STRING" } },
    learning_objectives: { type: "ARRAY", items: { type: "STRING" } },
    is_knowledge_bearing: { type: "BOOLEAN" },
  },
  required: ["summary", "main_concepts", "prerequisite_concepts", "learning_objectives", "is_knowledge_bearing"],
}

export async function POST(request: Request) {
  try {
    const { text, fileName } = await parseJsonBody(request, summarizeRequestSchema)
    const cleanSubject = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")

    const prompt = `You are an elite academic and professional research assistant. Your task is to analyze the provided document text and return structured metadata about it.

CONTEXT/FILENAME: The document is titled "${cleanSubject}".

TEXT STREAM TO ANALYZE:
${text.slice(0, 7000)}

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON matching the schema below.
- The "summary" field should be a concise 1-to-2 sentence overview of the document.
- The "main_concepts" field should list the core concepts explicitly taught in the document (3-5 items max).
- The "prerequisite_concepts" field should list foundational concepts required to understand this document (3-5 items max).
- The "learning_objectives" field should list what the reader will gain or be able to do after reading (2-4 items max).
- The "is_knowledge_bearing" field must be:
  - true if the document teaches structured knowledge (textbook, lecture notes, tutorial, research paper, technical documentation).
  - false if the document is NOT suitable for dependency inference (e.g., reviews, invoices, marketing content, personal writing, administrative forms).
- If is_knowledge_bearing is false, set main_concepts, prerequisite_concepts, and learning_objectives to empty arrays.
- Be strict with is_knowledge_bearing — only set true for genuinely educational content.`

    const result = await generateJson<SummarizeResponse>(prompt, summarizeResponseSchema, SUMMARIZE_RESPONSE_SCHEMA)
    return jsonOk(result as unknown as Record<string, unknown>)
  } catch (error) {
    console.error("Summarize API error:", error)
    if (error instanceof ServiceUnavailableError) {
      return jsonError(getErrorMessage(error), 503)
    }
    return jsonError(getErrorMessage(error), 400)
  }
}