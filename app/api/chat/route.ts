import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { prompt, formulaContext, documentText } = await request.json()

    const systemInstructions = `You are an advanced academic research assistant. 
    Formula: ${formulaContext || "None"} 
    Context: ${documentText || "None"}`

    // Gemini API Free Endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: `${systemInstructions}\n\nUser Question: ${prompt}` }] 
        }]
      })
    })

    const data = await response.json()
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received."

    return NextResponse.json({ reply: replyText })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}