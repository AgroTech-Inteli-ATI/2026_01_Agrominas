import { Router } from 'express';
import { body, param, query } from 'express-validator';

import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/error.middleware.js';

import * as authCtrl from '../controllers/auth.controller.js';
import * as artigosCtrl from '../controllers/artigos.controller.js';
import * as categoriasCtrl from '../controllers/categorias.controller.js';
import * as insumosCtrl from '../controllers/insumos.controller.js';
import * as botCtrl from '../controllers/bot.controller.js';

const router = Router();

// ─── AUTH ────────────────────────────────────────────────────────────────────

router.post(
  '/auth/login',
  [
    body('email').isEmail().withMessage('E-mail inválido.'),
    body('senha').notEmpty().withMessage('Senha obrigatória.'),
  ],
  validateRequest,
  authCtrl.login
);

router.post(
  '/auth/register',
  authenticate,
  authorize('admin'),
  [
    body('nome').notEmpty().withMessage('Nome obrigatório.'),
    body('email').isEmail().withMessage('E-mail inválido.'),
    body('senha').isLength({ min: 8 }).withMessage('Senha deve ter ao menos 8 caracteres.'),
    body('perfil').optional().isIn(['admin', 'editor']).withMessage('Perfil inválido.'),
  ],
  validateRequest,
  authCtrl.register
);

router.get('/auth/me', authenticate, authCtrl.me);

// ─── ARTIGOS ─────────────────────────────────────────────────────────────────

router.get(
  '/artigos',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['rascunho', 'publicado', 'arquivado']),
  ],
  validateRequest,
  artigosCtrl.listarArtigos
);

router.get('/artigos/:id', authenticate, artigosCtrl.obterArtigo);

router.post(
  '/artigos',
  authenticate,
  [
    body('titulo').notEmpty().withMessage('Título obrigatório.'),
    body('status').optional().isIn(['rascunho', 'publicado', 'arquivado']),
    body('categorias').optional().isArray(),
    body('insumos').optional().isArray(),
  ],
  validateRequest,
  artigosCtrl.criarArtigo
);

router.put('/artigos/:id', authenticate, artigosCtrl.atualizarArtigo);

router.patch(
  '/artigos/:id/status',
  authenticate,
  [body('status').isIn(['rascunho', 'publicado', 'arquivado']).withMessage('Status inválido.')],
  validateRequest,
  artigosCtrl.alterarStatus
);

router.delete('/artigos/:id', authenticate, authorize('admin'), artigosCtrl.deletarArtigo);

// ─── CATEGORIAS ──────────────────────────────────────────────────────────────

router.get('/categorias', authenticate, categoriasCtrl.listarCategorias);
router.get('/categorias/:id', authenticate, categoriasCtrl.obterCategoria);

router.post(
  '/categorias',
  authenticate,
  [body('nome').notEmpty().withMessage('Nome obrigatório.')],
  validateRequest,
  categoriasCtrl.criarCategoria
);

router.put('/categorias/:id', authenticate, categoriasCtrl.atualizarCategoria);
router.delete('/categorias/:id', authenticate, authorize('admin'), categoriasCtrl.deletarCategoria);

// ─── INSUMOS REGENERATIVOS ───────────────────────────────────────────────────

router.get('/insumos', authenticate, insumosCtrl.listarInsumos);
router.get('/insumos/:id', authenticate, insumosCtrl.obterInsumo);

router.post(
  '/insumos',
  authenticate,
  [body('nome').notEmpty().withMessage('Nome obrigatório.')],
  validateRequest,
  insumosCtrl.criarInsumo
);

router.put('/insumos/:id', authenticate, insumosCtrl.atualizarInsumo);
router.delete('/insumos/:id', authenticate, authorize('admin'), insumosCtrl.deletarInsumo);

// ─── BOT WHATSAPP ────────────────────────────────────────────────────────────

// Webhook público — sem autenticação (WhatsApp vai chamar esse endpoint)
router.post('/bot/webhook', botCtrl.receberMensagem);

// Busca de artigos para o bot — sem auth para facilitar integração
router.post('/bot/buscar', botCtrl.buscarArtigos);

// Métricas — apenas admins
router.get('/bot/metricas', authenticate, authorize('admin'), botCtrl.obterMetricas);

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

export default router;
