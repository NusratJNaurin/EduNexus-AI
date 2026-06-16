import { supabase } from "./supabase";

const createCrudHelpers = (tableName, idColumn = "id") => {
  const fetchAll = async () => {
    const { data, error } = await supabase.from(tableName).select("*");

    if (error) {
      throw error;
    }

    return data ?? [];
  };

  const fetchById = async (id) => {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq(idColumn, id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  };

  const insertRecord = async (payload) => {
    const { data, error } = await supabase
      .from(tableName)
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  };

  const updateById = async (id, payload) => {
    const { data, error } = await supabase
      .from(tableName)
      .update(payload)
      .eq(idColumn, id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  };

  const deleteById = async (id) => {
    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .eq(idColumn, id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  };

  return {
    fetchAll,
    fetchById,
    insertRecord,
    updateById,
    deleteById,
  };
};

export const profilesCrud = createCrudHelpers("profiles");
export const researchDocumentsCrud = createCrudHelpers("research_documents");
export const conceptNodesCrud = createCrudHelpers("concept_nodes");
export const classSectionsCrud = createCrudHelpers("class_sections");
export const sectionEnrollmentsCrud = createCrudHelpers("section_enrollments");

export { createCrudHelpers };

export const uploadFileToStorage = async (bucketName, filePath, fileObject) => {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileObject, {
      cacheControl: '3600',
      upsert: true // Overwrites if file exists
    });

  if (error) throw error;
  

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return {
    path: data.path,
    publicUrl: publicUrlData.publicUrl
  };
};


export const getFileUrl = (bucketName, filePath) => {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
};