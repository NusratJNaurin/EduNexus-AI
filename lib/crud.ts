import { supabase } from "./supabase"
import type {
  ClassSectionRow,
  ConceptNodeRow,
  ProfileRow,
  ResearchDocumentRow,
  SectionEnrollmentRow,
  ConceptEdgeRow,
} from "./types"

type CrudRecord = object

function createCrudHelpers<T extends CrudRecord>(tableName: string, idColumn = "id") {
  const fetchAll = async (): Promise<T[]> => {
    const { data, error } = await supabase.from(tableName).select("*")
    if (error) throw error
    return (data ?? []) as T[]
  }

  const fetchById = async (id: string): Promise<T> => {
    const { data, error } = await supabase.from(tableName).select("*").eq(idColumn, id).single()
    if (error) throw error
    return data as T
  }

  // FIXED: Changed payload from Partial<T> to a structured map input passing explicit table requirements
  const insertRecord = async (payload: Partial<T> & Record<string, unknown>): Promise<T> => {
    const { data, error } = await supabase
      .from(tableName)
      .insert(payload as Record<string, unknown>)
      .select("*")
      .single()
      
    if (error) throw error
    return data as T
  }

  const updateById = async (id: string, payload: Partial<T>): Promise<T> => {
    const { data, error } = await supabase
      .from(tableName)
      .update(payload as Record<string, unknown>)
      .eq(idColumn, id)
      .select("*")
      .single()

    if (error) throw error
    return data as T
  }

  const deleteById = async (id: string): Promise<T> => {
    const { data, error } = await supabase.from(tableName).delete().eq(idColumn, id).select("*").single()
    if (error) throw error
    return data as T
  }

  return { fetchAll, fetchById, insertRecord, updateById, deleteById }
}

export const profilesCrud = createCrudHelpers<ProfileRow>("profiles")
export const researchDocumentsCrud = createCrudHelpers<ResearchDocumentRow>("research_documents")
export const conceptNodesCrud = createCrudHelpers<ConceptNodeRow>("concept_nodes")
export const classSectionsCrud = createCrudHelpers<ClassSectionRow>("class_sections")
export const sectionEnrollmentsCrud = createCrudHelpers<SectionEnrollmentRow>("section_enrollments")
export const conceptEdgesCrud = createCrudHelpers<ConceptEdgeRow>("concept_edges") // Grouped cleanly together!

export async function uploadFileToStorage(
  bucketName: string,
  filePath: string,
  fileObject: File,
): Promise<{ path: string; publicUrl: string }> {
  const { data, error } = await supabase.storage.from(bucketName).upload(filePath, fileObject, {
    cacheControl: "3600",
    upsert: true,
  })

  if (error) throw error

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath)

  return {
    path: data.path,
    publicUrl: publicUrlData.publicUrl,
  }
}

export function getFileUrl(bucketName: string, filePath: string): string {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath)
  return data.publicUrl
}

export { createCrudHelpers }