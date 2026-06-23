import { generateEmbedding, ServiceUnavailableError } from "@/lib/api/gemini"
import { getErrorMessage, jsonError, jsonOk } from "@/lib/api/response"
import { supabase } from "@/lib/supabase"

const SIMILARITY_THRESHOLD = 0.78

/**
 * Computes the cosine similarity between two vectors (both of equal length).
 * Returns a value in [0, 1] (clamped — negative values are treated as 0).
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  if (magnitude === 0) return 0

  const raw = dotProduct / magnitude
  // Clamp to [0, 1] — conceptually negative similarity means no match
  return Math.max(0, Math.min(1, raw))
}

/**
 * Generates embeddings for each concept string in an array.
 * Returns a parallel array of [concept, embedding] pairs.
 * Embeddings are stored in-memory only — never persisted to the DB.
 */
async function embedConcepts(concepts: string[]): Promise<Array<{ concept: string; embedding: number[] }>> {
  const results: Array<{ concept: string; embedding: number[] }> = []

  for (const concept of concepts) {
    const trimmed = concept.trim()
    if (!trimmed) continue

    try {
      const embedding = await generateEmbedding(trimmed)
      results.push({ concept: trimmed, embedding })
    } catch (err) {
      console.warn(`[Embedding] Failed to embed concept "${trimmed}":`, err)
      // Skip concepts that fail to embed rather than crashing the entire pipeline
    }
  }

  return results
}

interface InferDependenciesRequest {
  newNodeId: string
  prerequisiteConcepts: string[]
}

export async function POST(request: Request) {
  try {
    const body: InferDependenciesRequest = await request.json()

    if (!body.newNodeId || !body.prerequisiteConcepts || body.prerequisiteConcepts.length === 0) {
      return jsonOk({ edges: [] })
    }

    const { prerequisiteConcepts, newNodeId } = body

    // Fetch the new node to ensure it exists and get workspace/owner info
    const { data: newNode, error: newNodeError } = await supabase
      .from("concept_nodes")
      .select("id, owner_id, document_id")
      .eq("id", newNodeId)
      .single()

    if (newNodeError || !newNode) {
      return jsonError("New concept node not found", 404)
    }

    // Fetch all existing knowledge-bearing concept nodes for the same owner (workspace)
    // Exclude the new node itself
    const { data: existingNodes, error: existingError } = await supabase
      .from("concept_nodes")
      .select("id, label, main_concepts, is_knowledge_bearing")
      .eq("owner_id", newNode.owner_id)
      .eq("is_knowledge_bearing", true)
      .neq("id", newNodeId)

    if (existingError) {
      return jsonError("Failed to fetch existing concept nodes", 500)
    }

    if (!existingNodes || existingNodes.length === 0) {
      return jsonOk({ edges: [] })
    }

    // Collect all unique main_concepts from existing nodes for batch embedding
    const existingConceptSet = new Map<string, string[]>() // nodeId -> [concept strings]
    const allMainConceptStrings: string[] = []

    for (const node of existingNodes) {
      const mainConcepts: string[] = Array.isArray(node.main_concepts) ? node.main_concepts : []
      existingConceptSet.set(node.id, mainConcepts)
      for (const concept of mainConcepts) {
        const trimmed = concept.trim()
        if (trimmed && !allMainConceptStrings.includes(trimmed)) {
          allMainConceptStrings.push(trimmed)
        }
      }
    }

    if (allMainConceptStrings.length === 0) {
      return jsonOk({ edges: [] })
    }

    // Generate embeddings for all prerequisite concepts (in-memory)
    const prereqEmbeddings = await embedConcepts(prerequisiteConcepts)

    if (prereqEmbeddings.length === 0) {
      return jsonOk({ edges: [] })
    }

    // Generate embeddings for all unique main concepts across existing nodes (in-memory)
    const mainConceptEmbeddings = await embedConcepts(allMainConceptStrings)

    if (mainConceptEmbeddings.length === 0) {
      return jsonOk({ edges: [] })
    }

    // Build a lookup: concept string -> embedding
    const mainEmbeddingMap = new Map<string, number[]>()
    for (const item of mainConceptEmbeddings) {
      mainEmbeddingMap.set(item.concept, item.embedding)
    }

    // Fetch existing edges to prevent duplicates
    const existingEdgeKeys = new Set<string>()
    const { data: existingEdges } = await supabase
      .from("concept_edges")
      .select("source_node_id, target_node_id, relationship_type")
      .eq("owner_id", newNode.owner_id)

    if (existingEdges) {
      for (const edge of existingEdges) {
        existingEdgeKeys.add(`${edge.source_node_id}|${edge.target_node_id}|${edge.relationship_type}`)
      }
    }

    type InferredEdge = {
      source_node_id: string
      target_node_id: string
      relationship_type: "prerequisite"
      justification: string
    }

    const edges: InferredEdge[] = []

    // For each existing knowledge-bearing node, check if its main concepts
    // have high cosine similarity with any of the new document's prerequisite concepts
    for (const existingNode of existingNodes) {
      const nodeMainConcepts: string[] = existingConceptSet.get(existingNode.id) ?? []

      if (nodeMainConcepts.length === 0) continue

      // Track best similarity score for this existing node
      let bestScore = 0
      const matchedPairs: Array<{ prereq: string; main: string; score: number }> = []

      for (const prereqItem of prereqEmbeddings) {
        for (const mainConcept of nodeMainConcepts) {
          const mainEmb = mainEmbeddingMap.get(mainConcept.trim())
          if (!mainEmb) continue

          const score = cosineSimilarity(prereqItem.embedding, mainEmb)
          if (score > bestScore) {
            bestScore = score
          }
          if (score >= SIMILARITY_THRESHOLD) {
            matchedPairs.push({ prereq: prereqItem.concept, main: mainConcept, score })
          }
        }
      }

      // Only create edge if best similarity meets threshold
      if (bestScore >= SIMILARITY_THRESHOLD) {
        const edgeKey = `${existingNode.id}|${newNode.id}|prerequisite`
        if (!existingEdgeKeys.has(edgeKey)) {
          // Build justification from best matching pairs
          const topPairs = matchedPairs
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map((p) => p.main)

          const justification =
            topPairs.length > 0
              ? `This document requires knowledge of: ${topPairs.join(", ")} — which is taught by the existing document "${existingNode.label}". (cosine similarity: ${bestScore.toFixed(3)})`
              : `The concepts taught in "${existingNode.label}" are foundational prerequisites for understanding this new document. (cosine similarity: ${bestScore.toFixed(3)})`

          edges.push({
            source_node_id: existingNode.id,
            target_node_id: newNodeId,
            relationship_type: "prerequisite",
            justification,
          })
        }
      }
    }

    // Insert all inferred edges into the database
    if (edges.length > 0) {
      const { error: insertError } = await supabase.from("concept_edges").insert(
        edges.map((edge) => ({
          owner_id: newNode.owner_id,
          source_node_id: edge.source_node_id,
          target_node_id: edge.target_node_id,
          relationship_type: edge.relationship_type,
          justification: edge.justification,
        })),
      )

      if (insertError) {
        console.error("Failed to insert inferred edges:", insertError)
        return jsonError("Failed to save inferred prerequisite edges", 500)
      }
    }

    return jsonOk({
      edges,
      workspaceId: newNode.owner_id,
      inferenceStrategy: "embedding-cosine-similarity",
      threshold: SIMILARITY_THRESHOLD,
    })
  } catch (error) {
    console.error("Infer dependencies API error:", error)
    if (error instanceof ServiceUnavailableError) {
      return jsonError(getErrorMessage(error), 503)
    }
    return jsonError(getErrorMessage(error), 400)
  }
}