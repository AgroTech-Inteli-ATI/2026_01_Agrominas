# Banco de Dados e Integração Front-Back


## 1. Adição dos Artigos no Banco de Dados

Os artigos técnicos que compõem a base de conhecimento do Guia Regenerativo foram inseridos manualmente na tabela `artigos` do Supabase.

### Processo de inserção

Os artigos foram extraídos de PDFs e inseridos com os seguintes campos principais:

| Campo        | Descrição                                                 |
|--------------|-----------------------------------------------------------|
| `titulo`     | Título do artigo                                          |
| `conteudo`   | Texto completo transcrito do PDF                          |
| `categoria`  | Categoria temática do conteúdo                            |
| `publicado`  | Status de publicação (`true` para disponível ao bot)      |

### Observação sobre a transcrição dos PDFs

O conteúdo transcrito de cada artigo em PDF foi armazenado integralmente na coluna `conteudo`, sem divisão em seções ou parágrafos separados.

Isso foi uma decisão intencional: cada PDF possui sua própria estrutura interna (sumários, tabelas, notas de rodapé, referências), o que torna impraticável criar um script genérico capaz de segmentar corretamente qualquer artigo de forma automática. Separar o conteúdo igualmente por script resultaria em cortes arbitrários que prejudicariam a qualidade das respostas do bot.

A abordagem adotada garante que o RAG tenha acesso ao conteúdo completo de cada artigo ao montar o contexto para as respostas.

---

## 2. Conexão Front-End e Back-End

O painel administrativo (frontend em Next.js) foi integrado à API REST (backend em Express.js), permitindo que as operações de CRUD de artigos realizadas na interface reflitam diretamente no banco de dados.

### Fluxo de comunicação

```text
Painel Administrativo (Next.js)
        |
        | HTTP (fetch / axios)
        v
API REST (Express.js) — /api/v1/artigos
        |
        v
Supabase (PostgreSQL)
```

### Operações integradas

| Operação         | Método HTTP | Endpoint                    |
|------------------|-------------|------------------------------|
| Listar artigos   | `GET`       | `/api/v1/artigos`            |
| Criar artigo     | `POST`      | `/api/v1/artigos`            |
| Editar artigo    | `PUT`       | `/api/v1/artigos/:id`        |
| Excluir artigo   | `DELETE`    | `/api/v1/artigos/:id`        |
| Publicar artigo  | `PATCH`     | `/api/v1/artigos/:id/status` |

### Autenticação

As rotas de escrita (criar, editar, excluir, publicar) são protegidas por JWT. O token é obtido no login do painel administrativo e enviado no cabeçalho `Authorization: Bearer <token>` em cada requisição.

