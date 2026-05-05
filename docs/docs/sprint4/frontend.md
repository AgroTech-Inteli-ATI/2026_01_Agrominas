---
sidebar_position: 4
title: Frontend - Videos e Consulta
description: Mudanças do painel administrativo na Sprint 4
---

# Frontend - Vídeos e Consulta (Sprint 4)

## Visão Geral

Nesta sprint, o painel administrativo passou a processar e gerir vídeos do YouTube. A tela de consulta recebeu filtro de tipo (artigos ou vídeos) e mini-player no painel de detalhes. A home ganhou entrada dedicada para vídeos e o dashboard do bot deixou de usar fallback mockado.

---

## Mudanças Principais

### 1. Processamento e CRUD de vídeos do YouTube (backend + frontend)

- Backend:
	- `POST /videos/processar` processa URL do YouTube, coleta metadados/transcrição e salva no Supabase.
	- `GET /videos`, `GET /videos/:id`, `PUT /videos/:id`, `DELETE /videos/:id` para listagem, detalhe, edição e exclusão.
- Frontend (`js/api.js`):
	- Métodos `processarVideo`, `listarVideos`, `obterVideo`, `atualizarVideo`, `deletarVideo`.
	- Dados mockados de vídeos quando `MOCK_MODE` está ativo.

---

### 2. Consulta com filtro de tipo e mini-player

- `pages/consulta.js` adiciona seletor de tipo (Artigos/Vídeos) e filtros de status por tipo.
- Lista de vídeos com menu contextual (editar, alterar status, excluir).
- Painel de detalhes com preview do YouTube via embed (mini-player).
- `css/styles.css` inclui estilo responsivo para `.video-embed`.

---

### 3. Entrada de vídeo na home e ajustes visuais

- `pages/home.js` inclui botão "Vídeo" e modal de URL do YouTube.
- Ao confirmar, chama `api.processarVideo`, exibe feedback e redireciona para a consulta.

---

### 4. Remoção do fallback de dashboard mockado

- O dashboard da gestão do bot passa a depender apenas dos dados reais da API, sem fallback para mock quando não há registros.

---

## Arquivos envolvidos

- `backend/src/controllers/artigos.controller.js`
- `backend/src/routes/index.js`
- `backend/src/views/js/api.js`
- `backend/src/views/pages/home.js`
- `backend/src/views/pages/consulta.js`
- `backend/src/views/css/styles.css`
