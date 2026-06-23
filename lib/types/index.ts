export type UserRole = "student" | "faculty" | "researcher"

export type ConceptNodeType = "paper" | "prerequisite" | "research_gap"

export interface ProfileRow {
  id: string
  full_name: string
  qu_email: string
  role: UserRole
  academic_domain: string
  created_at: string
  updated_at: string
}

export interface ResearchDocumentRow {
  id: string
  owner_id: string
  title: string
  file_name: string | null
  file_url: string | null
  file_size_bytes: number | null
  page_count: number | null
  extracted_text: string | null
  keywords: string[]
  readability_score: number | null
  complexity_score: number | null
  methodology_latex: string | null
  created_at: string
  updated_at: string
}

export interface ConceptNodeRow {
  id: string
  owner_id: string
  document_id: string | null
  parent_id: string | null
  node_type: ConceptNodeType
  label: string
  description: string | null
  keywords: string[]
  summary: string | null
  main_concepts: string[]
  prerequisite_concepts: string[]
  learning_objectives: string[]
  is_knowledge_bearing: boolean
  position_x: number
  position_y: number
  viva_score: number | null
  viva_feedback: string | null
  created_at: string
  updated_at: string
}

export interface ConceptEdgeRow {
  id: string
  owner_id: string
  source_node_id: string
  target_node_id: string
  relationship_type: "prerequisite" | "research_gap"
  justification: string | null
  created_at: string
}

export interface ClassSectionRow {
  id: string
  instructor_id: string
  course_code: string
  section_number: string
  invite_code: string
  created_at: string
  updated_at: string
}

export interface SectionEnrollmentRow {
  id: string
  section_id: string
  student_id: string
  invite_code: string
  joined_at: string
  updated_at: string
}

export interface VivaFeedbackItem {
  t: string
  q: boolean
  text: string
}

export interface ChatMessage {
  id: string
  text: string
  isUser: boolean
}

export interface ApiErrorResponse {
  error: string
}

export interface ChatRequest {
  prompt: string
  documentText?: string
  formulaContext?: string
}

export interface ChatResponse {
  reply: string
}

export interface SummarizeRequest {
  text: string
  fileName: string
}

export interface SummarizeResponse {
  summary: string
  main_concepts: string[]
  prerequisite_concepts: string[]
  learning_objectives: string[]
  is_knowledge_bearing: boolean
}

export interface AnalyzeDependenciesNewDoc {
  id: string
  title: string
  keywords: string[]
  textSnippet: string
}

export interface AnalyzeDependenciesExistingNode {
  id: string
  label: string
  node_type: ConceptNodeType
  keywords: string[]
  summary?: string
}

export interface AnalyzeDependenciesRequest {
  newDoc: AnalyzeDependenciesNewDoc
  existingNodes: AnalyzeDependenciesExistingNode[]
}

export interface NodeTypeUpdate {
  id: string
  updatedType: ConceptNodeType
}

export interface DependencyEdge {
  source_node_id: string
  target_node_id: string
  relationship_type: "prerequisite" | "research_gap"
  justification: string
}

export interface AnalyzeDependenciesResponse {
  newNodeType: ConceptNodeType
  newEdges: DependencyEdge[]
  updatedExistingNodes: NodeTypeUpdate[]
}

export interface VivaResponse {
  transcription: string
  evaluation: string
}

export function parseVivaFeedback(raw: string | null | undefined): VivaFeedbackItem[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is VivaFeedbackItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as VivaFeedbackItem).t === "string" &&
        typeof (item as VivaFeedbackItem).q === "boolean" &&
        typeof (item as VivaFeedbackItem).text === "string",
    )
  } catch {
    return []
  }
}

export function serializeVivaFeedback(items: VivaFeedbackItem[]): string {
  return JSON.stringify(items)
}

export function normalizeRole(role: string | null | undefined): UserRole | "" {
  const value = role?.trim().toLowerCase() ?? ""
  if (value === "student" || value === "faculty" || value === "researcher") {
    return value
  }
  return ""
}
