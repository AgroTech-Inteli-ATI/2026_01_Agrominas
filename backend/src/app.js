import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config';

import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';

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

// ─── ROTAS ────────────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ─── ERROS ────────────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
