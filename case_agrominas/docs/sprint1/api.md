# Especificação da API Backend 

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [URL Base e Versionamento](#2-url-base-e-versionamento)
3. [Autenticação e Autorização](#3-autenticação-e-autorização)
4. [Endpoints](#4-endpoints)
5. [Fluxo de Integração com IA](#5-fluxo-de-integração-com-ia)
6. [Estrutura de Erros e Códigos HTTP](#6-estrutura-de-erros-e-códigos-http)
7. [Exemplos de Uso por Contexto](#7-exemplos-de-uso-por-contexto)
8. [Considerações de Segurança](#8-considerações-de-segurança)
9. [Conclusão](#9-conclusão)

---

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

## 4. Endpoints

Esta seção deve documentar todos os endpoints da API, organizados por grupo funcional. Cada grupo deve corresponder a um recurso ou domínio da aplicação (ex: artigos, interação com o bot, autenticação). O time de desenvolvimento deve levantar quais recursos precisam ser expostos pela API e, para cada um deles, definir os endpoints necessários antes de preencher esta seção.

Para cada endpoint documentado, as seguintes informações são obrigatórias: o método HTTP utilizado (`GET`, `POST`, `PUT`, `PATCH` ou `DELETE`), a rota completa a partir da URL base, o nível de autenticação exigido (público ou autenticado), a descrição do que a operação realiza, os parâmetros aceitos (de path, de query ou no body), a estrutura completa do payload de requisição em JSON quando aplicável, a estrutura completa da resposta de sucesso em JSON com todos os campos descritos, e as possíveis respostas de erro com seus respectivos códigos HTTP.

Além disso, para endpoints que aceitam parâmetros de filtragem, paginação ou ordenação, cada parâmetro deve ter seu nome, tipo de dado, obrigatoriedade e valores aceitos claramente especificados. Para endpoints de escrita (criação e atualização), é necessário separar os campos obrigatórios dos opcionais e indicar as validações aplicadas a cada um (ex: tamanho máximo, formato, lista de valores permitidos). Para endpoints de exclusão, deve-se definir se a deleção é física ou lógica e descrever o comportamento esperado em ambos os cenários (sucesso e recurso não encontrado).

Cada endpoint deve ainda conter um exemplo completo de requisição HTTP, incluindo headers relevantes, e um exemplo do JSON de resposta esperado.

---

## 5. Fluxo de Integração com IA

Descreva em detalhes o fluxo completo que ocorre internamente na API quando uma pergunta é recebida via `POST /bot/perguntar`. O objetivo é deixar claro como a API orquestra a busca de conteúdo e a geração de resposta. Preencha cada etapa do diagrama abaixo com os detalhes técnicos da implementação, como algoritmo de busca, modelo de IA utilizado, número de artigos recuperados e tamanho do contexto enviado à IA.

### 5.1 Diagrama de Sequência

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

### 5.2 Detalhamento de Cada Etapa

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

## 6. Estrutura de Erros e Códigos HTTP

Defina o padrão de resposta de erro adotado pela API. Documente o objeto JSON padrão de erro com seus campos (ex: código interno, mensagem legível, detalhes de validação, timestamp) e descreva o cenário de uso de cada código HTTP utilizado, cobrindo erros de validação, autenticação, recurso não encontrado e falhas internas do servidor.

### 6.1 Estrutura Padrão de Erro

```json
{
  "[campo_codigo_erro]":   "[descrição: código interno do erro]",
  "[campo_mensagem]":      "[descrição: mensagem legível para o consumidor da API]",
  "[campo_detalhes]":      "[descrição: lista de detalhes adicionais, ex: campos com validação falha]",
  "[campo_timestamp]":     "[descrição: data/hora do erro]"
}
```

### 6.2 Códigos de Status HTTP Utilizados

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

## 7. Exemplos de Uso por Contexto

Apresente cenários de uso reais e completos demonstrando como cada parte do sistema interage com a API. Os cenários abaixo devem ser preenchidos com requisições e respostas realistas baseadas nos dados do projeto Agrominas.

### 7.1 Cenário: Produtor consulta o bot pelo WhatsApp

Descreva o fluxo completo: o produtor envia uma mensagem sobre um insumo regenerativo, o bot repassa ao endpoint `POST /bot/perguntar`, e a API retorna a resposta com referência ao artigo. Inclua payload de requisição e resposta preenchidos com dados fictícios mas realistas do contexto agrícola.

```http
[preencher com exemplo completo de requisição e resposta para este cenário]
```

### 7.2 Cenário: Administrador cria um novo artigo pelo painel

Descreva o fluxo de um usuário administrador autenticado que adiciona um novo artigo à biblioteca. Inclua o processo de autenticação (obtenção do token) seguido da chamada `POST /artigos` com todos os campos preenchidos com dados fictícios mas representativos do projeto.

```http
[preencher com exemplo completo de requisição e resposta para este cenário]
```

### 7.3 Cenário: Administrador atualiza um artigo existente

Descreva o fluxo de edição de conteúdo de um artigo já cadastrado. Inclua a chamada de atualização com apenas os campos alterados.

```http
[preencher com exemplo completo de requisição e resposta para este cenário]
```

### 7.4 Cenário: Bot busca artigos por categoria/cultura

Descreva como o bot (ou o painel) pode listar artigos filtrados por uma cultura específica ou tipo de insumo, utilizando os query params do `GET /artigos`.

```http
[preencher com exemplo completo de requisição e resposta para este cenário]
```

---

## 8. Considerações de Segurança

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

## 9. Conclusão

Faça um fechamento do documento resumindo o que foi especificado. Retome brevemente o papel central desta API no projeto, destacando como ela conecta o bot do WhatsApp, o banco de artigos e o modelo de IA para entregar valor ao produtor rural. Indique os próximos passos esperados após a aprovação desta especificação (ex: início do desenvolvimento, revisão com o time, validação com o cliente) e registre quaisquer decisões técnicas que ainda estejam em aberto e precisam ser definidas antes ou durante a implementação.

---

*Documento gerado para o projeto Guia Regenerativo — AgroTech Inteli + Agrominas Fertilizantes.*