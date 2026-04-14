# Documentação Técnica — Backend Guia Regenerativo

**Projeto:** Guia Regenerativo  
**Empresa:** Agrominas Fertilizantes  
**Stack:** Node.js · Express.js · Supabase (PostgreSQL) · JWT

---

## Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Banco de Dados](#3-banco-de-dados)
4. [Autenticação e Autorização](#4-autenticação-e-autorização)
5. [Módulos e Controllers](#5-módulos-e-controllers)
6. [Rotas da API](#6-rotas-da-api)
7. [Middlewares](#7-middlewares)
8. [Configuração do Servidor](#8-configuração-do-servidor)
9. [Variáveis de Ambiente](#9-variáveis-de-ambiente)

---

## 1. Visão Geral da Arquitetura

O backend do Guia Regenerativo é uma API REST construída com **Express.js**, responsável por centralizar e disponibilizar o acervo técnico de insumos regenerativos da Agrominas. Ele serve como camada intermediária entre o banco de dados Supabase e os dois canais de consumo: o **painel administrativo** (interface web de curadoria de conteúdo) e o **bot do WhatsApp** (canal de consulta dos produtores rurais).

A arquitetura segue o padrão **MVC simplificado**:

- **Routes** — definem os endpoints e aplicam middlewares de validação e autenticação
- **Controllers** — contêm a lógica de negócio e orquestram as operações com o banco
- **Middlewares** — responsáveis por autenticação JWT, autorização por perfil e tratamento de erros
- **Config** — instancia e exporta o cliente Supabase utilizado por toda a aplicação

Toda comunicação com o banco de dados é feita via **SDK oficial do Supabase** (`@supabase/supabase-js`), utilizando a `service_role` key — o que garante acesso irrestrito às tabelas no contexto do servidor, sem depender das políticas RLS do Supabase.

---

## 2. Estrutura de Pastas

```
backend/                 
├── src/
│   ├── config/
│   │   └── supabase.js             # Instância do cliente Supabase
│   ├── controllers/
│   │   ├── auth.controller.js      # Login, registro e dados do usuário logado
│   │   ├── artigos.controller.js   # CRUD de artigos técnicos
│   │   ├── categorias.controller.js # CRUD de categorias
│   │   ├── insumos.controller.js   # CRUD de insumos regenerativos
│   │   └── bot.controller.js       # Integração com o bot do WhatsApp
│   ├── middlewares/
│   │   ├── auth.middleware.js      # Verificação JWT e autorização por perfil
│   │   └── error.middleware.js     # Validação de inputs e tratamento global de erros
│   ├── routes/
│   │   └── index.js                # Centralização de todas as rotas da API
│   ├── app.js                      # Configuração do Express (CORS, middlewares globais)
│   └── server.js                   # Entry point — inicializa o servidor
├── .env.example                    # Modelo de variáveis de ambiente
└── package.json
```

---

## 3. Banco de Dados

O banco de dados é relacional (PostgreSQL via Supabase) e foi projetado para armazenar o acervo técnico de forma estruturada, com suporte a categorização múltipla, vinculação de insumos e metadados para busca.

### 3.1 Entidades

#### `usuarios_admin`
Armazena os usuários com acesso ao painel administrativo. Cada usuário possui um perfil (`admin` ou `editor`) que determina quais operações ele pode realizar na plataforma.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Identificador único |
| `nome` | VARCHAR | Nome do usuário |
| `email` | VARCHAR | E-mail único, usado no login |
| `senha_hash` | TEXT | Senha criptografada com bcrypt |
| `perfil` | VARCHAR | `admin` ou `editor` |
| `ativo` | BOOLEAN | Controla se o usuário pode autenticar |
| `criado_em` | TIMESTAMPTZ | Data de criação |

#### `artigos`
Entidade central do sistema. Armazena o conteúdo técnico que compõe a biblioteca de insumos regenerativos — base de conhecimento consultada pelo painel e pelo bot.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Identificador único |
| `titulo` | VARCHAR | Título do artigo |
| `resumo` | TEXT | Descrição curta |
| `conteudo` | TEXT | Conteúdo completo |
| `autor` | VARCHAR | Autor do artigo |
| `fonte` | VARCHAR | Referência bibliográfica ou origem |
| `data_publicacao` | DATE | Data de publicação original |
| `status` | VARCHAR | `rascunho`, `publicado` ou `arquivado` |
| `criado_por` | UUID (FK) | Usuário que criou o artigo |

#### `categorias`
Classificação temática dos artigos. Exemplos: Manejo do Solo, Bioinsumos, Recuperação Ambiental. Um artigo pode pertencer a múltiplas categorias.

#### `insumos_regenerativos`
Cadastro dos insumos agrícolas regenerativos abordados pela plataforma. Inclui descrição, benefícios e modo de aplicação. Um artigo pode estar associado a múltiplos insumos.

#### `metadados_artigos`
Informações complementares vinculadas 1:1 a cada artigo. Enriquecem a busca e permitem filtragem por contexto agronômico.

| Campo | Descrição |
|---|---|
| `cultura_agricola` | Cultura a que o artigo se aplica (ex: soja, cana) |
| `regiao` | Região geográfica de relevância |
| `tipo_solo` | Tipo de solo abordado |
| `nivel_evidencia` | Grau de embasamento científico: `baixo`, `medio` ou `alto` |
| `palavras_chave` | Array de termos para busca |

### 3.2 Relacionamentos

| Relacionamento | Tipo | Tabela associativa |
|---|---|---|
| Usuário → Artigos | 1:N | — |
| Artigo ↔ Categorias | N:N | `artigos_categorias` |
| Artigo ↔ Insumos | N:N | `artigos_insumos` |
| Artigo → Metadados | 1:1 | `metadados_artigos` |

### 3.3 Recursos do banco

- **Triggers automáticos** atualizam o campo `atualizado_em` em artigos, insumos e usuários sempre que um registro é modificado
- **`ON DELETE CASCADE`** nas tabelas associativas garante que ao excluir um artigo, suas associações de categorias e insumos sejam removidas automaticamente
- **Índice full-text** em português no campo `titulo` dos artigos para futuras implementações de busca avançada
- **Seed inicial** com usuário admin, 5 categorias e 3 insumos de exemplo

---

## 4. Autenticação e Autorização

### 4.1 Autenticação por JWT

O sistema utiliza **JSON Web Tokens (JWT)** para autenticação stateless. O token é gerado no login e deve ser enviado em todas as requisições às rotas protegidas via header `Authorization`.

```
Authorization: Bearer <token>
```

O token contém o `id`, `email` e `perfil` do usuário e expira conforme a configuração da variável `JWT_EXPIRES_IN`.

A cada requisição autenticada, o middleware verifica o token e consulta o banco para confirmar que o usuário ainda existe e está ativo — impedindo que tokens de usuários desativados continuem funcionando mesmo dentro do prazo de validade.

### 4.2 Perfis de Acesso

Dois perfis controlam as permissões dentro da plataforma:

| Perfil | Permissões |
|---|---|
| `admin` | Acesso total: criar/editar/excluir artigos, categorias e insumos; criar novos usuários; visualizar métricas do bot |
| `editor` | Pode criar e editar artigos, categorias e insumos; não pode excluir registros nem criar usuários |

As senhas são armazenadas com hash **bcrypt** (fator 12), nunca em texto puro.

---

## 5. Módulos e Controllers

### 5.1 `auth.controller.js` — Autenticação

Gerencia o ciclo de vida dos usuários administrativos.

**`login`**  
Autentica um usuário pelo e-mail e senha. Verifica as credenciais contra o hash armazenado no banco e, em caso de sucesso, retorna um token JWT junto com os dados básicos do usuário (sem expor o hash da senha).

**`register`**  
Cria novos usuários administrativos. Exclusivo para administradores. Aplica hash bcrypt na senha antes de persistir no banco e permite definir o perfil (`admin` ou `editor`).

**`me`**  
Retorna os dados do usuário atualmente autenticado com base no token fornecido. Útil para que o front-end recupere o estado da sessão sem armazenar dados sensíveis localmente.

---

### 5.2 `artigos.controller.js` — Biblioteca de Artigos

Módulo central da plataforma. Gerencia todo o acervo técnico de conteúdo.

**`listarArtigos`**  
Lista os artigos com suporte a filtros combinados e paginação. Os filtros disponíveis são: status (`rascunho`, `publicado`, `arquivado`), categoria, insumo, cultura agrícola, região e busca por título. Retorna junto com cada artigo as categorias, insumos e metadados associados, além do nome do usuário criador.

**`obterArtigo`**  
Retorna o detalhe completo de um artigo específico, incluindo todos os seus relacionamentos: categorias, insumos e metadados.

**`criarArtigo`**  
Cria um novo artigo e, em uma operação composta, associa categorias (N:N), insumos (N:N) e insere os metadados (1:1). O usuário criador é registrado automaticamente com base no token de autenticação.

**`atualizarArtigo`**  
Atualiza os campos de um artigo e recria suas associações de categorias e insumos quando fornecidas. Os metadados são atualizados via `upsert`, permitindo tanto criar quanto sobrescrever valores existentes.

**`alterarStatus`**  
Endpoint dedicado para mudança de status (`rascunho` → `publicado` → `arquivado`). Separado da atualização geral para tornar a publicação e o arquivamento de artigos uma ação explícita e rastreável.

**`deletarArtigo`**  
Remove permanentemente um artigo e, por cascata, todas as suas associações de categorias e insumos. Exclusivo para administradores.

---

### 5.3 `categorias.controller.js` — Categorias

Gerencia as classificações temáticas que organizam o acervo.

**`listarCategorias`** — Retorna todas as categorias ordenadas alfabeticamente.

**`obterCategoria`** — Retorna uma categoria e os artigos a ela associados.

**`criarCategoria`** — Cria uma nova categoria com nome e descrição.

**`atualizarCategoria`** — Atualiza nome e/ou descrição de uma categoria existente.

**`deletarCategoria`** — Remove uma categoria. Exclusivo para administradores.

---

### 5.4 `insumos.controller.js` — Insumos Regenerativos

Gerencia o cadastro dos insumos agrícolas abordados na plataforma.

**`listarInsumos`** — Lista todos os insumos, com suporte a busca por nome.

**`obterInsumo`** — Retorna um insumo específico e os artigos a ele vinculados.

**`criarInsumo`** — Cadastra um novo insumo com nome, descrição, benefícios e modo de aplicação.

**`atualizarInsumo`** — Atualiza qualquer campo de um insumo existente.

**`deletarInsumo`** — Remove um insumo. Exclusivo para administradores.

---

### 5.5 `bot.controller.js` — Integração com o Bot do WhatsApp

Módulo de interface entre o backend e o canal de atendimento ao produtor rural via WhatsApp. Recebe as mensagens enviadas pelos produtores, interpreta a intenção e retorna respostas com base no acervo técnico da biblioteca.

**`receberMensagem`**  
Endpoint de entrada para as mensagens do WhatsApp. Analisa o texto recebido e identifica a intenção do produtor por palavras-chave, classificando em categorias como: saudação, pedido de ajuda, consulta de insumos, listagem de categorias ou busca livre. Com base na intenção identificada, busca no banco as informações mais relevantes e retorna uma resposta formatada para o WhatsApp, incluindo título e resumo dos artigos encontrados.

**`buscarArtigos`**  
Endpoint de busca direta de artigos para uso interno do bot. Aceita combinações de critérios — termo de busca, categoria, insumo e cultura — e retorna uma lista simplificada de artigos publicados, formatada para facilitar a montagem de respostas pelo bot.

**`obterMetricas`**  
Retorna dados de uso da plataforma consolidados para o painel administrativo. Inclui contagem de artigos publicados, insumos cadastrados e categorias ativas.

---

## 6. Rotas da API

Todas as rotas são prefixadas com `/api/v1`.

### Autenticação

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/login` | Público | Autenticar usuário e obter token JWT |
| POST | `/auth/register` | Admin | Criar novo usuário administrativo |
| GET | `/auth/me` | Autenticado | Dados do usuário da sessão atual |

### Artigos

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/artigos` | Autenticado | Listar artigos com filtros e paginação |
| GET | `/artigos/:id` | Autenticado | Detalhe de um artigo |
| POST | `/artigos` | Autenticado | Criar artigo com categorias, insumos e metadados |
| PUT | `/artigos/:id` | Autenticado | Atualizar artigo |
| PATCH | `/artigos/:id/status` | Autenticado | Alterar status do artigo |
| DELETE | `/artigos/:id` | Admin | Excluir artigo |

**Parâmetros de filtro disponíveis no `GET /artigos`:**

| Parâmetro | Descrição |
|---|---|
| `page` | Página (padrão: 1) |
| `limit` | Itens por página (padrão: 10, máx: 100) |
| `status` | `rascunho`, `publicado` ou `arquivado` |
| `busca` | Busca por título |
| `categoria_id` | Filtrar por categoria |
| `insumo_id` | Filtrar por insumo |
| `cultura` | Filtrar por cultura agrícola |
| `regiao` | Filtrar por região |

### Categorias

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/categorias` | Autenticado | Listar todas as categorias |
| GET | `/categorias/:id` | Autenticado | Detalhe com artigos vinculados |
| POST | `/categorias` | Autenticado | Criar categoria |
| PUT | `/categorias/:id` | Autenticado | Atualizar categoria |
| DELETE | `/categorias/:id` | Admin | Excluir categoria |

### Insumos Regenerativos

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/insumos` | Autenticado | Listar insumos (com busca por nome) |
| GET | `/insumos/:id` | Autenticado | Detalhe com artigos vinculados |
| POST | `/insumos` | Autenticado | Cadastrar insumo |
| PUT | `/insumos/:id` | Autenticado | Atualizar insumo |
| DELETE | `/insumos/:id` | Admin | Excluir insumo |

### Bot WhatsApp

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/bot/webhook` | Público | Receber e processar mensagem do WhatsApp |
| POST | `/bot/buscar` | Público | Busca de artigos para o bot |
| GET | `/bot/metricas` | Admin | Métricas de uso da plataforma |

### Utilitário

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Verificação de saúde do servidor |

---

## 7. Middlewares

### `auth.middleware.js`

**`authenticate`**  
Middleware aplicado em todas as rotas protegidas. Extrai o token JWT do header `Authorization`, valida a assinatura e a validade, e consulta o banco para confirmar que o usuário ainda existe e está ativo. Se válido, injeta o objeto do usuário em `req.user` para uso nos controllers. Retorna `401` em caso de token ausente, inválido ou expirado.

**`authorize(...perfis)`**  
Middleware de autorização por perfil aplicado após `authenticate`. Recebe um ou mais perfis como argumento e bloqueia o acesso com `403` caso o perfil do usuário autenticado não esteja na lista permitida. Exemplo: `authorize('admin')` restringe o endpoint apenas a administradores.

---

### `error.middleware.js`

**`validateRequest`**  
Aplicado após as validações do `express-validator` nas rotas. Coleta todos os erros de validação do corpo, parâmetros e query string da requisição e retorna `400` com a lista de campos inválidos e mensagens descritivas, impedindo que a requisição alcance o controller.

**`errorHandler`**  
Handler global de erros registrado no final da cadeia de middlewares do Express. Trata erros conhecidos do banco de dados (como violação de unicidade e chave estrangeira inválida) com mensagens adequadas e padronizadas. Todos os outros erros retornam `500` com a mensagem original, garantindo que nenhum erro não tratado quebre silenciosamente a aplicação.

**`notFound`**  
Middleware final para rotas não encontradas. Retorna `404` com a indicação do método e caminho que não corresponde a nenhuma rota registrada.

---

## 8. Configuração do Servidor

### `app.js`

Configura a instância do Express com todos os middlewares globais:

- **CORS** com lista de origens permitidas configurável via variável de ambiente, aceitando requisições sem origin (Postman, chamadas servidor a servidor)
- **Body parser** JSON com limite de 10MB, compatível com artigos com conteúdo extenso
- **Morgan** para log de requisições no formato `dev` em desenvolvimento e `combined` em produção

### `server.js`

Entry point da aplicação. Antes de iniciar o servidor, testa a conexão com o Supabase para garantir que o banco está acessível. Caso a conexão falhe, o processo é encerrado com código de erro. Em caso de sucesso, sobe o servidor na porta configurada e exibe no console todas as rotas disponíveis.

---

## 9. Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|---|---|---|
| `PORT` | Porta do servidor (padrão: 3000) | Não |
| `NODE_ENV` | Ambiente: `development` ou `production` | Não |
| `SUPABASE_URL` | URL do projeto Supabase | **Sim** |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço do Supabase (acesso total ao banco) | **Sim** |
| `SUPABASE_ANON_KEY` | Chave anônima do Supabase | Não |
| `JWT_SECRET` | Segredo para assinatura dos tokens JWT | **Sim** |
| `JWT_EXPIRES_IN` | Tempo de expiração do token (ex: `7d`, `24h`) | **Sim** |
| `ALLOWED_ORIGINS` | Origens permitidas pelo CORS, separadas por vírgula | Não |

> **Atenção:** A `SUPABASE_SERVICE_ROLE_KEY` concede acesso irrestrito ao banco e nunca deve ser exposta no front-end ou em repositórios públicos.

