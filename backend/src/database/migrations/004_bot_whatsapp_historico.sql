-- ============================================================
-- MIGRATION 004 - Historico proprio do bot WhatsApp
-- Guarda apenas contatos/mensagens processados pelo bot.
-- Nao depende do historico bruto sincronizado pela Evolution API.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bot_contatos_whatsapp (
  id                   UUID      NOT NULL DEFAULT gen_random_uuid(),
  remote_jid           VARCHAR   NOT NULL UNIQUE,
  telefone             VARCHAR,
  nome                 VARCHAR,
  estado               VARCHAR   NOT NULL DEFAULT 'PRINCIPAL',
  fontes               JSONB     NOT NULL DEFAULT '[]'::jsonb,
  criado_em            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultima_interacao_em  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT bot_contatos_whatsapp_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.bot_mensagens_whatsapp (
  id               UUID      NOT NULL DEFAULT gen_random_uuid(),
  contato_id       UUID,
  remote_jid       VARCHAR   NOT NULL,
  message_id       VARCHAR,
  direcao          VARCHAR   NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  tipo             VARCHAR   NOT NULL DEFAULT 'text',
  texto            TEXT,
  evento_timestamp TIMESTAMP,
  payload          JSONB,
  criado_em        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT bot_mensagens_whatsapp_pkey PRIMARY KEY (id),
  CONSTRAINT fk_bot_mensagens_contato FOREIGN KEY (contato_id)
    REFERENCES public.bot_contatos_whatsapp(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_mensagens_message_id
  ON public.bot_mensagens_whatsapp(message_id)
  WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bot_mensagens_remote_jid
  ON public.bot_mensagens_whatsapp(remote_jid);

CREATE INDEX IF NOT EXISTS idx_bot_mensagens_criado_em
  ON public.bot_mensagens_whatsapp(criado_em DESC);
