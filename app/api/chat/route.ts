import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { prompt, formulaContext, documentText } = await request.json()

    const systemInstructions = `
      You are an advanced academic research assistant.
      The student is interacting with an asset that contains the following LaTeX formula:
      ${formulaContext || "No explicit formula selected"}

      Additional document text stream context:
      ${documentText || "No extra text context provided"}

      Answer the user's question accurately, deeply, and provide real-life application contexts where applicable.
    `

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, // Hidden securely on Vercel
      },
      body: JSON.stringify({
        model: "gpt-4o", 
        messages: [
          { role: "system", content: systemInstructions },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
      }),
    })

    const aiData = await response.json()
    
    if (!response.ok) {
      throw new Error(aiData.error?.message || "AI Engine error")
    }

    const replyText = aiData.choices[0].message.content
    return NextResponse.json({ reply: replyText })

  } catch (error: any) {
    console.error("API Route Error:", error)
    return NextResponse.json({ error: error.message || "Pipeline failure" }, { status: 500 })
  }
}