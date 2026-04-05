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

| Formato | Função interna | Biblioteca usada |
|---|---|---|
| `.txt` | `extrair_texto_txt` | I/O nativo Python |
| `.png` / `.jpg` / `.jpeg` | `extrair_texto_imagem` | `Pillow` + `pytesseract` |
| `.pdf` | `extrair_texto_pdf` | `pdf2image` + `pytesseract` |

A função principal é `extrair_texto(caminho_arquivo)`, que detecta automaticamente o formato pelo sufixo do arquivo e chama a função correspondente.

**Dependência de sistema:** O Tesseract OCR deve estar instalado em `C:\Program Files\Tesseract-OCR\tesseract.exe` e o idioma português (`por`) deve estar disponível.

---

### `agente_agronomico.py`

Agente principal de análise. Recebe o texto extraído da análise de solo e a pergunta do produtor, monta um *prompt* estruturado e envia para o modelo `gpt-5.4` via API da OpenAI.

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

| Biblioteca | Uso |
|---|---|
| `openai` | Comunicação com a API GPT |
| `python-dotenv` | Carregamento de variáveis de ambiente |
| `Pillow` | Abertura e processamento de imagens |
| `pytesseract` | OCR — extração de texto de imagens |
| `pdf2image` | Conversão de páginas de PDF em imagens |

## Rodando a aplicação da IA

```bash
python -m src.main
```

