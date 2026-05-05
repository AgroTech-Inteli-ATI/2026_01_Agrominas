---
sidebar_position: 3
title: Frontend - Gestao do Bot
description: Mudanças do painel administrativo na Sprint 3
---

# Frontend - Gestão do Bot (Sprint 3)

## Visão Geral

Nesta sprint, o painel administrativo em `backend/src/views` ganhou a tela de gestão do bot e os fluxos de dados que a alimentam. A tela integra perguntas pre-setadas, dashboard de uso e histórico de artigos, com suporte a modo mock para testes sem backend.

---

## Mudanças Principais

### 1. Nova tela de gestão do bot

- Rota `#/gestao-bot` registrada em `js/app.js` e link no menu do header em `js/utils.js`.
- Implementação principal em `pages/gestao-bot.js`.
- Blocos da página:
	- Dashboard de uso com KPIs, top perguntas e uso por região.
	- Matriz de perguntas por região.
	- Histórico de artigos (inclusões e atualizações), com ação de recarregar.

---

### 2. Opção de mock para dados do bot

- O `MOCK_MODE` em `js/api.js` passou a cobrir as APIs da tela de gestao do bot.
- Dados simulados adicionados em `MOCK_DATA`:
	- `perguntas_bot` (frequência, cultura, região, sucesso).
	- artigos e metadados usados para gerar o historico.
- Funções mockadas:
	- `listarPerguntasBot`, `criarPerguntaBot`, `atualizarPerguntaBot`, `excluirPerguntaBot`.
	- `obterDashboardBot` com `gerarDashboardMockPerguntas`.
	- `obterHistoricoArtigosBot`.

---

### 3. Alterações no backend para suportar a nova tela

- Novo controller admin em `backend/src/controllers/admin.controller.js` com:
	- CRUD de perguntas pre-setadas.
	- Dashboard de uso com agregações por período e top perguntas.
	- Histórico de artigos (inclusões e últimas atualizações).
- Rotas adicionadas em `backend/src/routes/index.js` (todas protegidas por `authenticate` + `authorize('admin')`):
	- `GET /admin/perguntas`
	- `POST /admin/perguntas`
	- `PUT /admin/perguntas/:id`
	- `DELETE /admin/perguntas/:id`
	- `GET /admin/dashboard/perguntas`
	- `GET /admin/artigos/historico`

---

## Arquivos adicionados

- `backend/src/views/pages/gestao-bot.js`
- `backend/src/controllers/admin.controller.js`
