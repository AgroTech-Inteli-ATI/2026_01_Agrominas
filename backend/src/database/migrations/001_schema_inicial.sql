-- ============================================================
-- MIGRATION 001 — Schema inicial do Guia Regenerativo
-- Representa o estado atual do banco no Supabase.
-- Executar no SQL Editor do Supabase apenas se recriar do zero.
-- ============================================================

-- ─── USUÁRIOS ADMINISTRATIVOS ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usuarios_admin (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  nome       VARCHAR     NOT NULL,
  email      VARCHAR     NOT NULL UNIQUE,
  senha_hash TEXT        NOT NULL,
  perfil     VARCHAR     NOT NULL CHECK (perfil IN ('admin', 'editor')),
  ativo      BOOLEAN     NOT NULL DEFAULT true,
  criado_em  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT usuarios_admin_pkey PRIMARY KEY (id)
);

-- ─── CATEGORIAS ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.categorias (
  id        UUID    NOT NULL DEFAULT gen_random_uuid(),
  nome      VARCHAR NOT NULL UNIQUE,
  descricao TEXT,
  CONSTRAINT categorias_pkey PRIMARY KEY (id)
);

-- ─── INSUMOS REGENERATIVOS ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.insumos_regenerativos (
  id             UUID      NOT NULL DEFAULT gen_random_uuid(),
  nome           VARCHAR   NOT NULL,
  descricao      TEXT,
  beneficios     TEXT,
  modo_aplicacao TEXT,
  criado_em      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT insumos_regenerativos_pkey PRIMARY KEY (id)
);

-- ─── ARTIGOS ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.artigos (
  id              UUID      NOT NULL DEFAULT gen_random_uuid(),
  titulo          VARCHAR   NOT NULL,
  resumo          TEXT,
  conteudo        TEXT      NOT NULL,
  autor           VARCHAR,
  data_publicacao DATE,
  fonte           VARCHAR,
  status          VARCHAR   NOT NULL DEFAULT 'rascunho'
                            CHECK (status IN ('rascunho', 'publicado', 'arquivado')),
  criado_por      UUID      NOT NULL,
  criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT artigos_pkey PRIMARY KEY (id),
  CONSTRAINT fk_artigos_criado_por FOREIGN KEY (criado_por)
    REFERENCES public.usuarios_admin(id)
);

-- ─── ARTIGOS × CATEGORIAS (N:N) ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.artigos_categorias (
  artigo_id    UUID NOT NULL,
  categoria_id UUID NOT NULL,
  CONSTRAINT artigos_categorias_pkey PRIMARY KEY (artigo_id, categoria_id),
  CONSTRAINT fk_artigos_categorias_artigo    FOREIGN KEY (artigo_id)    REFERENCES public.artigos(id),
  CONSTRAINT fk_artigos_categorias_categoria FOREIGN KEY (categoria_id) REFERENCES public.categorias(id)
);

-- ─── ARTIGOS × INSUMOS (N:N) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.artigos_insumos (
  artigo_id UUID NOT NULL,
  insumo_id UUID NOT NULL,
  CONSTRAINT artigos_insumos_pkey PRIMARY KEY (artigo_id, insumo_id),
  CONSTRAINT fk_artigos_insumos_artigo FOREIGN KEY (artigo_id) REFERENCES public.artigos(id),
  CONSTRAINT fk_artigos_insumos_insumo FOREIGN KEY (insumo_id) REFERENCES public.insumos_regenerativos(id)
);

-- ─── METADADOS DOS ARTIGOS (1:1) ─────────────────────────────
-- ATENÇÃO: coluna é "cultura", não "cultura_agricola"

CREATE TABLE IF NOT EXISTS public.metadados_artigos (
  id              UUID    NOT NULL DEFAULT gen_random_uuid(),
  artigo_id       UUID    NOT NULL UNIQUE,
  cultura         VARCHAR,
  regiao          VARCHAR,
  tipo_solo       VARCHAR,
  nivel_evidencia VARCHAR,
  palavras_chave  TEXT,
  CONSTRAINT metadados_artigos_pkey PRIMARY KEY (id),
  CONSTRAINT fk_metadados_artigos_artigo FOREIGN KEY (artigo_id)
    REFERENCES public.artigos(id)
);

-- ─── PERGUNTAS FREQUENTES WHATSAPP ───────────────────────────

CREATE TABLE IF NOT EXISTS public.perguntas_frequentes_whatsapp (
  id                      UUID      NOT NULL DEFAULT gen_random_uuid(),
  pergunta                TEXT      NOT NULL,
  frequencia              INTEGER   NOT NULL DEFAULT 1,
  cultura                 VARCHAR,
  regiao                  VARCHAR,
  respondida_com_sucesso  BOOLEAN   NOT NULL DEFAULT true,
  criada_em               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizada_em           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT perguntas_frequentes_whatsapp_pkey PRIMARY KEY (id)
);
