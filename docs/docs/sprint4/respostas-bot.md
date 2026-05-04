---
sidebar_position: 1
title: Transcricao de Audio no WhatsApp
description: Documentacao da implementacao de mensagens de audio no bot WhatsApp da Agrominas
---

# Transcricao de Audio no Bot WhatsApp

Esta documentacao descreve como foi implementado o recebimento de audio no bot do WhatsApp, desde a chegada da mensagem pela Evolution API ate a transcricao com OpenAI e o reaproveitamento do texto dentro do fluxo conversacional existente.

## Objetivo

O objetivo da funcionalidade e permitir que o produtor rural envie duvidas por audio no WhatsApp. O backend baixa a midia, transcreve o conteudo para texto e passa essa transcricao para o mesmo fluxo que ja responde perguntas digitadas.

Com isso, o bot nao precisa ter uma logica separada para audio depois da transcricao. O audio vira texto e segue pela maquina de estados, podendo acionar o RAG, menus, fontes e respostas do WhatsApp.

## O que foi implementado

- Deteccao de mensagens com `audioMessage` no webhook do WhatsApp.
- Download do arquivo de audio pela Evolution API.
- Conversao do audio recebido em `Buffer`.
- Envio do audio para a API de transcricao da OpenAI.
- Uso do modelo `whisper-1` para gerar texto em portugues.
- Substituicao da mensagem original pela transcricao.
- Encaminhamento da transcricao para o estado `PERGUNTA_ABERTA`.
- Registro da transcricao no historico do bot como `audio_transcription`.
- Mensagens de feedback para o usuario durante sucesso ou erro.

Nao foi criada uma rota exclusiva para audio. Tudo entra pelo endpoint publico do bot:

```text
POST /api/v1/bot/webhook
```

## Fluxo geral

```text
Usuario envia audio no WhatsApp
        |
        v
Evolution API recebe a mensagem
        |
        v
Evolution API chama POST /api/v1/bot/webhook
        |
        v
bot.controller.js detecta payload.data.message.audioMessage
        |
        v
whatsapp.service.js baixa a midia em base64 e converte para Buffer
        |
        v
openai.service.js envia o audio para /v1/audio/transcriptions
        |
        v
Texto transcrito substitui a mensagem original
        |
        v
Maquina de estados trata o texto como pergunta aberta
        |
        v
RAG gera resposta e o bot envia pelo WhatsApp
```

## Arquivos envolvidos

```text
backend/src/controllers/bot.controller.js       # detecta audio e integra a transcricao ao fluxo do bot
backend/src/services/whatsapp.service.js        # baixa a midia da Evolution API
backend/src/services/openai.service.js          # transcreve o audio usando OpenAI Whisper
backend/src/services/bot-history.service.js     # registra mensagens e transcricoes no Supabase
backend/src/routes/index.js                     # expoe o webhook /bot/webhook
backend/src/database/migrations/004_bot_whatsapp_historico.sql # tabelas de historico do bot
```

## Detalhamento por arquivo

### `backend/src/routes/index.js`

Define a rota publica do webhook:

```js
router.post('/bot/webhook', botCtrl.receberMensagem);
```

A Evolution API envia os eventos de mensagem para essa rota. O audio nao tem uma rota propria porque chega dentro do mesmo payload das mensagens do WhatsApp.

### `backend/src/controllers/bot.controller.js`

Este e o ponto principal da implementacao. A funcao `receberMensagem` faz o tratamento completo da mensagem recebida.

Antes de processar audio, o controller executa algumas protecoes gerais:

- deduplica mensagens pelo `msgId` usando o `Set` `processados`;
- ignora mensagens enviadas pelo proprio bot (`fromMe`);
- ignora grupos (`@g.us`);
- ignora broadcast e newsletter;
- responde `200 OK` rapidamente para a Evolution API nao reenviar por timeout;
- registra a mensagem de entrada no historico do bot.

A deteccao de audio acontece verificando:

```js
const isAudio = !!(mensagemData?.audioMessage);
const audioMessage = mensagemData?.audioMessage;
```

Quando existe audio, o bot:

1. Envia uma mensagem curta avisando que recebeu o audio e esta transcrevendo.
2. Chama `baixarMidia(payload.data)` para obter o arquivo da Evolution API.
3. Le o `mimetype` do audio recebido.
4. Chama `transcreverAudio(audioBuffer, mimeType)`.
5. Se a transcricao estiver vazia, pede para o usuario digitar a duvida.
6. Se a transcricao tiver texto, substitui `mensagemOriginal` pelo texto transcrito.
7. Atualiza `textoLimpo` com a versao normalizada da transcricao.
8. Marca `mensagemVeioDeAudio = true`.
9. Registra a transcricao no historico com o tipo `audio_transcription`.

Depois disso, a mensagem passa a ser tratada como texto normal.

Se o audio for uma pergunta livre, o controller direciona a conversa para:

```text
MENUS.PERGUNTA_ABERTA
```

Esse estado chama `responderPerguntaAberta`, que usa `responderRAG(pergunta)` para buscar contexto na base da Agrominas e gerar a resposta final.

### `backend/src/services/whatsapp.service.js`

Este arquivo concentra a comunicacao com a Evolution API.

Para audio, a funcao importante e:

```js
export async function baixarMidia(message)
```

Ela chama o endpoint da Evolution:

```text
/chat/getBase64FromMediaMessage/{INSTANCE_NAME}
```

O corpo enviado possui a mensagem original recebida no webhook:

```json
{
  "message": "<payload da mensagem>"
}
```

A Evolution API retorna a midia em `base64`. O backend converte esse conteudo para `Buffer`:

```js
Buffer.from(data.base64, 'base64')
```

Esse mesmo helper tambem e usado em outros fluxos de midia, como PDF e imagem. No caso do audio, o `Buffer` resultante e enviado para a transcricao.

### `backend/src/services/openai.service.js`

A funcao responsavel pela transcricao e:

```js
export async function transcreverAudio(audioBuffer, mimeType = 'audio/ogg')
```

Ela depende de `OPENAI_API_KEY`. Se a chave nao estiver configurada, a funcao dispara erro e o controller responde ao usuario pedindo para digitar a pergunta.

O codigo identifica a extensao do arquivo a partir do `mimeType`:

```text
audio/ogg  -> audio.ogg
audio/mp4  -> audio.mp4
audio/webm -> audio.webm
audio/wav  -> audio.wav
fallback   -> audio.ogg
```

Depois monta um `FormData` com:

- `file`: o audio convertido para `Blob`;
- `model`: `whisper-1`;
- `language`: `pt`.

A chamada e feita diretamente com `fetch`:

```text
POST https://api.openai.com/v1/audio/transcriptions
```

O header enviado inclui apenas a autorizacao:

```text
Authorization: Bearer <OPENAI_API_KEY>
```

O `Content-Type` nao e definido manualmente porque o `fetch` precisa preencher o boundary do `multipart/form-data` automaticamente.

O retorno esperado da OpenAI possui o campo `text`. A funcao devolve:

```js
data.text?.trim() || ''
```

### `backend/src/services/bot-history.service.js`

O historico do bot registra tanto a mensagem original quanto a transcricao.

Quando o audio chega, a mensagem de entrada e registrada com o tipo vindo da Evolution API. Depois da transcricao, o backend registra uma nova entrada:

```text
tipo: audio_transcription
texto: texto transcrito
payload: { originalMessageId: msgId }
```

Isso facilita auditoria e debug, porque permite rastrear qual mensagem de audio originou cada texto transcrito.

O historico pode ser desativado com:

```env
BOT_HISTORY_ENABLED=false
```

Quando ativo, ele usa as tabelas criadas pela migration `004_bot_whatsapp_historico.sql`.

### `backend/src/database/migrations/004_bot_whatsapp_historico.sql`

Cria as tabelas:

```text
bot_contatos_whatsapp
bot_mensagens_whatsapp
```

A tabela `bot_mensagens_whatsapp` guarda:

- `remote_jid`: identificador do contato no WhatsApp;
- `message_id`: ID da mensagem original;
- `direcao`: entrada ou saida;
- `tipo`: texto, audio, transcricao, etc.;
- `texto`: conteudo textual registrado;
- `payload`: dados extras, como o `originalMessageId`;
- `evento_timestamp`: horario informado pelo evento recebido.

## Como o audio entra no fluxo conversacional

A transcricao e incorporada ao fluxo sem criar um estado novo.

Quando o usuario envia audio, o controller faz:

```text
audio -> transcricao -> mensagemOriginal -> textoLimpo -> maquina de estados
```

Se o texto transcrito tiver pelo menos 3 caracteres e nao for apenas numero, ele e considerado pergunta livre por `isPerguntaLivre`.

Quando isso acontece, o bot define:

```text
sessao.estado = MENUS.PERGUNTA_ABERTA
```

No estado `PERGUNTA_ABERTA`, o bot:

1. chama `responderPerguntaAberta`;
2. executa `responderRAG`;
3. busca contexto no Supabase;
4. chama a OpenAI para gerar a resposta;
5. salva as fontes na sessao;
6. envia a resposta com as opcoes `Ver fontes` e `Voltar ao Menu Principal`.

Se a transcricao for algo como uma opcao numerica, o texto pode continuar sendo interpretado pela maquina de estados como uma resposta de menu.

## Perguntas abertas e opcoes setadas pelo bot

Depois da transcricao, o bot trabalha com dois tipos principais de entrada:

- **Perguntas abertas**: frases livres do produtor, como "como melhorar solo compactado?".
- **Opcoes setadas**: numeros ou comandos que ja existem nos menus do bot, como `1`, `2`, `9`, `0`, `menu` e `voltar`.

Essa separacao e importante porque o audio nao muda a regra de negocio do bot. Ele apenas transforma fala em texto. A partir dai, o texto transcrito passa pelas mesmas validacoes usadas nas mensagens digitadas.

### Perguntas abertas

Uma mensagem e considerada pergunta aberta quando o texto tem pelo menos 3 caracteres e nao e composto apenas por numeros. Essa regra fica na funcao `isPerguntaLivre`.

No caso de audio, quando a transcricao gera uma pergunta livre, o controller define:

```text
sessao.estado = MENUS.PERGUNTA_ABERTA
```

Isso significa que audios como estes entram diretamente no fluxo aberto:

```text
"qual biofertilizante posso usar no milho?"
"como melhorar solo compactado?"
"o que fazer quando o ph esta baixo?"
"meu solo esta fraco, o que posso aplicar?"
```

O fluxo de resposta da pergunta aberta e:

```text
texto transcrito
       |
       v
responderPerguntaAberta(pergunta, sessao)
       |
       v
responderRAG(pergunta)
       |
       v
resposta com base nos conteudos da Agrominas
       |
       v
opcoes 9 Ver fontes e 0 Voltar ao Menu Principal
```

Quando o RAG encontra contexto, a resposta enviada ao WhatsApp segue este formato geral:

```text
Pergunta aberta

Sua duvida: <texto transcrito>

<resposta gerada com RAG>

9 Ver fontes
0 Voltar ao Menu Principal
```

Quando o RAG nao encontra contexto suficiente, o bot responde que ainda nao encontrou uma resposta segura na base da Agrominas e pede para o usuario reformular usando nome de insumo, cultura ou pratica agricola.

Perguntas abertas podem acontecer em quatro situacoes:

- o usuario escolhe `4` no menu principal;
- o usuario envia uma frase livre no menu principal;
- o usuario envia uma nova pergunta depois de visualizar fontes;
- o usuario envia um audio cuja transcricao vira uma frase livre.

### Opcoes globais

Algumas respostas funcionam em varios estados do bot:

| Entrada | Acao do bot |
| --- | --- |
| `menu` | volta para o menu principal |
| `inicio` | volta para o menu principal |
| `voltar` | volta para o menu principal |
| `9` | mostra as fontes da ultima resposta, quando existirem |
| `0` | geralmente volta para o menu principal ou para o estado anterior esperado |

No caso do audio, essas opcoes so funcionam bem quando a transcricao resulta exatamente nesses textos ou numeros. Por exemplo, se o produtor falar "nove" e a transcricao vier como `nove`, o codigo atual nao trata isso como `9`.

### Menu principal

O menu principal concentra as primeiras opcoes do atendimento:

| Entrada | Resposta/estado gerado |
| --- | --- |
| `1` | abre o submenu de insumos regenerativos |
| `2` | abre o submenu de cultura ou tipo de plantio |
| `3` | abre o submenu de solo e laudo |
| `4` | abre o modo de pergunta aberta |
| `5` | encerra o atendimento |
| texto livre | trata como pergunta aberta e chama o RAG |
| opcao invalida | repete o menu; apos falhas repetidas, sugere tentar novamente ou falar com especialista |

Se um audio for transcrito como uma frase livre no menu principal, ele nao precisa passar pela opcao `4`: o bot ja encaminha para pergunta aberta automaticamente.

### Insumos regenerativos

No estado `INSUMOS`, o bot trabalha com opcoes predefinidas:

| Entrada | Tema usado na resposta |
| --- | --- |
| `1` | Biofertilizantes |
| `2` | Compostos Organicos |
| `3` | Inoculantes Biologicos |
| `4` | Calcario e Corretivos de Solo |
| `5` | Silicatos e Rochagem |
| `6` | abre busca livre por nome de insumo |
| `0` | volta ao menu principal |

Nas opcoes `1` a `5`, o bot chama `responderRAG` com o tema selecionado. A resposta final inclui:

```text
<tema selecionado>

<resposta gerada com RAG>

9 Ver fontes
0 Voltar ao Menu Principal
```

Na busca livre de insumos (`INSUMOS_BUSCA`), o usuario pode digitar o nome de um insumo especifico. Se houver contexto, o bot responde com RAG e salva as fontes. Se nao houver contexto, informa que ainda nao encontrou o insumo e oferece:

```text
1 Tentar buscar por outro nome
2 Ver a lista de insumos disponiveis
0 Voltar ao Menu Principal
```

Como o audio livre e direcionado para `PERGUNTA_ABERTA`, a busca livre de insumo funciona de forma mais previsivel quando o nome do insumo e digitado em texto.

### Cultura ou tipo de plantio

No estado `CULTURA`, o bot possui culturas predefinidas:

| Entrada | Tema usado na resposta |
| --- | --- |
| `1` | insumos regenerativos para Soja |
| `2` | insumos regenerativos para Milho |
| `3` | insumos regenerativos para Cafe |
| `4` | insumos regenerativos para Cana-de-acucar |
| `5` | insumos regenerativos para Hortalicas |
| `6` | insumos regenerativos para Pastagem |
| `7` | abre busca livre por outra cultura |
| `0` | volta ao menu principal |

Nas opcoes `1` a `6`, o bot consulta o RAG usando a cultura escolhida e responde com:

```text
Insumos Regenerativos para <cultura>

<resposta gerada com RAG>

9 Ver fontes
0 Voltar ao Menu Principal
```

Na busca livre de cultura (`CULTURA_BUSCA`), o usuario pode informar uma cultura fora da lista. Se o RAG encontrar contexto, o bot responde com recomendacoes para a cultura. Se nao encontrar, oferece:

```text
1 Buscar por outra cultura
2 Consultar insumos regenerativos gerais
0 Voltar ao Menu Principal
```

Assim como em insumos, uma cultura falada em audio como frase livre tende a ser encaminhada para `PERGUNTA_ABERTA`. Para usar as opcoes setadas por numero, a transcricao precisa resultar em `1`, `2`, `3` e assim por diante.

### Solo e laudo

No estado `SOLO`, o bot tem temas fixos:

| Entrada | Tema usado na resposta |
| --- | --- |
| `1` | interpretacao de analise de solo |
| `2` | ph e acidez do solo |
| `3` | compactacao do solo |
| `4` | materia organica e biologia do solo |
| `5` | erosao e conservacao do solo |
| `6` | inicia envio de laudo em PDF ou imagem |
| `0` | volta ao menu principal |

Nas opcoes `1` a `5`, o bot chama o RAG com o tema tecnico correspondente e retorna resposta com fontes:

```text
<resposta gerada com RAG>

9 Ver fontes
2 Consultar outro tema de solo
0 Voltar ao Menu Principal
```

Na opcao `6`, o estado muda para `AGUARDANDO_PDF`. Nesse estado, o bot espera um PDF ou uma imagem de laudo. As respostas possiveis sao:

| Entrada | Acao do bot |
| --- | --- |
| PDF valido | extrai texto, busca contexto cientifico e gera analise com IA |
| imagem | envia a imagem para analise com modelo de visao e contexto cientifico |
| `1` | pede para enviar outro laudo |
| `2` | volta ao submenu de solo |
| `0` | volta ao menu principal |
| texto sem arquivo | avisa que precisa receber o arquivo do laudo |

Observacao: depois de uma resposta de tema de solo, a mensagem apresenta `2 Consultar outro tema de solo`. No codigo atual, enquanto o estado continua como `SOLO`, o numero `2` tambem corresponde ao tema "ph e acidez do solo". Para evitar ambiguidade, `0` e o caminho mais claro para voltar ao menu principal.

### Ver fontes

Depois de respostas geradas com RAG, o bot normalmente oferece:

```text
9 Ver fontes
0 Voltar ao Menu Principal
```

Ao receber `9`, o bot lista os artigos ou videos usados na ultima resposta. Se nao houver fontes salvas na sessao, responde que nenhuma fonte especifica foi usada.

Depois de mostrar fontes, as entradas possiveis sao:

| Entrada | Acao do bot |
| --- | --- |
| `0` | volta ao menu principal |
| texto livre | inicia nova pergunta aberta |
| outro valor | volta ao menu principal |

### Como o audio se comporta nessas opcoes

O audio foi implementado principalmente para perguntas abertas. Por isso, a regra pratica e:

- se a transcricao virar uma frase livre, o bot trata como pergunta aberta;
- se a transcricao virar um numero como `1`, `2`, `3`, `9` ou `0`, o bot pode usar esse numero como opcao de menu;
- se a transcricao virar uma palavra como `um`, `dois` ou `nove`, o codigo atual nao converte automaticamente para `1`, `2` ou `9`;
- comandos como `menu`, `inicio` e `voltar` funcionam se forem transcritos exatamente assim.

Essa decisao simplifica a implementacao: audios com duvidas agronomicas entram no RAG, enquanto os menus continuam sendo mais confiaveis por texto ou toque no numero correspondente.

## Variaveis de ambiente

Para o audio funcionar no bot, as variaveis mais importantes sao:

```env
OPENAI_API_KEY=<sua-chave-openai>

EVOLUTION_URL=http://localhost:8081
EVOLUTION_API_KEY=<chave-da-evolution>
EVOLUTION_INSTANCE=agrominas
EVOLUTION_WEBHOOK_URL=http://backend:3000/api/v1/bot/webhook

BOT_HISTORY_ENABLED=true
BOT_ALLOWED_NUMBERS=
```

`OPENAI_API_KEY` e obrigatoria para transcrever audio. As variaveis da Evolution API sao necessarias para baixar a midia e enviar mensagens de resposta.

## Dependencias tecnicas

A implementacao nao usa SDK da OpenAI. Ela usa recursos nativos do Node.js:

- `fetch` para chamadas HTTP;
- `FormData` para `multipart/form-data`;
- `Blob` para encapsular o arquivo de audio;
- `Buffer` para lidar com a midia retornada pela Evolution API.

O backend tambem depende da Evolution API para transformar a midia recebida pelo WhatsApp em base64 antes do envio para a OpenAI.

## Tratamento de erros

### Audio sem transcricao util

Se a OpenAI retornar texto vazio, o bot responde:

```text
Nao consegui entender o audio. Pode digitar sua duvida?
```

O fluxo e interrompido para evitar que uma pergunta vazia chegue ao RAG.

### Erro ao baixar midia

Se a Evolution API nao retornar `base64`, `baixarMidia` dispara erro. O controller captura esse erro e avisa o usuario que houve problema no processamento do audio.

### Chave da OpenAI ausente

Se `OPENAI_API_KEY` nao estiver configurada, `transcreverAudio` dispara erro. O usuario recebe uma mensagem pedindo para digitar a pergunta.

### Erro da API de transcricao

Se a OpenAI retornar erro HTTP, a funcao usa a mensagem de erro retornada pela API ou a mensagem padrao:

```text
Erro ao transcrever audio.
```

O erro e capturado no controller, registrado no console e convertido em uma resposta amigavel no WhatsApp.

## Como testar

### Teste manual pelo WhatsApp

1. Subir o backend e a Evolution API.
2. Confirmar que a instancia `agrominas` esta conectada ao WhatsApp.
3. Confirmar que o webhook aponta para:

```text
http://backend:3000/api/v1/bot/webhook
```

4. Enviar um audio para o numero conectado.
5. Verificar se o bot responde avisando que recebeu o audio.
6. Aguardar a resposta final gerada a partir da transcricao.
7. Se a resposta usar RAG, testar tambem a opcao `9` para ver as fontes.

### Logs esperados

Quando a transcricao funciona, o backend registra algo parecido com:

```text
[BOT] Audio transcrito de <remoteJid>: "<texto transcrito>"
```

Se houver erro, o backend registra:

```text
[BOT] Erro ao processar audio:
```

### Validacao no banco

Com o historico ativo, a tabela `bot_mensagens_whatsapp` deve conter:

- uma entrada para a mensagem original recebida;
- uma entrada adicional com `tipo = audio_transcription`;
- o texto transcrito no campo `texto`;
- o ID original em `payload.originalMessageId`.

## Pontos de atencao

- O audio depende da Evolution API conseguir baixar a midia enviada pelo WhatsApp.
- O fluxo precisa de `OPENAI_API_KEY`; diferente do RAG textual, nao existe fallback util para transcricao sem OpenAI.
- O bot responde `200 OK` para a Evolution antes de terminar a transcricao, evitando reenvio do webhook por timeout.
- A transcricao e tratada como texto do usuario, entao pode acionar pergunta aberta, RAG ou opcoes de menu.
- Audios longos podem aumentar tempo de resposta e custo de transcricao.
- Se o audio tiver muito ruido, fala baixa ou multiplas pessoas, a transcricao pode ficar incompleta.
- O idioma enviado para a OpenAI esta fixado como `pt`, priorizando portugues.

## Resumo da implementacao

A implementacao de audio foi feita de forma integrada ao bot existente: o WhatsApp envia a mensagem para o webhook, o backend detecta `audioMessage`, baixa a midia pela Evolution API, transcreve com OpenAI Whisper e reutiliza o texto resultante no fluxo normal do bot. Assim, a funcionalidade aproveita o RAG, os menus, o historico e o envio de fontes sem duplicar a logica conversacional.
