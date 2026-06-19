import { generateJson } from "@/lib/api/gemini"
import { getErrorMessage, jsonError, jsonOk } from "@/lib/api/response"
import {
  analyzeDependenciesRequestSchema,
  analyzeDependenciesResponseSchema,
  parseJsonBody,
} from "@/lib/api/validation"

export async function POST(request: Request) {
  try {
    const { newDoc, existingNodes } = await parseJsonBody(request, analyzeDependenciesRequestSchema)

    if (existingNodes.length === 0) {
      return jsonOk({
        newNodeType: "paper",
        updatedExistingNodes: [],
      })
    }

    const prompt = `You are an academic graph database supervisor engine. Your job is to identify if a conceptual structural or sequential dependency relationships exist between a newly uploaded document and your existing graph nodes.

      New Document:
      - Title: "${newDoc.title}"
      - Keywords: ${JSON.stringify(newDoc.keywords)}
      - Excerpt/Abstract Footprint: "${newDoc.textSnippet}"

      Existing Graph Nodes in Database:
      ${JSON.stringify(
        existingNodes.map((node) => ({
          id: node.id,
          label: node.label,
          node_type: node.node_type,
          keywords: node.keywords || [],
          summary: node.summary,
        })),
      )}

      CRITICAL CLASSIFICATION ARCHITECTURE RULES:
      1. BASELINE DEFAULT ("paper"): Treat "paper" as the standard baseline entry type. If a document is simply in the same field or related topically without a strict sequential constraint, it MUST remain or default to "paper". Do not overclassify.
      2. SEQUENTIAL PREREQUISITES ("prerequisite"):
        - If the New Document directly builds upon, inherits frameworks from, or requires a reader to understand an Existing Node first, classify the NEW document's "newNodeType" as "prerequisite".
        - If the New Document is a foundational framework that an Existing Node explicitly requires, change that specific existing node's "node_type" to "prerequisite" inside "updatedExistingNodes".
      3. LITERATURE HOLES ("research_gap"):
        - If the New Document explicitly exposes, aims to solve, or isolates an unaddressed experimental limitation, structural flaw, or scope constraint outlined in an Existing Node's summary, change that existing node's "node_type" to "research_gap".

      Return your analysis strictly as a JSON object matching this schema:
      {
        "newNodeType": "paper" | "prerequisite" | "research_gap",
        "updatedExistingNodes": [
          { 
            "id": "string", 
            "node_type": "paper" | "prerequisite" | "research_gap"
          }
        ]
      }`

    const decisions = await generateJson(prompt, analyzeDependenciesResponseSchema)

    const validNodeIds = new Set(existingNodes.map((node) => node.id))
    const sanitizedUpdates = decisions.updatedExistingNodes.filter((update) => validNodeIds.has(update.id))

    return jsonOk({
      newNodeType: decisions.newNodeType,
      updatedExistingNodes: sanitizedUpdates,
    })
  } catch (error) {
    console.error("Analyze dependencies API error:", error)
    return jsonError(getErrorMessage(error), error instanceof Error && error.message.includes("configured") ? 503 : 400)
  }
}
