import { GoogleGenAI } from "@google/genai"

const MODEL = "gemini-2.5-flash"
const MAX_RETRIES = 3
const BASE_DELAY_MS = 500

export class ServiceUnavailableError extends Error {
  constructor(message = "The AI engine is temporarily busy. Please try generating your summary again in a moment.") {
    super(message)
    this.name = "ServiceUnavailableError"
  }
}

/**
 * Determines whether an error represents a 503 Service Unavailable from Gemini.
 * Supports both the @google/genai SDK and raw fetch error shapes.
 */
function isServiceUnavailable(error: unknown): boolean {
  if (error instanceof ServiceUnavailableError) return true

  // @google/genai SDK errors have a status property
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number | string }).status
    if (Number(status) === 503) return true
  }

  // Raw fetch Response errors via message inspection
  if (error instanceof Error && error.message.includes("503")) return true

  return false
}

/**
 * Sleeps for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wraps a promise-returning function with exponential-backoff retry logic for 503 errors.
 *
 * @param fn  - The async function to call (e.g. () => ai.models.generateContent(...))
 * @param label - A short label for log messages (e.g. "generateText")
 * @returns The result of the wrapped function
 * @throws ServiceUnavailableError if all retries are exhausted
 * @throws The original error if it is NOT a 503
 */
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (!isServiceUnavailable(error)) {
        // Not a 503 — rethrow immediately
        throw error
      }

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) // 500, 1000, 2000
        console.warn(
          `[Gemini] ${label} attempt ${attempt + 1} failed with 503. ` +
          `Retrying in ${delay}ms...`,
        )
        await sleep(delay)
      }
    }
  }

  // All retries exhausted
  console.error(`[Gemini] ${label} failed after ${MAX_RETRIES + 1} attempts (503).`)
  throw new ServiceUnavailableError()
}

export function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.")
  }
  return apiKey
}

export function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: getGeminiApiKey() })
}

export async function generateText(prompt: string): Promise<string> {
  const result = await withRetry(async () => {
    const ai = createGeminiClient()
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    })
    return (response.text ?? "").trim()
  }, "generateText")

  return result
}

export async function generateJson<T>(
  prompt: string,
  schema: { parse: (value: unknown) => T },
  responseSchema?: Record<string, unknown>,
): Promise<T> {
  const result = await withRetry(async () => {
    const ai = createGeminiClient()

    const config: Record<string, unknown> = {
      responseMimeType: "application/json",
    }

    if (responseSchema) {
      config.responseSchema = responseSchema
    } else {
      // Default: dependency analysis schema (backward compatibility)
      config.responseSchema = {
        type: "OBJECT",
        properties: {
          newNodeType: { type: "STRING", enum: ["paper", "prerequisite", "research_gap"] },
          updatedExistingNodes: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                node_type: { type: "STRING", enum: ["paper", "prerequisite", "research_gap"] }
              },
              required: ["id", "node_type"]
            }
          },
          newEdges: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                source_node_id: { type: "STRING" },
                target_node_id: { type: "STRING" },
                relationship_type: { type: "STRING", enum: ["prerequisite", "research_gap"] },
                justification: { type: "STRING" }
              },
              required: ["source_node_id", "target_node_id", "relationship_type", "justification"]
            }
          }
        },
        required: ["newNodeType", "updatedExistingNodes", "newEdges"]
      }
    }

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config,
    })

    const raw = response.text?.trim()
    if (!raw) {
      throw new Error("The AI model returned an empty response.")
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error("The AI model returned malformed JSON.")
    }

    return schema.parse(parsed)
  }, "generateJson")

  return result
}

export async function generateJsonFromAudio(
  prompt: string,
  base64Audio: string,
  mimeType: string,
): Promise<string> {
  const result = await withRetry(async () => {
    const apiKey = getGeminiApiKey()
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Audio,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    })

    const data: {
      error?: { message?: string }
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    } = await response.json()

    if (!response.ok) {
      // Wrap fetch-level 503 so the retry loop catches it
      if (response.status === 503) {
        throw new ServiceUnavailableError(data.error?.message ?? "Service Unavailable")
      }
      throw new Error(data.error?.message ?? "Gemini audio processing failed.")
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) {
      throw new Error("The AI model returned an empty audio analysis.")
    }

    return rawText
  }, "generateJsonFromAudio")

  return result
}

/**
 * Generates an embedding vector for a given text string using Gemini's embedding model.
 * Embeddings are returned as a number array (in-memory only — not persisted).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return withRetry(async () => {
    const ai = createGeminiClient()
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: text,
    })
    // The SDK returns embedding values in response.embeddings?.[0]?.values
    const embeddingObj = response.embeddings?.[0]
    const values = embeddingObj?.values
    if (!values || !Array.isArray(values)) {
      throw new Error("Embedding response did not contain expected values array.")
    }
    return values as number[]
  }, "generateEmbedding")
}

export interface ExistingDocumentContext {
  id: string;
  title: string;
  abstract?: string;
}

export interface DocumentRelationship {
  targetDocumentId: string;
  relationshipType: "prerequisite" | "research_gap" | "citation";
  justification: string;
}

/**
 * Analyzes a new document against a list of existing documents to identify relationships.
 */
export async function identifyDocumentConnections(
  newDocTitle: string,
  newDocText: string,
  existingDocs: ExistingDocumentContext[]
): Promise<DocumentRelationship[]> {
  const result = await withRetry(async () => {
    const ai = createGeminiClient();

    if (existingDocs.length === 0) {
      return []; // Nothing to connect to yet
    }

    const prompt = `
You are an advanced academic research assistant. Your task is to analyze a newly uploaded research document and determine its relationship to a catalog of existing documents.

NEW DOCUMENT TITLE: 
"${newDocTitle}"

NEW DOCUMENT CONTENT (EXCERPT/FULL):
${newDocText.substring(0, 8000)} # Limiting to 8000 chars to avoid blowing up payload limits unnecessarily

EXISTING DOCUMENTS IN DATABASE:
${JSON.stringify(existingDocs, null, 2)}

Analyze the new document and determine if it has any of these relationships with the existing documents:
1. "prerequisite": The existing document contains fundamental core knowledge required to understand the new document.
2. "research_gap": The new document explicitly addresses a limitation, open question, or gap left by the existing document.
3. "citation": The new document references or closely builds upon the existing document without being a strict prerequisite.

Only return items where a genuine, strong connection is found. Provide a brief 1-2 sentence justification for each connection.
`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // Enforcing structural output means Gemini will ALWAYS format the data correctly
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              targetDocumentId: { type: "STRING" },
              relationshipType: { 
                type: "STRING", 
                enum: ["prerequisite", "research_gap", "citation"] 
              },
              justification: { type: "STRING" }
            },
            required: ["targetDocumentId", "relationshipType", "justification"]
          }
        }
      },
    });

    const raw = response.text?.trim();
    if (!raw) return [];

    return JSON.parse(raw) as DocumentRelationship[];
  }, "identifyDocumentConnections")

  return result
}