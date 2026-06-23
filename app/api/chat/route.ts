import { generateText, ServiceUnavailableError } from "@/lib/api/gemini"
import { getErrorMessage, jsonError, jsonOk } from "@/lib/api/response"
import { chatRequestSchema, parseJsonBody } from "@/lib/api/validation"

const SYSTEM_INSTRUCTIONS = `You are an advanced academic research assistant.
You are assisting a student working with a document asset.
CRITICAL BEHAVIORAL DIRECTIVES:
1. Answer the user's prompt directly, clearly, and concisely.
2. Strictly confine your analysis to the provided Document Text and Active Node Context. Do not bring in unrequested outside concepts.
3. Do not anticipate future questions, do not offer unprompted extra context, and do not hallucinate adjacent metrics.
4. If the user asks a short question, provide a precise, crisp answer. No fluff.
5. When citing evidence, reference specific passages or sections from the document text.`

export async function POST(request: Request) {
  try {
    const { prompt, documentText, formulaContext } = await parseJsonBody(request, chatRequestSchema)

    const boundedDocumentText = documentText?.slice(0, 12000) ?? "No document text was provided."
    const boundedContext = formulaContext?.slice(0, 8000) ?? "No additional node context was provided."

    const composedPrompt = `${SYSTEM_INSTRUCTIONS}

DOCUMENT TEXT:
${boundedDocumentText}

ACTIVE NODE / FORMULA CONTEXT:
${boundedContext}

USER QUESTION:
${prompt}`

    const reply = await generateText(composedPrompt)
    if (!reply) {
      return jsonOk({ reply: "The model processed the request but returned an empty response." })
    }

    return jsonOk({ reply })
  } catch (error) {
    console.error("Chat API error:", error)
    if (error instanceof ServiceUnavailableError) {
      return jsonError(getErrorMessage(error), 503)
    }
    return jsonError(getErrorMessage(error), 400)
  }
}
