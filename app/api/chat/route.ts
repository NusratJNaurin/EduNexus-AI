import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { prompt, formulaContext, documentText } = await request.json()

    // 1. Build the specific system framework instructions
    const systemInstructions = `You are an advanced academic research assistant. 
    You are assisting a student working with a document asset.
    Active Formula Context (LaTeX): ${formulaContext || "None specified."} 
    Extracted Document Text Context: ${documentText || "None provided."}
    
    Answer the user's question deeply, accurately, and provide practical application contexts.`

    // 2. Fetch from the official Gemini 1.5 Flash endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { 
            role: "user",
            parts: [{ text: prompt }] 
          }
        ],
        systemInstruction: {
          parts: [{ text: systemInstructions }]
        }
      })
    })

    const data = await response.json()

    // Handle API level errors (e.g., bad key, blocked content)
    if (!response.ok) {
      console.error("Gemini API Error Payload:", data)
      return NextResponse.json({ error: data.error?.message || "Gemini engine error" }, { status: response.status })
    }

    // 3. Extract the text safely via the exact plural JSON schema paths
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!replyText) {
      return NextResponse.json({ reply: "The model processed the request but returned an empty structural chunk." })
    }

    return NextResponse.json({ reply: replyText })

  } catch (error: any) {
    console.error("API Route Pipeline Crash:", error)
    return NextResponse.json({ error: error.message || "Pipeline failure" }, { status: 500 })
  }
}