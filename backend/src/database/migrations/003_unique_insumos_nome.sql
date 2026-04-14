-- ============================================================
-- MIGRATION 003 — Adiciona UNIQUE em insumos_regenerativos.nome
-- Necessário para o upsert do seed funcionar sem duplicatas
-- Executar no SQL Editor do Supabase APÓS a 002
-- ============================================================

ALTER TABLE insumos_regenerativos
ADD CONSTRAINT insumos_regenerativos_nome_unique UNIQUE (nome);
