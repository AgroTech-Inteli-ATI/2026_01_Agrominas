---
sidebar_position: 2
title: Implementação do Frontend (Views)
description: Documentação das implementações realizadas na pasta backend/src/views para o painel administrativo
---

# Implementação do Frontend (Views)

## Visão Geral

A pasta `backend/src/views` concentra o frontend do painel administrativo em formato **SPA (Single Page Application)** com roteamento por hash (`#/rota`), autenticação por token em `localStorage`, fluxo de cadastro de fontes e tela de consulta/edição de artigos.

O frontend foi estruturado em:

- Entrada HTML única (`index.html`)
- Estilização central (`css/styles.css`)
- Camada de infraestrutura JS (`js/`)
- Páginas da aplicação (`pages/`)

---

## Fluxo da Aplicação

```
index.html
   │
   ▼
js/app.js              ← inicialização da SPA + registro de rotas
   │
   ▼
js/router.js           ← navegação por hash e resolução de rotas
   │
   ├── /login          → pages/login.js
   ├── /home           → pages/home.js
   ├── /confirmacao    → pages/confirmacao.js
   └── /consulta       → pages/consulta.js

Infra compartilhada:
- js/api.js            ← autenticação + CRUD + modo mock
- js/utils.js          ← layout, modais, toast, loading, helpers
- css/styles.css       ← design system e componentes visuais
```

---

## Estrutura de Arquivos (`backend/src/views`)

```
views/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── api.js
│   ├── router.js
│   └── utils.js
└── pages/
    ├── login.js
    ├── home.js
    ├── confirmacao.js
    └── consulta.js
```

---

## Módulos

### `index.html`

Arquivo base da SPA.

- Carrega `css/styles.css`
- Mantém o container raiz `#app` para renderização dinâmica
- Define `#toast-container` para notificações
- Inicializa a aplicação com `js/app.js` (`type="module"`)

---

### `js/app.js`

Ponto de entrada da aplicação frontend.

- Registra todas as rotas do sistema
- Implementa `requireAuth` para proteger rotas privadas
- Redireciona `/` para `/home` ou `/login` conforme autenticação
- Configura rota `/404` para caminhos inexistentes

Rotas registradas:

- Pública: `/login`
- Protegidas: `/home`, `/confirmacao`, `/consulta`

---

### `js/router.js`

Sistema de roteamento SPA baseado em hash.

- Registro de handlers por rota (`register`)
- Navegação programática (`navigate`)
- Match de rota com parâmetros dinâmicos (`matchRoute`)
- Tratamento de `hashchange` e `load`
- Fallback para `/404` ou redirecionamento para login

---

### `js/api.js`

Camada de comunicação com o backend.

#### Configuração principal

- `API_BASE_URL = http://localhost:3000/api/v1`
- `MOCK_MODE = true` para funcionamento sem backend
- Armazena `token` e `usuario` em `localStorage`
- Injeta `Authorization: Bearer <token>` automaticamente
- Em `401`, limpa sessão e redireciona para `/login`

#### Recursos implementados

- **Autenticação**: `login`, `logout`, `getMe`, `isAuthenticated`
- **Artigos**: listar, obter, criar, atualizar, alterar status, deletar
- **Categorias**: listar, obter, criar, atualizar, deletar
- **Insumos**: listar, obter, criar, atualizar, deletar

#### Modo mock

Inclui base simulada de:

- Usuário autenticado
- Categorias
- Insumos
- Artigos (com diferentes status)

Com isso, o frontend pode ser validado mesmo sem API ativa.

---

### `js/utils.js`

Biblioteca de utilitários de interface e helpers.

Funcionalidades implementadas:

- Toasts (`showToast`)
- Loading (`showLoading`)
- Empty state (`showEmptyState`)
- Layout padrão com header/navegação/logout (`renderLayout`)
- Modal genérico (`openModal`, `closeModal`)
- Confirmação de ação destrutiva (`confirmAction`)
- Formatação de data e data/hora (`formatDate`, `formatDateTime`)
- Debounce para busca (`debounce`)
- Sanitização e utilitários de texto (`escapeHtml`, `truncateText`)

---

### `pages/login.js`

Tela de autenticação do painel.

- Renderiza formulário de login (e-mail/senha)
- Chama `api.login`
- Exibe feedback de sucesso/erro
- Em sucesso, redireciona para `#/home`

---

### `pages/home.js`

Tela de **Adicionar Fontes**.

Funcionalidades principais:

- Barra de busca para redirecionar à consulta
- Dropzone com drag-and-drop e seleção de múltiplos arquivos
- Entradas de fontes por:
  - Arquivo local
  - URL
  - Google Drive
  - Texto copiado
- Preview de itens adicionados com remoção individual
- Persistência temporária em `sessionStorage` (`arquivosPendentes`)
- Navegação para tela de confirmação (`#/confirmacao`)
- Pré-carregamento de categorias e insumos para etapas seguintes

---

### `pages/confirmacao.js`

Tela de revisão antes do envio para biblioteca.

Funcionalidades principais:

- Carrega itens pendentes do `sessionStorage`
- Lista os cards de confirmação com ação de editar/remover
- Modal de edição de metadados:
  - título, resumo, autor, fonte
  - categorias e insumos (multi-select)
  - status (`rascunho`/`publicado`)
- Envio em lote dos itens para `api.criarArtigo`
- Exibição de resultado com contagem de sucessos/erros
- Limpeza de pendências após envio

---

### `pages/consulta.js`

Tela de consulta e gestão completa das fontes (CRUD).

Funcionalidades principais:

- Busca por título (botão, Enter e debounce)
- Filtro por status (todos/publicado/rascunho/arquivado)
- Paginação de resultados
- Lista clicável com seleção ativa
- Menu contextual por item (editar, alterar status, excluir)
- Painel lateral de detalhes com dados completos do artigo
- Modal de edição completa do artigo
- Modal de alteração rápida de status
- Confirmação e exclusão com feedback visual

---

### `css/styles.css`

Folha de estilo central do frontend, organizada por blocos de componentes.

Principais grupos implementados:

- Reset global e variáveis de tema (`:root`)
- Layout principal (`#app`, `.container`, `.main-content`)
- Header e navegação
- Barra de busca e filtros
- Dropzone e botões de fonte
- Listagem/cards de resultados
- Menu contextual
- Split view da consulta (lista + detalhes)
- Cards de confirmação
- Sistema de botões e formulários
- Modal genérico
- Tela de login
- Alertas, loading, empty state, paginação e toasts
- Regras de responsividade para mobile/tablet

---

## Comportamentos e Decisões de Implementação

- **Arquitetura SPA simples** com hash routing para evitar dependência de servidor de frontend.
- **Proteção de rotas no cliente** via middleware `requireAuth`.
- **Experiência orientada a fluxo**: adicionar fonte → confirmar/editar metadados → enviar → consultar.
- **Modo mock no serviço de API** para aceleração de desenvolvimento e testes de interface.
- **Componentização por utilitários** em `utils.js` para reduzir duplicação de lógica visual.

---

## Resumo da Sprint (Views)

Nesta sprint, a pasta `views` passou a cobrir de ponta a ponta o fluxo administrativo de fontes:

- Login e controle de sessão
- Cadastro multicanal de fontes
- Revisão/edição antes do envio
- Consulta com detalhes e operações CRUD completas
- Base visual consistente e responsiva com componentes reutilizáveis

Com isso, o frontend ficou funcional para operação e validação do painel, inclusive em ambiente sem backend ativo (via mock).

