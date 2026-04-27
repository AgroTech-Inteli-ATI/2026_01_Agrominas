-- ============================================================
-- MIGRATION 005 - Tabela de videos
-- Armazena videos usados como referencia complementar pela IA.
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

CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);
