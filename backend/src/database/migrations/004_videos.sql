-- ============================================================
-- MIGRATION 004 — Tabela de vídeos do YouTube
-- Armazena transcrição e resumo gerado por IA para uso no RAG.
-- Executar no SQL Editor do Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.videos (
  id          UUID      NOT NULL DEFAULT gen_random_uuid(),
  titulo      VARCHAR   NOT NULL,
  url_youtube VARCHAR   NOT NULL UNIQUE,
  youtube_id  VARCHAR   NOT NULL UNIQUE,
  canal       VARCHAR,
  transcricao TEXT,
  resumo      TEXT      NOT NULL,
  status      VARCHAR   NOT NULL DEFAULT 'publicado'
                        CHECK (status IN ('publicado', 'arquivado')),
  criado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT videos_pkey PRIMARY KEY (id)
);
