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

    const prompt = `You are an academic graph database supervisor engine. Your job is to identify if a conceptual structural dependency relationship exists between a newly uploaded document and a set of existing graph nodes.

New Document:
- Title: "${newDoc.title}"
- Keywords: ${JSON.stringify(newDoc.keywords)}
- Summary Core: "${newDoc.textSnippet}"

Existing Graph Nodes in Database:
${JSON.stringify(
  existingNodes.map((node) => ({
    id: node.id,
    label: node.label,
    current_type: node.node_type,
  })),
)}

CRITICAL RULES:
1. A node should only be marked as "prerequisite" if its concepts are absolutely foundational and required to understand the other document.
2. If the new document is a prerequisite for an existing document, mark that existing node's target type as "prerequisite".
3. If an existing document is a prerequisite for this new document, mark the new document's type as "prerequisite".
4. If there is no educational or sequential relationship, leave their roles as "paper".
5. Only use these exact node types: "paper", "prerequisite", "research_gap".

Return your analysis strictly as a JSON object matching this schema:
{
  "newNodeType": "paper" | "prerequisite" | "research_gap",
  "updatedExistingNodes": [
    { "id": "string", "updatedType": "paper" | "prerequisite" | "research_gap" }
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
