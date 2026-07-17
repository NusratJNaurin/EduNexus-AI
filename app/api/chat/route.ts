import { generateText, ServiceUnavailableError } from "@/lib/api/gemini"
import { getErrorMessage, jsonError, jsonOk } from "@/lib/api/response"
import { chatRequestSchema, parseJsonBody } from "@/lib/api/validation"
import { isArabicText } from "@/lib/utils"

const SYSTEM_INSTRUCTIONS = `You are an advanced academic research assistant.
You are assisting a student working with a document asset.
CRITICAL BEHAVIORAL DIRECTIVES:
1. Answer the user's prompt directly, clearly, and concisely.
2. Strictly confine your analysis to the provided Document Text and Active Node Context. Do not bring in unrequested outside concepts.
3. Do not anticipate future questions, do not offer unprompted extra context, and do not hallucinate adjacent metrics.
4. If the user asks a short question, provide a precise, crisp answer. No fluff.
5. When citing evidence, reference specific passages or sections from the document text.`

/**
 * Builds a language instruction that gets prepended to the system prompt.
 * Priority order:
 *   1. If the user's question is clearly in Arabic → instruct Gemini to respond in Arabic.
 *   2. If the user's question is clearly in English → no instruction needed (keep current behavior).
 *   3. If the question is too short/ambiguous to detect language (e.g., "summarize"
 *      with no Arabic characters), fall back to the document language as a default.
 *
 * The user's question language is the primary signal. The document language is
 * only used as a fallback for very short or ambiguous queries where the user
 * hasn't expressed a clear language preference.
 */
function buildLanguageInstruction(documentText: string, userQuestion: string): string {
  const userIsArabic = isArabicText(userQuestion)
  const docIsArabic = isArabicText(documentText)

  if (userIsArabic) {
    // User explicitly asked in Arabic — respond in Arabic regardless of document language
    return "LANGUAGE INSTRUCTION: The user asked their question in Arabic. Respond in Arabic. " +
           "If you need to cite evidence from the document, keep the citation in its original language " +
           "but write your explanation and analysis in Arabic."
  }

  // If the question is very short (under ~20 non-whitespace chars, roughly 3-4 words),
  // the language detection may not be reliable. Fall back to the document language.
  const questionLength = userQuestion.replace(/\s/g, "").length
  if (questionLength < 20 && docIsArabic) {
    return "LANGUAGE INSTRUCTION: The uploaded document is primarily in Arabic. Respond in Arabic by default. " +
           "If you need to cite evidence from the document, keep the citation in its original language " +
           "but write your analysis in Arabic."
  }

  // User asked in English (or a language other than Arabic) — no language override needed.
  // The existing English system instructions handle this case.
  return ""
}

export async function POST(request: Request) {
  try {
    const { prompt, documentText, formulaContext } = await parseJsonBody(request, chatRequestSchema)

    const boundedDocumentText = documentText?.slice(0, 12000) ?? "No document text was provided."
    const boundedContext = formulaContext?.slice(0, 8000) ?? "No additional node context was provided."

    // Detect language and build a language instruction layered on top of the system prompt
    const languageInstruction = buildLanguageInstruction(boundedDocumentText, prompt)

    const composedPrompt = languageInstruction
      ? `${languageInstruction}\n\n${SYSTEM_INSTRUCTIONS}

DOCUMENT TEXT:
${boundedDocumentText}

ACTIVE NODE / FORMULA CONTEXT:
${boundedContext}

USER QUESTION:
${prompt}`
      : `${SYSTEM_INSTRUCTIONS}

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
