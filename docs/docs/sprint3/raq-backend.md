---
sidebar_position: 6
title: RAQ do Bot
description: Implementacao do RAQ/RAG para o bot consultar o banco e gerar respostas com OpenAI
---

# RAQ do Bot

Foi implementado um fluxo de RAQ/RAG no backend Node para que o bot responda perguntas usando dados salvos no Supabase antes de chamar a OpenAI.

## Fluxo

```text
Pergunta do produtor
       |
       v
POST /api/v1/bot/raq
       |
       v
raq.service.js busca artigos publicados no Supabase
       |
       v
ranking por titulo, resumo, conteudo, categorias, insumos e metadados
       |
       v
openai.service.js gera resposta usando somente o contexto recuperado
       |
       v
resposta + fontes usadas
```

## Arquivos

```text
backend/src/controllers/bot.controller.js   # entrada HTTP do bot
backend/src/services/raq.service.js         # busca, ranking e montagem do contexto
backend/src/services/openai.service.js      # chamada para a OpenAI Responses API
backend/src/routes/index.js                 # rotas /bot/raq e /bot/contexto
```

## Endpoints

### Gerar resposta com RAQ

```http
POST /api/v1/bot/raq
Content-Type: application/json

{
  "pergunta": "como usar bokashi em hortalicas?",
  "limit": 5
}
```

Retorna:

- `resposta`: texto final para o produtor;
- `modo`: `openai`, `fallback_sem_openai_key` ou `sem_contexto`;
- `fontes`: artigos usados como base;
- `contexto_usado`: ids, titulos e scores dos artigos recuperados.

### Validar contexto sem gerar resposta

```http
POST /api/v1/bot/contexto
Content-Type: application/json

{
  "pergunta": "biofertilizante para milho",
  "limit": 3
}
```

Esse endpoint ajuda a testar se o RAQ esta puxando as fontes certas do banco antes de envolver a OpenAI.

## Variaveis de ambiente

```env
OPENAI_API_KEY=<sua_chave>
OPENAI_MODEL=gpt-5.4
OPENAI_MAX_OUTPUT_TOKENS=900
```

Se `OPENAI_API_KEY` nao estiver configurada, o backend continua retornando os artigos recuperados em modo fallback, o que facilita testes locais.
