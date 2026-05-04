# Vídeos como Referências

Na Sprint 4, o sistema passou a incluir vídeos do YouTube como fontes nas respostas do bot. Quando o bot responde uma pergunta, ele pode citar vídeos relevantes cadastrados no banco, exibindo o título e o link direto para o conteúdo.

---

## Banco de Dados

Foi criada a tabela `videos` para armazenar os vídeos cadastrados.

```sql
CREATE TABLE videos (
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
```

| Campo         | Descrição                                                         |
|---------------|-------------------------------------------------------------------|
| `titulo`      | Título do vídeo obtido via YouTube oEmbed API                     |
| `url_youtube` | URL completa do vídeo no YouTube                                  |
| `youtube_id`  | ID extraído da URL (usado para embed e para a oEmbed API)         |
| `canal`       | Nome do canal responsável pelo vídeo                              |
| `transcricao` | Transcrição automática obtida via `youtube-transcript`            |
| `resumo`      | Resumo gerado pela OpenAI a partir da transcrição                 |
| `status`      | `publicado` (disponível ao RAG) ou `arquivado` (ignorado pelo RAG) |

A migration correspondente está em `backend/src/database/migrations/004_videos.sql`.

---

## Fluxo de processamento de um vídeo

```text
Admin insere URL do YouTube no painel
        |
        v
POST /api/v1/videos/processar
        |
        v
Extrai youtube_id da URL
        |
        v
oEmbed API → título e nome do canal
        |
        v
youtube-transcript → transcrição em português (fallback: inglês)
        |
        v
OpenAI → resumo técnico da transcrição (máx. 1200 tokens)
        |
        v
Salva na tabela videos com status 'publicado'
```

---

## Arquivos principais

```text
backend/src/database/migrations/004_videos.sql         # criação da tabela
backend/src/controllers/artigos.controller.js          # processarVideo, listarVideos, obterVideo, atualizarVideo, deletarVideo
backend/src/services/rag.service.js                    # buscarCandidatosVideos, ranquearVideos, montarContextoVideo, formatarFonteVideo
backend/src/services/openai.service.js                 # resumirTranscricao
backend/src/routes/index.js                            # rotas /videos
backend/src/views/pages/home.js                        # modal de cadastro de vídeo no painel admin
backend/src/views/pages/consulta.js                    # listagem e painel de detalhes dos vídeos
backend/src/views/js/api.js                            # métodos processarVideo, listarVideos, obterVideo, atualizarVideo, deletarVideo
```

---

## Endpoints

| Operação              | Método   | Endpoint                     | Autenticação |
|-----------------------|----------|------------------------------|--------------|
| Processar vídeo       | `POST`   | `/api/v1/videos/processar`   | JWT          |
| Listar vídeos         | `GET`    | `/api/v1/videos`             | JWT          |
| Obter vídeo por ID    | `GET`    | `/api/v1/videos/:id`         | JWT          |
| Atualizar vídeo       | `PUT`    | `/api/v1/videos/:id`         | JWT          |
| Excluir vídeo         | `DELETE` | `/api/v1/videos/:id`         | JWT          |

### POST `/api/v1/videos/processar`

Recebe a URL de um vídeo do YouTube, extrai os metadados, obtém a transcrição e gera um resumo via OpenAI.

**Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX"
}
```

**Resposta de sucesso:**
```json
{
  "id": "uuid",
  "titulo": "Título do vídeo",
  "url_youtube": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  "youtube_id": "XXXXXXXXXXX",
  "canal": "Nome do canal",
  "resumo": "Resumo gerado pela IA...",
  "status": "publicado"
}
```

---

## Integração com o RAG

O serviço `rag.service.js` consulta a tabela `videos` junto com a tabela `artigos` para montar o contexto enviado à OpenAI.

### Busca e ranking

- Busca até 50 vídeos com `status = 'publicado'` via `buscarCandidatosVideos()`.
- Ranqueia por correspondência entre a pergunta do usuário e os campos `titulo` e `resumo` do vídeo, com pontuação máxima de 12 pontos para correspondência exata.
- Vídeos e artigos concorrem na mesma lista ranqueada; os mais relevantes compõem o contexto enviado à OpenAI.

### Formato do contexto enviado à OpenAI

```
Fonte N (Vídeo)
ID: {video_id}
Título: {titulo}
Canal: {canal}
Resumo: {resumo (máx. 1600 caracteres)}
Link: {url_youtube}
```

### Formato da fonte retornada ao usuário (WhatsApp)

```
🎬 *Título do vídeo*
   https://www.youtube.com/watch?v=XXXXXXXXXXX
```

---

## Painel Administrativo

### Cadastrar vídeo (home.js)

Na página inicial do painel, o botão **"Vídeo"** abre um modal onde o admin cola a URL do YouTube. Ao confirmar, o sistema chama `api.processarVideo(url)`, que dispara o endpoint de processamento e salva o vídeo no banco.

### Consultar e gerenciar vídeos (consulta.js)

A página de consulta exibe duas abas: **Artigos** e **Vídeos**.

Na aba de vídeos:

- Lista com título, canal e badge de status (`publicado` / `arquivado`)
- Painel de detalhes com:
  - Metadados (canal, data de cadastro)
  - Botão de acesso ao link do YouTube
  - Player embed do YouTube incorporado na página
  - Ações de editar e excluir

---

## Observações

- A transcrição é tentada primeiro em português (`pt`). Se não estiver disponível, o sistema tenta em inglês (`en`).
- O resumo gerado pela OpenAI foca em práticas agrícolas, insumos, culturas, tipos de solo e recomendações regenerativas.
- Vídeos com `status = 'arquivado'` não são recuperados pelo RAG e não aparecem como fontes nas respostas.
