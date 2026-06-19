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
