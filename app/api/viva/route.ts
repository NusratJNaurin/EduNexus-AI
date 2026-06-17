import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File | null
    const nodeLabel = formData.get("nodeLabel") || "General"
    const nodeType = formData.get("nodeType") || "paper"

    if (!audioFile) {
      return NextResponse.json({ error: "No audio binary chunks received." }, { status: 400 })
    }

    // Convert raw browser WebM file into base64 payload array buffer strings for Gemini
    const buffer = Buffer.from(await audioFile.arrayBuffer())
    const base64Audio = buffer.toString("base64")

    // Prompt engineering instructions parsing both context rules and layout parameters
    const systemPrompt = `You are an expert academic defense evaluator analyzing a student's vocal presentation.
    The user is defending their thesis node named: "${nodeLabel}" (Type: ${nodeType}).
    
    Tasks:
    1. Extract and transcribe exactly what the user said in the audio.
    2. Critique their answer. Provide precise feedback on structural accuracy, phrasing correctness, and gaps.
    
    You MUST respond strictly with a valid JSON block containing exactly two fields: "transcription" and "evaluation". Do not include markdown code fence formatting blocks around the JSON object.`

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType: "audio/webm",
                  data: base64Audio
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json" // Enforces a solid structural JSON configuration returned by Google
        }
      })
    })

    const data = await response.json()
    const rawTextResponse = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawTextResponse) {
      return NextResponse.json({ error: "The AI core processed the pipeline but returned an empty context window." }, { status: 500 })
    }

    // Parse out structural outputs safely
    const parsedData = JSON.parse(rawTextResponse)

    return NextResponse.json({
      transcription: parsedData.transcription,
      evaluation: parsedData.evaluation
    })

  } catch (error: any) {
    console.error("Audio pipeline crash breakdown:", error)
    return NextResponse.json({ error: error.message || "Internal audio route processing error." }, { status: 500 })
  }
}