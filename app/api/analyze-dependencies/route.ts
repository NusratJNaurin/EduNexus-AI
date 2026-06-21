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
        newEdges: [],
      })
    }

    const prompt = `You are an academic knowledge graph supervisor responsible for maintaining a clean, logically accurate knowledge graph.

      Your goal is NOT to maximize the number of connections.
      Your goal is to create ONLY connections that are academically defensible.
      A missing edge is always better than an incorrect edge.

      The ID for the newly uploaded document is strictly: "NEW_DOCUMENT_ID"

      New Document details:
      - ID: "NEW_DOCUMENT_ID"
      - Title: "${newDoc.title}"
      - Keywords: ${JSON.stringify(newDoc.keywords)}
      - Excerpt/Abstract: "${newDoc.textSnippet}"

      Existing Graph Nodes in Database:
      ${JSON.stringify(
        existingNodes.map((node) => ({
          id: node.id,
          label: node.label,
          keywords: node.keywords || [],
          summary: node.summary,
        })),
      )}

      STEP 1 — DETERMINE WHETHER THE DOCUMENT BELONGS TO THE SAME KNOWLEDGE AREA
      First determine whether the new document belongs to the same subject or conceptual area as each existing document.
      If two documents are academically unrelated, DO NOT create any edge.

      Never connect documents simply because both are academic, STEM, mention "analysis", contain math, or discuss experiments.

      STEP 2 — DETERMINE THE RELATIONSHIP
      If they are related, determine which relationship exists.

      1. "prerequisite" (Learning Dependency)
        Use ONLY when learning one document is genuinely necessary before understanding the other.
        Direction: 
        - If an existing node is a foundation for the new document: source_node_id = [Existing Node ID], target_node_id = "NEW_DOCUMENT_ID"
        - If the new document is a foundation for an existing node: source_node_id = "NEW_DOCUMENT_ID", target_node_id = [Existing Node ID]

      2. "research_gap" (Conceptual association/Extension)
        Use when papers explore different approaches to the same problem, look at competing methods, or one paper extends/critiques another.
        Direction:
        - source_node_id = "NEW_DOCUMENT_ID"
        - target_node_id = [Existing Node ID]

      WHEN NOT TO CONNECT
      When uncertain or if only light keyword overlap exists, prefer returning NO EDGE.

      OUTPUT FORMAT
      Return ONLY a valid JSON object matching this exact schema structural blueprint:
      {
        "newNodeType": "paper",
        "updatedExistingNodes": [], 
        "newEdges": [
          {
            "source_node_id": "ID of the source node string",
            "target_node_id": "ID of the target node string",
            "relationship_type": "prerequisite" or "research_gap",
            "justification": "1-2 sentence academic justification string"
          }
        ]
      }`

    // Call Gemini with our strictly updated prompt structural map
    const decisions = await generateJson(prompt, analyzeDependenciesResponseSchema)

    // Substitute the placeholder string "NEW_DOCUMENT_ID" back to the actual document ID from your payload
    const realizedEdges = (decisions.newEdges || []).map((edge) => ({
      ...edge,
      source_node_id: edge.source_node_id === "NEW_DOCUMENT_ID" ? newDoc.id : edge.source_node_id,
      target_node_id: edge.target_node_id === "NEW_DOCUMENT_ID" ? newDoc.id : edge.target_node_id,
    }))

    const validNodeIds = new Set(existingNodes.map((node) => node.id))
    const sanitizedUpdates = (decisions.updatedExistingNodes || []).filter((update) => 
      validNodeIds.has(update.id)
    )

    return jsonOk({
      newNodeType: decisions.newNodeType || "paper",
      newEdges: realizedEdges,
      updatedExistingNodes: sanitizedUpdates,
    })
  } catch (error) {
    console.error("Analyze dependencies API error:", error)
    return jsonError(
      getErrorMessage(error), 
      error instanceof Error && error.message.includes("configured") ? 503 : 400
    )
  }
}
