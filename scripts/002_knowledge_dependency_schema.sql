-- ============================================================================
-- EduNexus AI — Knowledge Bearing Document & Dependency Inference Schema
-- ============================================================================

-- Add columns to concept_nodes for storing AI-generated metadata
alter table public.concept_nodes
  add column if not exists main_concepts jsonb not null default '[]'::jsonb,
  add column if not exists prerequisite_concepts jsonb not null default '[]'::jsonb,
  add column if not exists learning_objectives jsonb not null default '[]'::jsonb,
  add column if not exists is_knowledge_bearing boolean not null default false;

-- Add index on is_knowledge_bearing for efficient filtering
create index if not exists concept_nodes_is_knowledge_bearing_idx 
  on public.concept_nodes (is_knowledge_bearing);

-- Add index on document_id + is_knowledge_bearing for workspace lookups
create index if not exists concept_nodes_doc_knowledge_idx 
  on public.concept_nodes (document_id, is_knowledge_bearing);

-- Update RLS to allow the new columns to be written (same policy covers them since it's the same table)