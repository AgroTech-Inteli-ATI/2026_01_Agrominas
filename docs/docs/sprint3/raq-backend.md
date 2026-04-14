---
sidebar_position: 6
title: RAQ do Bot
description: Implementacao do RAQ/RAG para o bot consultar o banco e gerar respostas com OpenAI
---

# RAQ do Bot

O RAQ/RAG do bot permite responder perguntas do produtor usando os artigos publicados no banco Supabase como base de conhecimento antes de chamar a OpenAI.

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

## Arquivos principais

```text
backend/src/controllers/bot.controller.js   # entrada HTTP do bot
backend/src/services/raq.service.js         # busca, ranking e montagem do contexto
backend/src/services/openai.service.js      # chamada para a OpenAI Responses API
backend/src/routes/index.js                 # rotas /bot/raq e /bot/contexto
```

## O que precisa instalar

Para rodar o backend localmente, e necessario ter:

- Node.js instalado;
- npm instalado junto com o Node;
- dependencias do backend instaladas;
- variaveis de ambiente configuradas no arquivo `backend/.env`.

Dentro da pasta `backend`, instale as dependencias com:

```powershell
cd C:\Users\Inteli\Documents\2026_01_Agrominas\backend
npm.cmd ci
```

No Windows, recomenda-se usar `npm.cmd` no PowerShell para evitar bloqueios de politica de execucao.

## Variaveis de ambiente

O arquivo `backend/.env` precisa conter, no minimo:

```env
SUPABASE_URL=<url-do-projeto-supabase>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OPENAI_API_KEY=<sua-chave-openai>
OPENAI_MODEL=gpt-5.4
OPENAI_MAX_OUTPUT_TOKENS=900
PORT=3000
```

Se `OPENAI_API_KEY` nao estiver configurada, o endpoint ainda consegue recuperar artigos do banco, mas retorna em modo fallback sem gerar a resposta final pela OpenAI.

## Como rodar para testar

Para validar as respostas, e necessario usar **dois terminais do Git Bash** ao mesmo tempo:

- **Terminal 1:** sobe o backend e deve permanecer aberto durante todo o teste;
- **Terminal 2:** envia as requisicoes para validar o RAQ/RAG no banco e a resposta da OpenAI.

Nao feche o Terminal 1 enquanto estiver testando. O comando `npm.cmd run dev` deixa o servidor em execucao continua, entao esse terminal fica ocupado aguardando novas requisicoes.

### Terminal 1: subir o servidor no Git Bash

No primeiro terminal do Git Bash, rode o backend e deixe o processo aberto:

```bash
cd /c/Users/Inteli/Documents/2026_01_Agrominas/backend
npm.cmd run dev
```

O servidor deve exibir algo parecido com:

```text
Conexao com Supabase OK
Servidor rodando em http://localhost:3000/api/v1
POST   /api/v1/bot/raq
POST   /api/v1/bot/contexto
```

Esse terminal precisa continuar rodando. Se ele for fechado, os testes no outro terminal nao vao funcionar.

### Terminal 2: validar a API em outro Git Bash

Abra um segundo terminal do Git Bash sem fechar o primeiro. E nele que os comandos de teste devem ser executados.

No segundo terminal, primeiro teste se o servidor esta ativo:

```bash
curl "http://localhost:3000/api/v1/health"
```

Resultado esperado:

```json
{
  "status": "ok",
  "timestamp": "...",
  "version": "1.0.0"
}
```

## Testar somente o contexto recuperado

Antes de chamar a OpenAI, e util validar quais artigos o RAQ esta puxando do banco:

```powershell
$body = @{
  pergunta = "agricultura tropical regenerativa"
  limit = 3
} | ConvertTo-Json

$res = Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/bot/contexto" `
  -ContentType "application/json" `
  -Body $body

$res | ConvertTo-Json -Depth 10
```

Esse endpoint retorna os artigos encontrados, seus metadados e o `score` usado no ranking.

### Validar contexto pelo Git Bash

Com o servidor rodando no primeiro terminal, abra outro terminal no Git Bash e execute:

```bash
curl -X POST "http://localhost:3000/api/v1/bot/contexto" \
  -H "Content-Type: application/json" \
  -d '{"pergunta":"agricultura tropical regenerativa","limit":3}'
```

O corpo enviado no `-d` deve ser um JSON valido e terminar em `}`. Nao adicione `]` no final.

Para facilitar a leitura, se o `jq` estiver instalado:

```bash
curl -s -X POST "http://localhost:3000/api/v1/bot/contexto" \
  -H "Content-Type: application/json" \
  -d '{"pergunta":"agricultura tropical regenerativa","limit":3}' | jq
```

## Testar resposta final com OpenAI

Depois de validar o contexto, teste o endpoint completo:

```powershell
$body = @{
  pergunta = "como usar biofertilizante no milho?"
  limit = 3
} | ConvertTo-Json

$res = Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/bot/raq" `
  -ContentType "application/json" `
  -Body $body

$res | ConvertTo-Json -Depth 10
```

Resultado esperado:

```json
{
  "pergunta": "como usar biofertilizante no milho?",
  "resposta": "...",
  "modo": "openai",
  "modelo": "gpt-5.4",
  "fontes": [],
  "contexto_usado": [],
  "timestamp": "..."
}
```

O campo `modo` indica o estado da resposta:

- `openai`: o backend recuperou contexto e chamou a OpenAI;
- `fallback_sem_openai_key`: o backend recuperou contexto, mas nao encontrou `OPENAI_API_KEY`;
- `sem_contexto`: a rota funcionou, mas nao encontrou artigos relevantes no banco.

### Validar resposta pelo Git Bash

Com o servidor ainda rodando em outro terminal, execute no Git Bash:

```bash
curl -X POST "http://localhost:3000/api/v1/bot/raq" \
  -H "Content-Type: application/json" \
  -d '{"pergunta":"como usar biofertilizante no milho?","limit":3}'
```

Assim como no teste de contexto, o JSON enviado no `-d` deve terminar apenas com `}`.

Versao formatada com `jq`:

```bash
curl -s -X POST "http://localhost:3000/api/v1/bot/raq" \
  -H "Content-Type: application/json" \
  -d '{"pergunta":"como usar biofertilizante no milho?","limit":3}' | jq
```

Tambem e possivel testar o webhook do bot:

```bash
curl -X POST "http://localhost:3000/api/v1/bot/webhook" \
  -H "Content-Type: application/json" \
  -d '{"mensagem":"o que e agricultura tropical regenerativa?","telefone":"5511999999999","plataforma":"mock"}'
```

## Observacoes de teste

Use `Invoke-RestMethod` no PowerShell em vez de `curl`, porque o `curl.exe` pode quebrar o JSON se as aspas nao forem escapadas corretamente.

No Git Bash, o `curl` funciona melhor com JSON porque as aspas simples preservam o corpo da requisicao sem exigir escape adicional.

Se aparecer o erro `Unexpected non-whitespace character after JSON`, verifique se o corpo enviado no `-d` nao ficou com algum caractere sobrando depois do JSON, por exemplo `]` no final:

```text
{"pergunta":"agricultura tropical regenerativa","limit":3}]
```

O correto e:

```text
{"pergunta":"agricultura tropical regenerativa","limit":3}
```

Se a resposta disser que nao ha informacao suficiente na base, isso nao significa erro no RAQ. Significa que os artigos recuperados nao trazem dados tecnicos suficientes para responder aquela pergunta sem inventar informacao.
