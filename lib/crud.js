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

export { createCrudHelpers };