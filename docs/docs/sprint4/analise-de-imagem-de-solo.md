# Análise de Imagem de Solo

Na Sprint 4, o bot passou a aceitar tanto **PDF** quanto **imagem** como formatos de laudo de solo. O usuário pode fotografar o laudo impresso ou enviar um arquivo de imagem diretamente pelo WhatsApp, e o bot analisa o conteúdo visualmente usando a API de visão da OpenAI.

---

## Fluxo no WhatsApp

```text
Usuário seleciona "Enviar meu Laudo de Solo (PDF ou imagem)"
        |
        v
Bot exibe instruções de envio
        |
        v
Usuário envia PDF ou imagem
        |
        v
Bot detecta o tipo de arquivo (isDocument ou isImage)
        |
        v
Download do arquivo via baixarMidia()
        |
        v
Conversão para base64
        |
        v
RAG busca os 3 artigos mais relevantes para "recomendações para laudo de solo"
        |
        v
gerarRespostaComImagem() envia imagem + contexto para OpenAI (Vision API)
        |
        v
Bot retorna análise com diagnóstico e recomendações regenerativas
```

---

## Mensagem exibida ao usuário antes do envio

Quando o usuário solicita a análise, o bot responde com:

```
✅ Formato: PDF ou foto/imagem
✅ Tamanho máximo: 10 MB
✅ Deve ser laudo de análise de solo (laboratório)
```

---

## Arquivos principais

```text
backend/src/controllers/bot.controller.js    # detecção do tipo de arquivo, download, chamada ao serviço de visão
backend/src/services/openai.service.js       # gerarRespostaComImagem, montarPromptLaudoSolo
backend/src/services/rag.service.js          # obterContextoArtigos (contexto científico enviado junto com a imagem)
```

---

## Detecção do tipo de arquivo (`bot.controller.js`)

O bot identifica o formato enviado pelo usuário a partir da estrutura da mensagem recebida:

| Condição na mensagem | Tipo detectado |
|----------------------|----------------|
| `mensagemData?.documentMessage` | PDF |
| `mensagemData?.imageMessage`    | Imagem         |

Para PDFs, o fluxo já existia desde a sprint anterior. Para imagens, o estado `MENUS.AGUARDANDO_PDF` passou a também aceitar o handler `isImage`, que:

1. Faz o download do buffer via `baixarMidia()`
2. Obtém o MIME type da mensagem (padrão: `image/jpeg`)
3. Converte o buffer para base64
4. Envia uma mensagem de confirmação ao usuário: _"Recebi a foto do laudo!"_
5. Chama `gerarRespostaComImagem()` com a imagem e o contexto científico

---

## Serviço de análise por visão (`openai.service.js`)

### `gerarRespostaComImagem()`

Função responsável por enviar a imagem à OpenAI e retornar a análise.

**Parâmetros:**

| Parâmetro           | Tipo   | Descrição                                              |
|---------------------|--------|--------------------------------------------------------|
| `pergunta`          | string | Pergunta padrão enviada junto com a imagem             |
| `imagemBase64`      | string | Imagem codificada em base64                            |
| `mimeType`          | string | Tipo da imagem (ex: `image/jpeg`, `image/png`)         |
| `contextoCientifico`| string | Contexto de artigos recuperados pelo RAG (opcional)    |

**Resposta:**

```javascript
{
  texto: string,   // análise gerada pela IA
  modelo: string,  // ID do modelo usado
  modo: "openai_vision" | "erro_modelo_sem_visao" | "fallback_sem_openai_key"
}
```

O campo `modo` indica o estado da resposta:

| Valor                      | Significado                                                     |
|----------------------------|-----------------------------------------------------------------|
| `openai_vision`            | Análise concluída com sucesso                                   |
| `erro_modelo_sem_visao`    | O modelo configurado não suporta visão; o bot orienta enviar PDF |
| `fallback_sem_openai_key`  | `OPENAI_API_KEY` não configurada no ambiente                    |

---

## Prompt de análise (`montarPromptLaudoSolo()`)

A OpenAI recebe um prompt de sistema que define o papel e o formato esperado da resposta:

- **Papel:** engenheiro agrônomo especialista em agricultura regenerativa
- **Formato obrigatório da resposta:**
  ```
  Diagnóstico:
  - Resumo em até 2 linhas da situação do solo

  O que fazer agora:
  - Ações práticas diretas em bullet points
  - Usar insumos e técnicas da base de conhecimento
  ```
- **Restrições:**
  - Sem markdown, asteriscos ou formatação especial
  - Linguagem acessível, sem excesso de termos técnicos
  - Foco em soluções regenerativas e de baixo custo

---

## Integração com o RAG

Antes de chamar a API de visão, o bot busca os 3 artigos mais relevantes para a pergunta _"recomendações para laudo de solo"_ via `obterContextoArtigos()`. Esse contexto científico é incluído no prompt enviado à OpenAI, garantindo que as recomendações estejam embasadas na base de conhecimento cadastrada.

---

## Observações

- O formato PDF e o formato imagem utilizam o mesmo estado do bot (`MENUS.AGUARDANDO_PDF`) e seguem fluxos paralelos dentro do mesmo handler.
- Formatos aceitos para imagem: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- Tamanho máximo aceito: 10 MB.
- Se o modelo configurado em `OPENAI_MODEL` não suportar visão, o bot orienta o usuário a enviar o laudo em PDF como alternativa.
