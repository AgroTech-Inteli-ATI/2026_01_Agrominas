import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';

// Obtém __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const origensPermitidas = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (ex: Postman, servidor a servidor)
      if (!origin || origensPermitidas.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS bloqueado para origem: ${origin}`));
      }
    },
    credentials: true,
  })
);

// ─── MIDDLEWARES GLOBAIS ──────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── ROTAS DA API ─────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ─── ARQUIVOS ESTÁTICOS (VIEWS) ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'views')));

// Rota raiz redireciona para o painel
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// SPA fallback - retorna index.html para rotas não encontradas (permite client-side routing)
app.get('*', (req, res, next) => {
  // Se for uma rota de API, continua para o handler de erro
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// ─── ERROS ────────────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
