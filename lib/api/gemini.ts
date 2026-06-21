import { GoogleGenAI } from "@google/genai"

const MODEL = "gemini-2.5-flash"

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
  const ai = createGeminiClient()
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  })
  return (response.text ?? "").trim()
}

export async function generateJson<T>(prompt: string, schema: { parse: (value: unknown) => T }): Promise<T> {
  const ai = createGeminiClient()
  
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      // Forces Gemini 2.5 to perfectly align its keys with whatever Zod layout you provide:
      responseSchema: {
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
    },
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
}


export async function generateJsonFromAudio(
  prompt: string,
  base64Audio: string,
  mimeType: string,
): Promise<string> {
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
    throw new Error(data.error?.message ?? "Gemini audio processing failed.")
  }

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) {
    throw new Error("The AI model returned an empty audio analysis.")
  }

  return rawText
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
}