import { generateJsonFromAudio, ServiceUnavailableError } from "@/lib/api/gemini"
import { getErrorMessage, jsonError, jsonOk } from "@/lib/api/response"
import { validateVivaFormData, vivaResponseSchema } from "@/lib/api/validation"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const { audioFile, nodeLabel, nodeType } = validateVivaFormData(formData)

    const buffer = Buffer.from(await audioFile.arrayBuffer())
    const base64Audio = buffer.toString("base64")

    const prompt = `You are an expert academic defense evaluator analyzing a student's vocal presentation.
The user is defending their thesis node named: "${nodeLabel}" (Type: ${nodeType}).

Tasks:
1. Extract and transcribe exactly what the user said in the audio.
2. Critique their answer. Provide precise feedback on structural accuracy, phrasing correctness, and gaps.

You MUST respond strictly with a valid JSON object containing exactly two fields: "transcription" and "evaluation". Do not include markdown code fence formatting blocks around the JSON object.`

    const rawTextResponse = await generateJsonFromAudio(prompt, base64Audio, audioFile.type || "audio/webm")
    const parsed = vivaResponseSchema.parse(JSON.parse(rawTextResponse))

    return jsonOk({
      transcription: parsed.transcription,
      evaluation: parsed.evaluation,
    })
  } catch (error) {
    console.error("Viva API error:", error)
    if (error instanceof ServiceUnavailableError) {
      return jsonError(getErrorMessage(error), 503)
    }
    return jsonError(getErrorMessage(error), 400)
  }
}
