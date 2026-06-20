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

      New Document:
      - Title: "${newDoc.title}"
      - Keywords: ${JSON.stringify(newDoc.keywords)}
      - Excerpt/Abstract: "${newDoc.textSnippet}"

      Existing Graph Nodes in Database:
      ${JSON.stringify(
        existingNodes.map((node) => ({
          id: node.id,
          label: node.label,
          //node_type: node.node_type,
          keywords: node.keywords || [],
          summary: node.summary,
        })),
      )}

      STEP 1 — DETERMINE WHETHER THE DOCUMENT BELONGS TO THE SAME KNOWLEDGE AREA
      First determine whether the new document belongs to the same subject or conceptual area as each existing document.

      Examples of unrelated areas:
      - Calculus vs Human Anatomy
      - Thermodynamics vs Medieval Literature
      - Machine Learning vs Organic Chemistry
      - Nursing vs Structural Engineering

      If two documents are academically unrelated, DO NOT create any edge.

      Never connect documents simply because:
      • both are academic
      • both are STEM
      • both mention "analysis"
      • both contain mathematics
      • both discuss experiments
      • both contain generic educational language

      If no meaningful relationship exists with any node, return:
      {
        "newNodeType":"paper",
        "newEdges":[]
      }
      

      STEP 2 — DETERMINE THE RELATIONSHIP
      If the documents ARE related, determine which relationship exists. 
      There are ONLY TWO possible relationships.
      1. REQUIRES_PREREQUISITE
        Use ONLY when learning one document is genuinely necessary before understanding the other.

        Think in terms of educational dependency.

        Examples:
        Calculus I → Calculus II
        Calculus II → Calculus III
        Basic Cell Biology → Genetics
        Programming Fundamentals → Data Structures
        Linear Algebra → Machine Learning
        Mechanics → Dynamics

        The prerequisite must provide foundational knowledge required by the dependent document.

        Direction:
        sourceId = prerequisite
        targetId = dependent document

        DO NOT create prerequisite edges merely because:
        • topics are similar
        • one is slightly more advanced
        • they belong to the same course
        • they have overlapping keywords

        There must be a genuine learning dependency.

      2. research_gap
        Use when two documents are academically related but neither is required before the other.

        This relationship indicates conceptual association rather than educational dependency.

        Examples:
        • two papers exploring different approaches to the same problem
        • two studies comparing competing methods
        • two independent topics within the same course
        • complementary concepts
        • documents addressing different perspectives of the same domain
        • one paper extends, critiques, compares, or complements another

        Neither document should be considered a prerequisite.

        
      WHEN NOT TO CONNECT
      Return NO EDGE when:
      • subjects are unrelated
      • relationship is weak
      • only keyword overlap exists
      • connection requires speculation
      • connection is indirect
      • relationship cannot be confidently justified

      When uncertain, prefer returning NO EDGE.


      EDGE JUSTIFICATION
      Every edge must include a concise academic justification explaining WHY the relationship exists.

      Good example:
        "Calculus II introduces integration techniques that are required before studying multivariable integration in Calculus III."

        "Both papers investigate graph neural networks using different optimization strategies, making them complementary but not prerequisite."

      Bad example:
        "They are related."
        "They are both about science."

      
      OUTPUT
      Return ONLY valid JSON object matching this schema:
      {
        "newNodeType":"paper"| "prerequisite" | "research_gap",
        "newEdges":[
          {
            "sourceId":"...",
            "targetId":"...",
            "relationshipType": "prerequisite" | "research_gap",
            "justification":"..."
          }
        ]
      }
      `

    const decisions = await generateJson(prompt, analyzeDependenciesResponseSchema)

    const validNodeIds = new Set(existingNodes.map((node) => node.id))
    const sanitizedUpdates = decisions.updatedExistingNodes.filter((update) => validNodeIds.has(update.id))

    return jsonOk({
      newNodeType: decisions.newNodeType,
      newEdges: decisions.newEdges,
      updatedExistingNodes: sanitizedUpdates,
    })
  } catch (error) {
    console.error("Analyze dependencies API error:", error)
    return jsonError(getErrorMessage(error), error instanceof Error && error.message.includes("configured") ? 503 : 400)
  }
}
