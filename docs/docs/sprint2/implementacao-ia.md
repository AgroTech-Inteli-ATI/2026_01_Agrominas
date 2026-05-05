---
sidebar_position: 1
title: Implementação da IA
description: Documentação da implementação do módulo de Inteligência Artificial para análise de solo
---

# Implementação da Inteligência Artificial

## Visão Geral

O módulo de IA do projeto **Guia Regenerativo** é responsável por receber análises de solo enviadas pelo produtor (via imagem, PDF ou texto), extrair o conteúdo textual desses arquivos e gerar recomendações agrícolas personalizadas por meio da API da OpenAI.

O fluxo completo pode ser visualizado abaixo:

```
Produtor (WhatsApp)
       │
       ▼
  controller.py          ← recebe arquivo + pergunta do produtor
       │
       ▼
processar_analise.py     ← orquestra a extração e a análise
       │
  ┌────┴────┐
  │         │
  ▼         ▼
extrator   agente
_arquivo   _agronomico
  .py          .py
  │              │
  ▼              ▼
 OCR /      API OpenAI
 leitura    (GPT-5.4)
```

---

## Estrutura de Arquivos

Os arquivos da IA estão organizados dentro de `src/`:

```
src/
├── main.py                        # Ponto de entrada (simulação local)
├── ai/
│   ├── cliente_openai.py          # Instância e configuração do cliente OpenAI
│   ├── extrator_arquivo.py        # Extração de texto (TXT, imagem, PDF)
│   └── agente_agronomico.py       # Agente de análise e geração de resposta
├── service/
│   └── processar_analise.py       # Serviço orquestrador do fluxo
└── api/
    └── controller.py              # Ponto de entrada da API (WhatsApp)
```

---

## Módulos

### `cliente_openai.py`

Responsável por inicializar o cliente da OpenAI usando a chave de API armazenada em variável de ambiente.

- Carrega o `.env` com `python-dotenv`
- Expõe a instância `cliente` (objeto `OpenAI`) para uso nos demais módulos
- Expõe também a função utilitária `perguntar_ia(mensagens)` para chamadas avulsas

**Variável de ambiente necessária:**

```
OPENAI_API_KEY=<sua_chave>
```

---

### `extrator_arquivo.py`

Responsável por extrair texto de arquivos enviados pelo produtor. Suporta três formatos:

| Formato                   | Função interna         | Biblioteca usada            |
| ------------------------- | ---------------------- | --------------------------- |
| `.txt`                    | `extrair_texto_txt`    | I/O nativo Python           |
| `.png` / `.jpg` / `.jpeg` | `extrair_texto_imagem` | `Pillow` + `pytesseract`    |
| `.pdf`                    | `extrair_texto_pdf`    | `pdf2image` + `pytesseract` |

A função principal é `extrair_texto(caminho_arquivo)`, que detecta automaticamente o formato pelo sufixo do arquivo e chama a função correspondente.

**Dependência de sistema:** O Tesseract OCR deve estar instalado em `C:\Program Files\Tesseract-OCR\tesseract.exe` e o idioma português (`por`) deve estar disponível.

---

### `agente_agronomico.py`

Agente principal de análise. Recebe o texto extraído da análise de solo e a pergunta do produtor, monta um _prompt_ estruturado e envia para o modelo `gpt-5.4` via API da OpenAI.

**Estrutura do prompt enviado ao modelo:**

```
Você é um engenheiro agrônomo especialista em fertilidade do solo.

ANÁLISE DE SOLO:
<texto extraído do arquivo>

PERGUNTA DO PRODUTOR:
<pergunta enviada pelo produtor>

Responda de forma clara e prática contendo:
1. Diagnóstico do solo
2. Problemas encontrados
3. Correções recomendadas
4. Produtos indicados
5. Forma de aplicação
```

A resposta é retornada como texto puro (`response.output_text`).

---

### `processar_analise.py`

Serviço orquestrador que une os dois módulos anteriores em um único fluxo:

1. Chama `extrair_texto(caminho_arquivo)` para obter o conteúdo do arquivo
2. Passa o texto e a pergunta para `analisar_solo(texto, pergunta_produtor)`
3. Retorna a resposta final gerada pela IA

---

### `controller.py`

Ponto de entrada da API. Recebe os dados da integração com o WhatsApp (arquivo + mensagem do produtor) e delega o processamento para o serviço `processar_analise`.

```python
def receber_mensagem_whatsapp(dados):
    arquivo = dados["arquivo"]
    pergunta = dados["mensagem"]
    resposta = processar_analise(arquivo, pergunta)
    return {"resposta": resposta}
```

---

### `main.py`

Script de simulação local para testes sem a integração com o WhatsApp. Solicita a pergunta do produtor via terminal, usa um arquivo de imagem de teste (`assets/test_analise_slo.png`) e imprime a resposta gerada pela IA.

---

## Dependências Python

| Biblioteca      | Uso                                    |
| --------------- | -------------------------------------- |
| `openai`        | Comunicação com a API GPT              |
| `python-dotenv` | Carregamento de variáveis de ambiente  |
| `Pillow`        | Abertura e processamento de imagens    |
| `pytesseract`   | OCR — extração de texto de imagens     |
| `pdf2image`     | Conversão de páginas de PDF em imagens |

## Rodando a aplicação da IA

```bash
python -m src.main
```

---

## Atualização — Prompt atual da IA (Node.js)

A partir da sprint 3 a integração com a OpenAI foi reescrita em Node.js dentro do backend Express. O módulo `backend/src/services/openai.service.js` passou a concentrar toda a lógica de geração de resposta, substituindo o agente em Python descrito acima. Esta seção documenta o estado atual do **prompt** enviado ao modelo e o **comportamento esperado** da resposta.

### Modelo e parâmetros

| Item             | Valor padrão                          | Variável de ambiente       |
| ---------------- | ------------------------------------- | -------------------------- |
| Endpoint         | `https://api.openai.com/v1/responses` | —                          |
| Modelo           | `gpt-5.4`                             | `OPENAI_MODEL`             |
| Limite de tokens | `900`                                 | `OPENAI_MAX_OUTPUT_TOKENS` |
| Chave da API     | obrigatória                           | `OPENAI_API_KEY`           |

Se a variável `OPENAI_API_KEY` não estiver presente, a chamada não é feita: o serviço retorna `modo: "fallback_sem_openai_key"` e o RAG monta uma resposta textual listando os artigos encontrados, sem geração da IA.

### Funções públicas do serviço

| Função                                                                             | Quando é usada                                                                                  |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `gerarRespostaComOpenAI({ pergunta, contexto, contextoCientifico, tipo })`         | Chamada principal do RAG (perguntas em texto).                                                  |
| `gerarRespostaComPDF({ pergunta, textoPDF, contextoCientifico })`                  | Quando o produtor envia um laudo de solo em PDF — usa o tipo `laudo_solo`.                      |
| `gerarRespostaComImagem({ pergunta, imagemBase64, mimeType, contextoCientifico })` | Quando o produtor envia o laudo como imagem — chama o modelo em modo visão.                     |
| `transcreverAudio(audioBuffer, mimeType)`                                          | Transcreve áudios do WhatsApp via Whisper antes de mandar a transcrição para o RAG.             |
| `resumirTranscricao(titulo, transcricao)`                                          | Gera o `resumo` técnico de um vídeo do YouTube para alimentar a tabela `videos` (ver sprint 3). |

### Estrutura do prompt

O prompt é montado por dois helpers internos, escolhidos pelo parâmetro `tipo`:

- `montarPromptGeral(pergunta, contexto, contextoCientifico)` — usado para perguntas abertas do produtor.
- `montarPromptLaudoSolo(pergunta, contexto, contextoCientifico)` — usado quando há um laudo (PDF ou imagem) anexado.

Os dois prompts compartilham a mesma anatomia:

```text
1. Identidade do agente   → "Voce e um assistente tecnico da Agrominas"
                            "Você é um engenheiro agrônomo especialista..."
2. Tarefa                 → responder usando APENAS a base recuperada
3. BASE DE CONHECIMENTO   → trechos vindos do RAG (artigos + vídeos)
4. BASE COMPLEMENTAR      → opcional, vinda de `contextoCientifico`
5. PERGUNTA DO PRODUTOR   → texto enviado pelo produtor
6. Formato de resposta    → bullets curtos, sem markdown pesado
7. REGRAS                 → o que NÃO fazer (não inventar, não usar jargão)
```

#### Prompt de pergunta aberta (`montarPromptGeral`)

A resposta é orientada para o canal WhatsApp e segue um esqueleto fixo:

```text
Orientacao:
- Explique a recomendacao principal em linguagem simples.

O que fazer agora:
- Liste de 2 a 4 acoes praticas.
- Cite insumos, culturas ou tecnicas da base quando forem relevantes.
```

Regras embutidas no prompt:

- não inventar informações fora da base;
- não escrever texto longo;
- não usar linguagem excessivamente técnica;
- não usar o cabeçalho "Diagnóstico" (esse é exclusivo do laudo).

#### Prompt de laudo de solo (`montarPromptLaudoSolo`)

Quando o produtor envia um laudo, o prompt acrescenta o bloco `DADOS DA ANÁLISE DE SOLO DO AGRICULTOR` antes da pergunta e força a resposta a sair em dois blocos:

```text
Diagnóstico:
- Resuma em no máximo 2 linhas a situação do solo.

O que fazer agora:
- Ações práticas e diretas (bullet points).
- Use os nomes dos insumos da BASE DE CONHECIMENTO CIENTÍFICO se forem aplicáveis.
```

Regras adicionais para esse modo:

- não usar markdown, asteriscos ou negrito;
- priorizar soluções regenerativas e de baixo custo;
- se houver conflito entre o laudo e a base científica, priorizar a segurança do solo.

### Comportamento esperado

| Situação                                | Retorno do serviço (`modo`)   | O que o usuário recebe                                              |
| --------------------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| Pergunta aberta com contexto encontrado | `openai`                      | Resposta nos blocos _Orientação_ + _O que fazer agora_.             |
| Pergunta aberta sem contexto no banco   | `sem_contexto` (vindo do RAG) | Mensagem padrão pedindo para reformular com nome de insumo/cultura. |
| Laudo em PDF                            | `openai`                      | Resposta nos blocos _Diagnóstico_ + _O que fazer agora_.            |
| Laudo em imagem com modelo sem visão    | `erro_modelo_sem_visao`       | Mensagem orientando a reenviar como PDF.                            |
| Sem `OPENAI_API_KEY` configurada        | `fallback_sem_openai_key`     | Lista de artigos da base, sem texto gerado.                         |
| Erro 4xx/5xx da OpenAI                  | exceção propagada             | Tratada pelo `errorHandler` global do Express.                      |

