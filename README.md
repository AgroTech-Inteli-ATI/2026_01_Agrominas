# Guia Regenerativo — Agrominas

Projeto desenvolvido pela **AgroTech Inteli** em parceria com a **Agrominas**. A solução é composta por uma **biblioteca de insumos agrícolas** e um **bot de assistência via WhatsApp** voltado para produtores rurais.

O sistema permite que produtores consultem artigos e insumos sobre agricultura regenerativa diretamente pelo WhatsApp, com respostas geradas por IA (RAG com OpenAI). O backend gerencia o conteúdo via API REST e integra a Evolution API para o canal de mensagens.

---

## Estrutura do projeto

```
.
├── backend/      # API REST (Node.js + Express)
├── docs/         # Documentação (Docusaurus)
├── docker-compose.yml
└── .env
```

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) >= 20
- [Docker](https://www.docker.com/) e Docker Compose
- Conta no [Supabase](https://supabase.com/) (banco de dados)
- Chave de API da [OpenAI](https://platform.openai.com/)

---

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Servidor
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# IA
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
OPENAI_MAX_OUTPUT_TOKENS=900

# --- CONFIGURAÇÃO EVOLUTION API V2 ---
EVOLUTION_URL=http://localhost:8081
EVOLUTION_INSTANCE=agrominas
EVOLUTION_API_KEY=

# Banco de Dados (Postgres)
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:evolution123@postgres:5432/evolution?sslmode=disable
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true

# Cache (Redis)
REDIS_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6379

# Webhook Global
WEBHOOK_GLOBAL_ENABLED=true
WEBHOOK_GLOBAL_URL=http://host.docker.internal:3000/api/v1/bot/webhook

```

---

## Rodando a aplicação

### Via Docker (recomendado)

Sobe todos os serviços (Postgres, Redis, Evolution API e backend):

```bash
docker-compose up --build
```

O backend ficará disponível em `http://localhost:3000`.
A Evolution API ficará disponível em `http://localhost:8081`.

---

### Backend local (sem Docker)

Instale as dependências:

```bash
cd backend
npm install
```

Inicie em modo desenvolvimento:

```bash
npm run dev
```

Ou em modo produção:

```bash
npm start
```

Para configurar a instância do WhatsApp após subir os containers:

```bash
npm run whatsapp:setup
```

---

## Rodando a documentação (Docusaurus)

Instale as dependências:

```bash
cd docs
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm start
```

A documentação ficará disponível em `http://localhost:3001`.

Para gerar o build estático:

```bash
npm run build
```

Para servir o build gerado:

```bash
npm run serve
```
