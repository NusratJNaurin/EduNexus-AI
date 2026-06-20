import { z } from "zod"

export const conceptNodeTypeSchema = z.enum(["paper", "prerequisite", "research_gap"])

export const relationshipTypeSchema = z.enum([
  "prerequisite",
  "research_gap",
])

export const chatRequestSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required.").max(4000),
  documentText: z.string().max(50000).optional(),
  formulaContext: z.string().max(8000).optional(),
})

export const summarizeRequestSchema = z.object({
  text: z.string().trim().min(1, "Document text is required for summarization.").max(50000),
  fileName: z.string().trim().min(1, "File name is required.").max(255),
})

export const analyzeDependenciesNewDocSchema = z.object({
  title: z.string().trim().min(1).max(500),
  keywords: z.array(z.string().trim().min(1).max(100)).max(20),
  textSnippet: z.string().trim().min(1).max(5000),
})

export const analyzeDependenciesExistingNodeSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(500),
  node_type: conceptNodeTypeSchema,
  keywords: z.array(z.string()).default([]), 
  summary: z.string().optional(),
})

export const analyzeDependenciesRequestSchema = z.object({
  newDoc: analyzeDependenciesNewDocSchema,
  existingNodes: z.array(analyzeDependenciesExistingNodeSchema).max(100),
})

export const dependencyEdgeSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  relationshipType: relationshipTypeSchema,
  justification: z.string().trim().min(10).max(500),
})

export const nodeTypeUpdateSchema = z.object({
  id: z.string().uuid(),
  node_type: conceptNodeTypeSchema,
})

export const analyzeDependenciesResponseSchema = z.object({
  newNodeType: conceptNodeTypeSchema,
  newEdges: z.array(dependencyEdgeSchema),
  updatedExistingNodes: z.array(nodeTypeUpdateSchema).default([]),
})

export const vivaResponseSchema = z.object({
  transcription: z.string(),
  evaluation: z.string(),
})

const MAX_AUDIO_BYTES = 10 * 1024 * 1024

export function validateVivaFormData(formData: FormData): {
  audioFile: File
  nodeLabel: string
  nodeType: string
} {
  const audioFile = formData.get("audio")
  const nodeLabel = formData.get("nodeLabel")
  const nodeType = formData.get("nodeType")

  if (!(audioFile instanceof File) || audioFile.size === 0) {
    throw new Error("A valid audio file is required.")
  }

  if (audioFile.size > MAX_AUDIO_BYTES) {
    throw new Error("Audio file exceeds the 10 MB size limit.")
  }

  if (!audioFile.type.startsWith("audio/")) {
    throw new Error("Uploaded file must be an audio format.")
  }

  return {
    audioFile,
    nodeLabel: 
      typeof nodeLabel === "string" && nodeLabel.trim() 
        ? nodeLabel.trim().slice(0, 500) 
        : "General",
      nodeType: 
      typeof nodeType === "string" && nodeType.trim() 
        ? nodeType.trim().slice(0, 50) 
        : "paper",
  }
}

export async function parseJsonBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<T> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    throw new Error("Request body must be valid JSON.")
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(" ")
    throw new Error(message)
  }

  return result.data
}
