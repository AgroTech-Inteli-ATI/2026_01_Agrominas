# Especificação da API Backend

---

## 1. Visão Geral

&ensp; A API do projeto **Guia Regenerativo** tem como propósito central atuar como a camada de orquestração responsável por conectar diferentes componentes do sistema e viabilizar a entrega de recomendações técnicas aos produtores rurais. Ela resolve o problema de integração entre a entrada de dados não estruturados (como perguntas em linguagem natural ou arquivos PDF enviados via WhatsApp), a base de conhecimento técnico (artigos) e o processamento inteligente realizado por modelos de IA. Dessa forma, a API garante que as informações fluam de maneira consistente, segura e escalável entre os sistemas envolvidos.

&ensp; Os principais sistemas que se comunicam com a API são o **bot do WhatsApp**, o **painel administrativo** e o **modelo de IA**. O bot atua como ponto de entrada das interações dos produtores, enviando perguntas ou documentos para a API. O painel administrativo, por sua vez, permite que usuários autorizados gerenciem o conteúdo da base de artigos, realizando operações de criação, edição e exclusão. Já o modelo de IA é acionado pela API para interpretar dados, cruzar informações e gerar respostas contextualizadas, tornando a API o elemento central que coordena toda essa comunicação.

&ensp; No backend, a API é desenvolvida utilizando **Node.js** com framework **Express**, adotando uma arquitetura REST para organização dos endpoints e padronização das requisições HTTP. Como banco de dados, é utilizado o **Supabase**, responsável pelo armazenamento e recuperação dos artigos técnicos e demais dados persistentes da aplicação. Além disso, a integração com serviços externos, como a API da OpenAI, permite a incorporação de capacidades avançadas de processamento de linguagem natural.

&ensp; Em termos de funcionalidades, a API expõe endpoints para listagem e consulta de artigos, gerenciamento completo do conteúdo (com autenticação via JWT), e processamento de perguntas enviadas pelo bot. Também é responsável por interpretar entradas (texto ou PDF), buscar informações relevantes na base de dados, montar o contexto para a IA e formatar a resposta final. Assim, a API consolida-se como a principal “ponte” entre interface, dados e inteligência do sistema, garantindo uma experiência fluida e orientada a valor para o usuário final.

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

&ensp; A API utiliza autenticação baseada em **JSON Web Token (JWT)** para proteger endpoints sensíveis, especialmente aqueles relacionados ao painel administrativo de gerenciamento de artigos.

&ensp; A autenticação é necessária para operações que modificam o conteúdo da biblioteca de insumos regenerativos, como criação, edição e exclusão de artigos. Essas operações são restritas a usuários autorizados da equipe de conteúdo da plataforma.

&ensp; O fluxo de autenticação ocorre da seguinte forma:

1. O usuário realiza login no sistema através do endpoint de autenticação.
2. Após a validação das credenciais, o servidor gera um **token JWT**.
3. Esse token deve ser enviado em todas as requisições para endpoints protegidos.
4. O token possui um tempo de expiração definido pelo servidor.
5. Caso o token esteja expirado ou inválido, a API retornará um erro de autenticação.

&ensp; Os tokens devem ser enviados no header `Authorization` das requisições HTTP.

&ensp; Quando um token inválido ou expirado é enviado, a API retorna:

- `401 Unauthorized` — token ausente, inválido ou expirado
- `403 Forbidden` — usuário autenticado, porém sem permissão para executar a operação

---

### 3.1 Rotas Públicas vs. Protegidas

&ensp; A API é dividida entre **rotas públicas**, acessíveis pelo bot do WhatsApp e pelos usuários finais, e **rotas protegidas**, utilizadas pelo painel administrativo para gerenciamento de conteúdo.

#### Rotas Públicas

&ensp; Estas rotas podem ser acessadas sem autenticação.

| Método | Endpoint        | Descrição                                         |
| ------ | --------------- | ------------------------------------------------- |
| GET    | `/artigos`      | Lista artigos disponíveis na biblioteca           |
| GET    | `/artigos/{id}` | Retorna um artigo específico                      |
| POST   | `/perguntar`    | Envia uma pergunta ao bot e retorna recomendações |

&ensp; Essas rotas são utilizadas principalmente pelo **bot do WhatsApp**, permitindo que produtores consultem conteúdos técnicos.

---

#### Rotas Protegidas

&ensp; Estas rotas exigem autenticação com token JWT.

| Método | Endpoint        | Descrição                       |
| ------ | --------------- | ------------------------------- |
| POST   | `/auth/login`   | Realiza autenticação de usuário |
| POST   | `/artigos`      | Cria um novo artigo             |
| PUT    | `/artigos/{id}` | Atualiza um artigo existente    |
| DELETE | `/artigos/{id}` | Remove um artigo                |

&ensp; Essas operações são destinadas ao **painel administrativo de gestão de conteúdo**.

&ensp; Perfis autorizados:

- `admin` — acesso completo ao sistema
- `editor` — criação e edição de artigos

---

### 3.2 Formato do Token / Header de Autorização

&ensp; Requisições para endpoints protegidos devem incluir o token JWT no header `Authorization`:

```http
Authorization: Bearer [token_aqui]
```

#### Endpoint de Login

**`POST /auth/login`**

&ensp; Realiza autenticação de um usuário do painel administrativo.

**Request:**

```json
{
  "email": "admin@agrominas.com",
  "password": "senha_segura"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "nome": "Administrador",
    "role": "admin"
  }
}
```

- `token` — JWT utilizado nas requisições protegidas
- `expires_in` — tempo de validade em segundos
- `role` — perfil de autorização do usuário

**Credenciais incorretas:**

```json
{
  "error": "Credenciais inválidas"
}
```

> HTTP Status: `401 Unauthorized`

---

## 4. Endpoints

Esta seção documenta os endpoints disponíveis na API da plataforma Guia Regenerativo, responsável por fornecer acesso à biblioteca de insumos regenerativos e permitir a interação do bot do WhatsApp com os produtores rurais.

Os endpoints estão organizados em três grupos principais:

- **Artigos** — acesso e gerenciamento do conteúdo técnico
- **Bot** — interação com o assistente via perguntas
- **Autenticação** — login de usuários administrativos

---

### 4.1 Listar Artigos

**`GET /artigos`**

Retorna uma lista de artigos disponíveis na biblioteca de insumos regenerativos.

**Autenticação:** Pública

#### Parâmetros de Query (opcional)

| Parâmetro   | Tipo    | Descrição                           |
| ----------- | ------- | ----------------------------------- |
| `page`      | integer | Página da listagem                  |
| `limit`     | integer | Quantidade de resultados por página |
| `categoria` | string  | Filtrar artigos por categoria       |

**Exemplo de Requisição:**

```
GET /artigos?page=1&limit=10
```

**Resposta de Sucesso:**

```json
{
  "page": 1,
  "total": 35,
  "artigos": [
    {
      "id": 1,
      "titulo": "Uso de remineralizadores no manejo do solo",
      "categoria": "manejo do solo",
      "resumo": "Estudo sobre aplicação de remineralizadores em sistemas agrícolas",
      "data_publicacao": "2024-03-01"
    }
  ]
}
```

---

### 4.2 Obter Artigo Específico

**`GET /artigos/{id}`**

Retorna os detalhes completos de um artigo.

**Autenticação:** Pública

#### Parâmetros de Path

| Parâmetro | Tipo    | Descrição               |
| --------- | ------- | ----------------------- |
| `id`      | integer | Identificador do artigo |

**Exemplo de Requisição:**

```
GET /artigos/1
```

**Resposta de Sucesso:**

```json
{
  "id": 1,
  "titulo": "Uso de remineralizadores no manejo do solo",
  "categoria": "manejo do solo",
  "conteudo": "Conteúdo técnico completo do artigo...",
  "autor": "Equipe Técnica Agrominas",
  "data_publicacao": "2024-03-01"
}
```

---

### 4.3 Criar Artigo

**`POST /artigos`**

Cria um novo artigo na biblioteca.

**Autenticação:** Requer token JWT  
**Perfil autorizado:** `admin` ou `editor`

**Request:**

```json
{
  "titulo": "Uso de bioinsumos na agricultura regenerativa",
  "categoria": "bioinsumos",
  "conteudo": "Conteúdo técnico do artigo...",
  "autor": "Equipe Técnica Agrominas"
}
```

**Resposta de Sucesso:**

```json
{
  "id": 42,
  "message": "Artigo criado com sucesso"
}
```

---

### 4.4 Atualizar Artigo

**`PUT /artigos/{id}`**

Atualiza um artigo existente.

**Autenticação:** Requer token JWT

**Request:**

```json
{
  "titulo": "Uso de bioinsumos na agricultura regenerativa",
  "conteudo": "Conteúdo atualizado do artigo..."
}
```

**Resposta:**

```json
{
  "message": "Artigo atualizado com sucesso"
}
```

---

### 4.5 Excluir Artigo

**`DELETE /artigos/{id}`**

Remove um artigo da biblioteca.

**Autenticação:** Requer token JWT  
**Perfil autorizado:** `admin`

**Resposta:**

```json
{
  "message": "Artigo removido com sucesso"
}
```

---

### 4.6 Enviar Pergunta ao Bot

**`POST /perguntar`**

Endpoint utilizado pelo bot do WhatsApp para enviar perguntas feitas pelos produtores. A API processa a pergunta e retorna recomendações de artigos relevantes.

**Autenticação:** Pública

**Request:**

```json
{
  "pergunta": "Como melhorar a fertilidade do solo de forma sustentável?"
}
```

**Response:**

```json
{
  "resposta": "Encontramos alguns conteúdos que podem ajudar:",
  "artigos_recomendados": [
    {
      "id": 3,
      "titulo": "Uso de remineralizadores no manejo do solo"
    },
    {
      "id": 8,
      "titulo": "Práticas regenerativas para recuperação do solo"
    }
  ]
}
```

---

## 5. Fluxo de Integração com IA

&ensp; Esta seção descreve o caminho percorrido desde o momento em que o produtor envia uma pergunta pelo WhatsApp até o momento em que recebe uma resposta. O objetivo é deixar claro como as diferentes partes do sistema trabalham juntas para entregar uma resposta útil e baseada em conteúdo técnico confiável.

### 5.1 Diagrama de Sequência

```mermaid
flowchart LR

A["1. Produtor"] --> B["2. Bot"]
B --> C["3. Interpretar pergunta"]
C --> D["4. Buscar artigos"]

D --> E["5. Montar contexto"]
E --> F["6. Modelo IA"]
F --> G["7. Formatar resposta"]

G --> H["8. Resposta no WhatsApp"]
```

### 5.2 Detalhamento de Cada Etapa

---

#### Etapa 1: Produtor envia uma pergunta ou documento

&ensp; O produtor rural interage com o bot enviando uma dúvida por texto ou um arquivo no formato _PDF_ (como um laudo de análise de solo). O sistema é projetado para entender tanto perguntas diretas quanto dados técnicos contidos em documentos.

_Exemplos:_

- _Texto:_ "Que tipo de calcário devo usar para corrigir o pH do solo na minha lavoura de milho?"
- _PDF:_ Envio de um arquivo analise_solo_fazenda.pdf contendo os níveis de NPK e pH.

&ensp; _Comportamento em caso de problema:_ Caso o arquivo enviado não seja um PDF suportado ou esteja corrompido, o bot solicita o reenvio ou a digitação dos dados manualmente.

---

#### Etapa 2: Bot encaminha a entrada para a API

&ensp; O bot captura a mensagem ou o arquivo. No caso de PDFs, o arquivo é enviado para um storage temporário ou transmitido via stream para a API, junto com o identificador da sessão do usuário.

---

#### Etapa 3: API interpreta a entrada (Texto ou PDF)

&ensp; A API realiza o processamento inicial:

- _Para Texto:_ Identifica palavras-chave como culturas (soja, milho) ou insumos.
- _Para PDF:_ A API utiliza um serviço de extração de texto para ler o conteúdo do documento. Ela busca especificamente por valores técnicos (pH, Alumínio, Fósforo, etc.) para transformar os dados não estruturados do arquivo em dados utilizáveis.

&ensp; _Comportamento em caso de problema:_ Se o PDF for uma imagem protegida ou sem texto legível, a API retorna um erro solicitando que o usuário digite os valores principais.

---

#### Etapa 4: API busca artigos relevantes na biblioteca

&ensp; Com os termos extraídos do texto ou os dados técnicos obtidos do PDF, a API consulta a base de dados _Supabase_. O objetivo é encontrar artigos técnicos que correspondam à necessidade do produtor (ex: se o PDF indica solo ácido, a API busca artigos sobre calagem e correção de pH).

---

#### Etapa 5: API prepara o contexto para a IA

&ensp; A API consolida todas as informações:

1.  _A Pergunta/Dados do PDF:_ O conteúdo extraído do documento ou a dúvida do produtor.
2.  _Base de Conhecimento:_ O texto dos artigos técnicos encontrados.
3.  _Persona:_ Instrução para a IA agir como assistente técnico especializado da Agrominas.

---

#### Etapa 6: API consulta o modelo de IA

&ensp; O bloco de informações é enviado para a _OpenAI API. A IA analisa os dados do PDF (ex: _"O pH está em 4.5") cruzando-os com os artigos (ex: "Para pH abaixo de 5.0, recomenda-se calcário dolomítico") para gerar uma recomendação personalizada e segura.

---

#### Etapa 7: API formata a resposta

&ensp; O diagnóstico técnico é transformado em uma mensagem amigável e curta. Valores técnicos complexos são explicados de forma simples, garantindo que o produtor compreenda a recomendação de manejo regenerativo.

---

#### Etapa 8: Produtor recebe a resposta pelo WhatsApp

&ensp; O bot entrega a resposta final. Se o produtor enviou um PDF de análise, a resposta incluirá um resumo do que a IA "leu" no documento antes de dar a recomendação, garantindo transparência no processo de análise automatizada.

&ensp; _Comportamento em caso de problema:_ Se a entrega falhar por limite de tokens ou erro de rede, o log registra o erro para auditoria no painel administrativo.

## 6. Estrutura de Erros e Códigos HTTP

Defina o padrão de resposta de erro adotado pela API. Documente o objeto JSON padrão de erro com seus campos (ex: código interno, mensagem legível, detalhes de validação, timestamp) e descreva o cenário de uso de cada código HTTP utilizado, cobrindo erros de validação, autenticação, recurso não encontrado e falhas internas do servidor.

### 6.1 Estrutura Padrão de Erro

```json
{
  "[campo_codigo_erro]": "[descrição: código interno do erro]",
  "[campo_mensagem]": "[descrição: mensagem legível para o consumidor da API]",
  "[campo_detalhes]": "[descrição: lista de detalhes adicionais, ex: campos com validação falha]",
  "[campo_timestamp]": "[descrição: data/hora do erro]"
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

&ensp; Esta seção apresenta situações reais de uso da plataforma, descrevendo como o bot e o painel administrativo interagem com a API em cada caso. Os exemplos utilizam dados fictícios, mas representativos do contexto do projeto.

### 7.1 Cenário: Produtor consulta o bot pelo WhatsApp

**Situação:** O produtor João tem uma lavoura de soja e quer reduzir o custo com adubação nitrogenada. Ele envia uma mensagem ao bot pelo WhatsApp perguntando se existe algum produto que possa ajudá-lo.

**O que acontece internamente:** O bot recebe a mensagem e a encaminha para a API. A API identifica os termos "soja" e "adubo nitrogenado", busca os artigos mais relevantes na biblioteca e, com base neles, aciona o modelo de IA para compor uma resposta em linguagem acessível.

**Dados enviados à API:**

```json
{
  "pergunta": "Tenho lavoura de soja e quero gastar menos com adubo nitrogenado, tem algum produto que ajude?",
  "sessao_id": "sess_wa_a1b2c3"
}
```

**Resposta retornada pela API:**

```json
{
  "resposta": "Sim! Para reduzir o uso de adubo nitrogenado na soja, o inoculante biológico é a melhor opção. Ele contém bactérias que fixam o nitrogênio do ar diretamente nas raízes da planta.Como funciona:As bactérias formam nódulos nas raízes e convertem o nitrogênio do ar em nutriente disponível para a planta. Em solos bem manejados, pode substituir até 100% da adubação nitrogenada de base. Dica de aplicação:Aplique nas sementes no dia do plantio, à sombra. Evite contato direto com fungicidas. aplique-os separadamente.",
  "artigos_referenciados": [
    {
      "id": "art_09f3a",
      "titulo": "Uso de Rhizobium na fixação biológica de nitrogênio em soja",
      "categoria": "biofertilizante"
    }
  ],
  "sessao_id": "sess_wa_a1b2c3",
  "confianca": "alta"
}
```

**Resultado:** O bot entrega a resposta ao produtor João diretamente no WhatsApp, formatada de forma clara e de fácil leitura pelo celular.

### 7.2 Cenário: Administrador cria um novo artigo pelo painel

**Situação:** A especialista técnica da Agrominas acessa o painel administrativo e deseja cadastrar um novo artigo sobre o uso de húmus de minhoca em horticultura.

**O que acontece:** Preenche o formulário do painel com as informações do artigo: título, resumo, conteúdo, cultura relacionada, categoria e palavras-chave. Ao confirmar, o painel envia essas informações à API, que valida os dados e registra o novo artigo na biblioteca.

**Passo 1: Autenticação no painel:**

&ensp; O administrador acessa o painel com seu e-mail e senha. A API valida as credenciais e retorna um token de acesso que será usado nas operações seguintes.

**Dados enviados:**

```json
{
  "email": "tecnica@agrominas.com.br",
  "senha": "senha123segura"
}
```

**Resposta retornada pela API:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tipo": "Bearer",
  "expira_em": 86400,
  "usuario": {
    "id": "usr_04",
    "nome": "Fernanda Oliveira",
    "email": "tecnica@agrominas.com.br",
    "perfil": "editor"
  }
}
```

**Passo 2: Criação do artigo:**

&ensp; Com o acesso autenticado, o painel envia os dados do novo artigo à API.

**Dados enviados:**

```json
{
  "titulo": "Húmus de Minhoca como Fertilizante Orgânico em Horticultura",
  "resumo": "Este artigo apresenta evidências do uso de húmus de minhoca (vermicomposto) como fertilizante orgânico em cultivos de alface, tomate e cenoura, com melhoria comprovada na estrutura do solo e no teor de matéria orgânica.",
  "corpo": "O vermicomposto, produzido pela ação de minhocas sobre resíduos orgânicos, é um dos biofertilizantes mais ricos em nutrientes disponíveis para as plantas...",
  "cultura": "horticultura",
  "categoria": "organico",
  "palavras_chave": [
    "húmus",
    "vermicomposto",
    "minhoca",
    "horticultura",
    "matéria orgânica"
  ],
  "referencias": [
    "KIEHL, E.J. Fertilizantes Orgânicos. Agronômica Ceres, 1985.",
    "EMBRAPA Hortaliças – Boletim de Pesquisa, 2022"
  ]
}
```

**Resposta da API:**

```json
{
  "id": "art_33d8f",
  "titulo": "Húmus de Minhoca como Fertilizante Orgânico em Horticultura",
  "cultura": "horticultura",
  "categoria": "organico",
  "criado_em": "2025-10-14T16:00:00Z",
  "mensagem": "Artigo criado com sucesso."
}
```

**Resultado:** O artigo é cadastrado na biblioteca e passa a estar disponível para consulta pelo bot e pelo painel administrativo.

### 7.3 Cenário: Administrador atualiza um artigo existente

**Situação:** Após uma revisão técnica, o administrador identificou que o artigo sobre calcário dolomítico precisava de um resumo mais preciso e de uma nova referência bibliográfica publicada em 2025.

**O que acontece:** O administrador localiza o artigo no painel, edita apenas os campos que precisam ser alterados e confirma a atualização. O painel envia à API somente os campos modificados — os demais permanecem intactos.

Dados enviados:

```json
{
  "resumo": "Análise atualizada do uso de calcário dolomítico para correção de acidez e fornecimento de cálcio e magnésio em pastagens degradadas do cerrado, com novos dados de ensaio de campo de 2025 indicando recuperação completa em 18 meses.",
  "referencias": [
    "SOUSA, D.M.G.; LOBATO, E. Cerrado: Correção do Solo e Adubação. Embrapa, 2004",
    "EMBRAPA Cerrados – Relatório de Ensaios de Campo, 2025",
    "IAC – Boletim Técnico sobre Calagem, 2023"
  ]
}
```

Resposta da API:

```json
{
  "id": "art_28c1e",
  "titulo": "Calcário Dolomítico como Corretivo de Solo em Pastagens Degradadas",
  "atualizado_em": "2025-10-14T17:15:00Z",
  "mensagem": "Artigo atualizado com sucesso."
}
```

**Resultado:** O resumo e as referências do artigo são atualizados. Os demais campos — título, corpo, cultura, categoria e palavras-chave — permanecem exatamente como estavam, pois não foram incluídos na solicitação de atualização.

## 8. Considerações de Segurança

### Autenticação

&ensp; A API utiliza autenticação baseada em **JSON Web Tokens (JWT)** para proteger endpoints sensíveis. Após o login, o servidor gera um token que deve ser incluído no header `Authorization` das requisições protegidas.

### Autorização por Perfil

&ensp; O sistema utiliza controle de acesso baseado em papéis (**RBAC**) para definir permissões de usuários.

**Perfis disponíveis:**

- `admin` — acesso completo, incluindo criação, edição e exclusão de artigos
- `editor` — criação e edição de artigos

&ensp; Rotas administrativas verificam o perfil do usuário antes de permitir a execução da operação.

### Rate Limiting

&ensp; Para evitar abuso da API e sobrecarga do sistema, é aplicado rate limiting por endereço IP.

**Exemplo de configuração:** 100 requisições por minuto por IP

&ensp; Ao exceder o limite, a API retorna:

> HTTP Status: `429 Too Many Requests`

### Validação de Inputs

&ensp; Todos os dados recebidos pela API passam por validação e sanitização antes de serem processados.

&ensp; As validações incluem:

- verificação de tipos de dados
- tamanho máximo de campos
- presença de campos obrigatórios
- sanitização para prevenir SQL Injection e Cross-Site Scripting (XSS)

&ensp; Bibliotecas de validação podem incluir ferramentas como **Joi**, **Zod** ou **express-validator**.

### HTTPS / TLS

&ensp; Todas as comunicações com a API devem ocorrer exclusivamente via **HTTPS**, garantindo criptografia dos dados em trânsito e proteção contra interceptação de informações sensíveis.

### CORS

&ensp; A API possui configuração de **Cross-Origin Resource Sharing (CORS)** para permitir requisições apenas de origens autorizadas.

**Exemplo de configuração:**

- domínio do painel administrativo
- serviços internos do bot

&ensp; Requisições de origens não autorizadas são bloqueadas.

### Logs e Monitoramento

&ensp; A API mantém registros de logs para fins de monitoramento e auditoria, incluindo:

- requisições realizadas
- erros de autenticação
- falhas de acesso a endpoints protegidos
- erros internos do servidor

&ensp; Esses logs auxiliam na identificação de falhas e possíveis tentativas de uso indevido da API.

### Dados Sensíveis

&ensp; A plataforma não armazena dados pessoais sensíveis dos produtores rurais. As interações realizadas pelo bot são utilizadas apenas para responder consultas sobre conteúdos técnicos.

&ensp; Logs de sistema podem armazenar dados de requisição de forma anonimizada para fins de diagnóstico e melhoria do serviço.

---

## 9. Conclusão

Faça um fechamento do documento resumindo o que foi especificado. Retome brevemente o papel central desta API no projeto, destacando como ela conecta o bot do WhatsApp, o banco de artigos e o modelo de IA para entregar valor ao produtor rural. Indique os próximos passos esperados após a aprovação desta especificação (ex: início do desenvolvimento, revisão com o time, validação com o cliente) e registre quaisquer decisões técnicas que ainda estejam em aberto e precisam ser definidas antes ou durante a implementação.

---

_Documento gerado para o projeto Guia Regenerativo — AgroTech Inteli + Agrominas Fertilizantes._
