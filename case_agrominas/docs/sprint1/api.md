# Especificação da API Backend 

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [URL Base e Versionamento](#2-url-base-e-versionamento)
3. [Autenticação e Autorização](#3-autenticação-e-autorização)
4. [Endpoints — Artigos](#4-endpoints--artigos)
   - 4.1 [Listar Artigos](#41-listar-artigos)
   - 4.2 [Obter Artigo por ID](#42-obter-artigo-por-id)
   - 4.3 [Criar Artigo](#43-criar-artigo)
   - 4.4 [Atualizar Artigo](#44-atualizar-artigo)
   - 4.5 [Deletar Artigo](#45-deletar-artigo)
5. [Endpoints — Bot / Interação com IA](#5-endpoints--bot--interação-com-ia)
   - 5.1 [Enviar Pergunta ao Bot](#51-enviar-pergunta-ao-bot)
6. [Fluxo de Integração com IA](#6-fluxo-de-integração-com-ia)
7. [Estrutura de Erros e Códigos HTTP](#7-estrutura-de-erros-e-códigos-http)
8. [Exemplos de Uso por Contexto](#8-exemplos-de-uso-por-contexto)
9. [Considerações de Segurança](#9-considerações-de-segurança)
10. [Conclusão](#10-conclusão)

## 1. Visão Geral

Descreva em 2 a 4 parágrafos o propósito desta API dentro do projeto. Explique qual problema ela resolve, quais são os principais sistemas que se comunicam por ela (bot do WhatsApp, painel administrativo, modelo de IA) e qual o papel central da API como "ponte" entre esses componentes. Mencione a linguagem/framework escolhido para o backend (ex: Node.js, Python Flask/Django) e o banco de dados utilizado.

Cubra os seguintes pontos em sequência: o propósito da API, os sistemas integrados (bot, painel admin, IA), as tecnologias utilizadas no backend e um resumo das funcionalidades principais expostas.

---

## 2. URL Base e Versionamento

Informe a URL base da API em cada ambiente (desenvolvimento, homologação e produção). Defina também a estratégia de versionamento adotada (ex: `/v1/` no path, header de versão, etc.) e justifique a escolha.

```
Desenvolvimento:  http://localhost:[PORT]/api/v1
Homologação:      https://[url-de-homologacao]/api/v1
Produção:         https://[url-de-producao]/api/v1
```

Para cada ambiente, indique também quaisquer observações relevantes, como variáveis de ambiente necessárias, restrições de acesso por rede ou configurações específicas de infraestrutura.

---

## 3. Autenticação e Autorização

Detalhe o mecanismo de autenticação adotado para proteger os endpoints sensíveis, especialmente os do painel administrativo (operações de criação, edição e exclusão de artigos). Explique o tipo de token utilizado (ex: JWT, API Key), onde ele deve ser enviado nas requisições, o fluxo de obtenção do token (endpoint de login, validade, renovação) e o comportamento esperado em caso de token expirado ou inválido.

### 3.1 Rotas Públicas vs. Protegidas

Descreva quais rotas são acessíveis sem autenticação e quais exigem credenciais. Em geral, operações de leitura utilizadas pelo bot (ex: `GET /artigos`) tendem a ser públicas, enquanto operações de escrita do painel administrativo (ex: `POST`, `PUT`, `DELETE` em `/artigos`) devem ser protegidas. Liste aqui cada endpoint com seu respectivo nível de acesso, indicando também o perfil de usuário autorizado quando houver mais de um nível (ex: admin, editor).

### 3.2 Formato do Token / Header de Autorização

Mostre o formato exato do header de autorização que deve ser enviado nas requisições protegidas. Inclua também o endpoint e o payload necessário para obtenção do token (login) e a duração da sessão.

```http
Authorization: Bearer [token_aqui]
```

---

## 4. Endpoints — Artigos

**Prefixo base desta seção:** `/api/v1/artigos`

---

### 4.1 Listar Artigos

**Método:** `GET`  
**Rota:** `/api/v1/artigos`  
**Autenticação:** `[Pública / Requer token]`

Documente os parâmetros de query disponíveis para filtragem (ex: por categoria, cultura, tipo de insumo), paginação e ordenação. Para cada parâmetro, indique seu nome, tipo de dado esperado, se é obrigatório ou opcional, e uma breve descrição dos valores aceitos.

#### Exemplo de Requisição

```http
GET /api/v1/artigos?[parâmetros_de_exemplo] HTTP/1.1
Host: [url-base]
Authorization: Bearer [token, se necessário]
```

#### Estrutura da Resposta — Sucesso `200 OK`

Descreva todos os campos retornados, incluindo os campos de cada objeto artigo na lista e os campos de metadados de paginação (ex: total de registros, página atual, total de páginas).

```json
{
  "[campo_1]": "[descrição: tipo e significado do campo]",
  "[campo_2]": "[descrição: tipo e significado do campo]",
  "data": [
    {
      "[campo_artigo_1]": "[descrição do campo]",
      "[campo_artigo_2]": "[descrição do campo]"
    }
  ],
  "pagination": {
    "[campo_paginacao]": "[descrição]"
  }
}
```

---

### 4.2 Obter Artigo por ID

**Método:** `GET`  
**Rota:** `/api/v1/artigos/{id}`  
**Autenticação:** `[Pública / Requer token]`

O parâmetro `{id}` é obrigatório e deve ser informado no path da requisição. Indique o tipo de dado esperado (ex: inteiro, UUID) e as regras de formato aplicadas. Descreva também o comportamento quando o ID informado não corresponde a nenhum artigo cadastrado.

#### Exemplo de Requisição

```http
GET /api/v1/artigos/[id_exemplo] HTTP/1.1
Host: [url-base]
```

#### Estrutura da Resposta — Sucesso `200 OK`

Descreva a estrutura completa do JSON de resposta com todos os campos do artigo: título, conteúdo, categoria, cultura, referências, data de publicação, entre outros que o modelo de dados contemplar.

```json
{
  "[campo_1]": "[descrição]",
  "[campo_2]": "[descrição]",
  "[campo_conteudo]": "[descrição: corpo completo do artigo]"
}
```

#### Resposta — Não Encontrado `404 Not Found`

```json
{
  "[campo_erro]": "[descrição da estrutura de erro]"
}
```

---

### 4.3 Criar Artigo

**Método:** `POST`  
**Rota:** `/api/v1/artigos`  
**Autenticação:** `Requer token`

Documente todos os campos do payload de requisição, separando os obrigatórios dos opcionais. Para cada campo, indique seu nome, tipo de dado, se é obrigatório, e as validações aplicadas (ex: tamanho máximo, formato, valores permitidos). Descreva também a estrutura da resposta de sucesso, que deve incluir o artigo criado com o ID gerado pelo sistema.

#### Exemplo de Requisição

```http
POST /api/v1/artigos HTTP/1.1
Host: [url-base]
Authorization: Bearer [token]
Content-Type: application/json

{
  "[campo_obrigatorio_1]": "[tipo e descrição]",
  "[campo_obrigatorio_2]": "[tipo e descrição]",
  "[campo_opcional_1]": "[tipo e descrição — opcional]"
}
```

#### Estrutura da Resposta — Sucesso `201 Created`

```json
{
  "[campo_id_gerado]": "[descrição]",
  "[demais_campos]": "[descrição]"
}
```

---

### 4.4 Atualizar Artigo

**Método:** `PUT` ou `PATCH`  
**Rota:** `/api/v1/artigos/{id}`  
**Autenticação:** `Requer token`

Especifique se a operação é total (`PUT`, substitui o objeto inteiro) ou parcial (`PATCH`, atualiza apenas os campos enviados) e justifique a escolha. Liste os campos que podem ser atualizados e os que são imutáveis (ex: ID, data de criação). Descreva também o comportamento quando o artigo não é encontrado.

#### Exemplo de Requisição

```http
[PUT/PATCH] /api/v1/artigos/[id_exemplo] HTTP/1.1
Host: [url-base]
Authorization: Bearer [token]
Content-Type: application/json

{
  "[campo_atualizavel_1]": "[tipo e descrição]",
  "[campo_atualizavel_2]": "[tipo e descrição]"
}
```

#### Estrutura da Resposta — Sucesso `200 OK`

```json
{
  "[artigo_atualizado_completo]": "[descrição dos campos retornados]"
}
```

---

### 4.5 Deletar Artigo

**Método:** `DELETE`  
**Rota:** `/api/v1/artigos/{id}`  
**Autenticação:** `Requer token`

Especifique se a deleção é física (remove permanentemente do banco) ou lógica (marca o registro como inativo ou arquivado). Descreva o comportamento da resposta em caso de sucesso e em caso de ID inexistente.

#### Exemplo de Requisição

```http
DELETE /api/v1/artigos/[id_exemplo] HTTP/1.1
Host: [url-base]
Authorization: Bearer [token]
```

#### Resposta — Sucesso `204 No Content`

Descrever se o body é vazio ou se retorna alguma mensagem de confirmação.

#### Resposta — Não Encontrado `404 Not Found`

```json
{
  "[campo_erro]": "[descrição da estrutura de erro]"
}
```

---

## 5. Endpoints — Bot / Interação com IA

**Prefixo base desta seção:** `/api/v1/bot`

---

### 5.1 Enviar Pergunta ao Bot

**Método:** `POST`  
**Rota:** `/api/v1/bot/perguntar`  
**Autenticação:** `[Definir — ex: API Key do serviço WhatsApp]`

Este é o ponto de entrada das mensagens recebidas pelo WhatsApp. Descreva o payload de entrada detalhando os campos esperados: o texto da pergunta do produtor, o identificador da conversa ou sessão, o número do WhatsApp e qualquer contexto adicional opcional (ex: cultura de interesse, região). Descreva também o comportamento em caso de pergunta sem resultados relevantes no banco de artigos, indicando a mensagem de fallback retornada.

#### Exemplo de Requisição

```http
POST /api/v1/bot/perguntar HTTP/1.1
Host: [url-base]
Content-Type: application/json
X-Api-Key: [chave-de-autenticacao]

{
  "[campo_pergunta]": "[tipo e descrição — texto da mensagem do produtor]",
  "[campo_sessao_ou_usuario]": "[tipo e descrição — identificador da conversa]",
  "[campo_contexto_opcional]": "[tipo e descrição — ex: cultura, região]"
}
```

#### Estrutura da Resposta — Sucesso `200 OK`

A resposta deve conter o texto gerado pela IA, a lista de artigos utilizados como referência (com ID, título e, se aplicável, score de relevância) e metadados da consulta, como tempo de resposta e modelo de IA utilizado.

```json
{
  "[campo_resposta_ia]": "[descrição: texto da resposta gerada pela IA]",
  "[campo_artigos_referenciados]": [
    {
      "[campo_id_artigo]": "[descrição]",
      "[campo_titulo_artigo]": "[descrição]",
      "[campo_score_relevancia]": "[descrição — se aplicável]"
    }
  ],
  "[campo_metadados]": {
    "[campo_tempo_resposta]": "[descrição]",
    "[campo_modelo_ia]": "[descrição]"
  }
}
```

#### Resposta — Sem Resultados `200 OK` (fallback)

```json
{
  "[campo_resposta_fallback]": "[descrição: mensagem padrão quando não há artigos relevantes]"
}
```

---

## 6. Fluxo de Integração com IA

Descreva em detalhes o fluxo completo que ocorre internamente na API quando uma pergunta é recebida via `POST /bot/perguntar`. O objetivo é deixar claro como a API orquestra a busca de conteúdo e a geração de resposta. Preencha cada etapa do diagrama abaixo com os detalhes técnicos da implementação, como algoritmo de busca, modelo de IA utilizado, número de artigos recuperados e tamanho do contexto enviado à IA.

### 6.1 Diagrama de Sequência

```
Produtor (WhatsApp)
      │
      ▼
[1] Bot recebe mensagem
      │
      ▼
[2] POST /api/v1/bot/perguntar
      │
      ▼
[3] API — Pré-processamento da pergunta
    └─ [Descrever: normalização, extração de intenção, identificação de cultura/insumo, etc.]
      │
      ▼
[4] API — Busca de Artigos Relevantes no Banco de Dados
    └─ [Descrever: algoritmo de busca utilizado — ex: busca por palavras-chave,
        similaridade semântica/embeddings, filtros por categoria ou cultura]
      │
      ▼
[5] API — Montagem do Contexto para a IA
    └─ [Descrever: como os artigos recuperados são formatados e combinados com a
        pergunta original para compor o prompt enviado ao modelo de IA]
      │
      ▼
[6] Chamada ao Modelo de IA
    └─ [Descrever: modelo utilizado, parâmetros da chamada, timeout,
        tratamento de falhas na chamada à IA]
      │
      ▼
[7] API — Pós-processamento da Resposta
    └─ [Descrever: formatação da resposta para o formato do WhatsApp,
        inclusão de referências dos artigos, truncamento se necessário]
      │
      ▼
[8] Retorno ao Bot → Produtor recebe resposta
```

### 6.2 Detalhamento de Cada Etapa

Para cada etapa numerada no diagrama acima, descreva com precisão técnica: quais bibliotecas ou serviços externos são acionados, quais dados transitam entre as etapas, as decisões de implementação tomadas e o tratamento de exceções previsto.

**Etapa 1 — [Nome da etapa]**  
Descrição técnica: `[preencher]`  
Serviço / Biblioteca utilizada: `[preencher]`  
Tratamento de erro: `[preencher]`

**Etapa 2 — [Nome da etapa]**  
Descrição técnica: `[preencher]`  
Serviço / Biblioteca utilizada: `[preencher]`  
Tratamento de erro: `[preencher]`

**Etapa 3 — [Nome da etapa]**  
Descrição técnica: `[preencher]`  
Serviço / Biblioteca utilizada: `[preencher]`  
Tratamento de erro: `[preencher]`

**Etapa 4 — [Nome da etapa]**  
Descrição técnica: `[preencher]`  
Serviço / Biblioteca utilizada: `[preencher]`  
Tratamento de erro: `[preencher]`

**Etapa 5 — [Nome da etapa]**  
Descrição técnica: `[preencher]`  
Serviço / Biblioteca utilizada: `[preencher]`  
Tratamento de erro: `[preencher]`

**Etapa 6 — [Nome da etapa]**  
Descrição técnica: `[preencher]`  
Serviço / Biblioteca utilizada: `[preencher]`  
Tratamento de erro: `[preencher]`

**Etapa 7 — [Nome da etapa]**  
Descrição técnica: `[preencher]`  
Serviço / Biblioteca utilizada: `[preencher]`  
Tratamento de erro: `[preencher]`

**Etapa 8 — [Nome da etapa]**  
Descrição técnica: `[preencher]`  
Serviço / Biblioteca utilizada: `[preencher]`  
Tratamento de erro: `[preencher]`

---

## 7. Estrutura de Erros e Códigos HTTP

Defina o padrão de resposta de erro adotado pela API. Documente o objeto JSON padrão de erro com seus campos (ex: código interno, mensagem legível, detalhes de validação, timestamp) e descreva o cenário de uso de cada código HTTP utilizado, cobrindo erros de validação, autenticação, recurso não encontrado e falhas internas do servidor.

### 7.1 Estrutura Padrão de Erro

```json
{
  "[campo_codigo_erro]":   "[descrição: código interno do erro]",
  "[campo_mensagem]":      "[descrição: mensagem legível para o consumidor da API]",
  "[campo_detalhes]":      "[descrição: lista de detalhes adicionais, ex: campos com validação falha]",
  "[campo_timestamp]":     "[descrição: data/hora do erro]"
}
```

### 7.2 Códigos de Status HTTP Utilizados

`200 OK` — `[descrever o cenário de uso]`

`201 Created` — `[descrever o cenário de uso]`

`204 No Content` — `[descrever o cenário de uso]`

`400 Bad Request` — `[descrever o cenário de uso]`

`401 Unauthorized` — `[descrever o cenário de uso]`

`403 Forbidden` — `[descrever o cenário de uso]`

`404 Not Found` — `[descrever o cenário de uso]`

`422 Unprocessable Entity` — `[descrever o cenário de uso]`

`500 Internal Server Error` — `[descrever o cenário de uso]`

---

## 8. Exemplos de Uso por Contexto

Apresente cenários de uso reais e completos demonstrando como cada parte do sistema interage com a API. Os cenários abaixo devem ser preenchidos com requisições e respostas realistas baseadas nos dados do projeto Agrominas.

### 8.1 Cenário: Produtor consulta o bot pelo WhatsApp

Descreva o fluxo completo: o produtor envia uma mensagem sobre um insumo regenerativo, o bot repassa ao endpoint `POST /bot/perguntar`, e a API retorna a resposta com referência ao artigo. Inclua payload de requisição e resposta preenchidos com dados fictícios mas realistas do contexto agrícola.

```http
[preencher com exemplo completo de requisição e resposta para este cenário]
```

### 8.2 Cenário: Administrador cria um novo artigo pelo painel

Descreva o fluxo de um usuário administrador autenticado que adiciona um novo artigo à biblioteca. Inclua o processo de autenticação (obtenção do token) seguido da chamada `POST /artigos` com todos os campos preenchidos com dados fictícios mas representativos do projeto.

```http
[preencher com exemplo completo de requisição e resposta para este cenário]
```

### 8.3 Cenário: Administrador atualiza um artigo existente

Descreva o fluxo de edição de conteúdo de um artigo já cadastrado. Inclua a chamada de atualização com apenas os campos alterados.

```http
[preencher com exemplo completo de requisição e resposta para este cenário]
```

### 8.4 Cenário: Bot busca artigos por categoria/cultura

Descreva como o bot (ou o painel) pode listar artigos filtrados por uma cultura específica ou tipo de insumo, utilizando os query params do `GET /artigos`.

```http
[preencher com exemplo completo de requisição e resposta para este cenário]
```

---

## 9. Considerações de Segurança

Descreva as medidas de segurança implementadas ou planejadas para a API. Para cada tópico abaixo, indique as decisões técnicas adotadas.

**Autenticação** — `[preencher]`

**Autorização por perfil** — `[preencher]`

**Rate Limiting** — `[preencher — ex: limite de requisições por IP ou por token, janela de tempo, comportamento ao exceder o limite]`

**Validação de inputs** — `[preencher — ex: sanitização para evitar SQL injection e XSS, bibliotecas utilizadas]`

**HTTPS / TLS** — `[preencher]`

**CORS** — `[preencher — origens permitidas, configuração aplicada]`

**Logs e monitoramento** — `[preencher]`

**Dados sensíveis** — `[preencher — ex: nenhuma informação pessoal do produtor é armazenada, política de retenção de logs]`

---

## 10. Conclusão

Faça um fechamento do documento resumindo o que foi especificado. Retome brevemente o papel central desta API no projeto, destacando como ela conecta o bot do WhatsApp, o banco de artigos e o modelo de IA para entregar valor ao produtor rural. Indique os próximos passos esperados após a aprovação desta especificação (ex: início do desenvolvimento, revisão com o time, validação com o cliente) e registre quaisquer decisões técnicas que ainda estejam em aberto e precisam ser definidas antes ou durante a implementação.

---

*Documento gerado para o projeto Guia Regenerativo — AgroTech Inteli + Agrominas Fertilizantes.*