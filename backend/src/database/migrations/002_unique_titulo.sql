-- ============================================================
-- MIGRATION 002 — Adiciona UNIQUE em artigos.titulo
-- Necessário para o upsert do seed funcionar sem duplicatas
-- Executar no SQL Editor do Supabase APÓS a 001
-- ============================================================

ALTER TABLE artigos
ADD CONSTRAINT artigos_titulo_unique UNIQUE (titulo);
