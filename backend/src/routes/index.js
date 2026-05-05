import { Router } from 'express';
import { body, param, query } from 'express-validator';
import multer from 'multer';

import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/error.middleware.js';

import * as authCtrl from '../controllers/auth.controller.js';
import * as artigosCtrl from '../controllers/artigos.controller.js';
import * as categoriasCtrl from '../controllers/categorias.controller.js';
import * as insumosCtrl from '../controllers/insumos.controller.js';
import * as botCtrl from '../controllers/bot.controller.js';
import * as adminCtrl from '../controllers/admin.controller.js';

// Multer em memória — limite de 20 MB por arquivo, apenas PDFs
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são aceitos.'));
    }
  },
});

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

// Processa PDF e retorna metadados sugeridos (sem salvar no banco)
router.post(
  '/artigos/processar-pdf',
  authenticate,
  upload.single('arquivo'),
  artigosCtrl.processarPDF
);

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

// ─── VÍDEOS ─────────────────────────────────────────────────────────────────

router.post(
  '/videos/processar',
  authenticate,
  [body('url').isURL().withMessage('URL inválida.')],
  validateRequest,
  artigosCtrl.processarVideo
);

router.get(
  '/videos',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['publicado', 'arquivado']),
  ],
  validateRequest,
  artigosCtrl.listarVideos
);

router.get('/videos/:id', authenticate, artigosCtrl.obterVideo);

router.put(
  '/videos/:id',
  authenticate,
  [
    param('id').isUUID().withMessage('ID inválido.'),
    body('titulo').optional().isString().trim().isLength({ min: 3, max: 300 }),
    body('canal').optional().isString().trim().isLength({ max: 200 }),
    body('resumo').optional().isString(),
    body('status').optional().isIn(['publicado', 'arquivado']),
    body('url_youtube').optional().isURL().withMessage('URL inválida.'),
  ],
  validateRequest,
  artigosCtrl.atualizarVideo
);

router.delete('/videos/:id', authenticate, authorize('admin'), artigosCtrl.deletarVideo);

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

// RAG - recupera contexto do banco e gera resposta com OpenAI
router.post(
  '/bot/rag',
  [
    body('pergunta').optional().isString().trim().isLength({ min: 3 }),
    body('mensagem').optional().isString().trim().isLength({ min: 3 }),
    body('limit').optional().isInt({ min: 1, max: 10 }),
  ],
  validateRequest,
  botCtrl.responderPerguntaRAG
);

// Debug/validacao do RAG - mostra quais fontes seriam usadas
router.post(
  '/bot/contexto',
  [
    body('pergunta').optional().isString().trim().isLength({ min: 3 }),
    body('termo').optional().isString().trim().isLength({ min: 3 }),
    body('limit').optional().isInt({ min: 1, max: 10 }),
  ],
  validateRequest,
  botCtrl.recuperarContexto
);

router.post('/bot/pdf', upload.single('pdf'), botCtrl.receberPDF);

// Métricas — apenas admins
router.get('/bot/metricas', authenticate, authorize('admin'), botCtrl.obterMetricas);

// ─── ADMIN / GESTAO DO BOT ──────────────────────────────────────────────────

router.get(
  '/admin/perguntas',
  authenticate,
  authorize('admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('respondida_com_sucesso').optional().isIn(['true', 'false']),
    query('periodo_dias').optional().isInt({ min: 1, max: 365 }),
  ],
  validateRequest,
  adminCtrl.listarPerguntas
);

router.post(
  '/admin/perguntas',
  authenticate,
  authorize('admin'),
  [
    body('pergunta').isString().trim().isLength({ min: 3, max: 500 }),
    body('frequencia').optional().isInt({ min: 0 }),
    body('cultura').optional().isString().trim().isLength({ max: 120 }),
    body('regiao').optional().isString().trim().isLength({ max: 120 }),
    body('respondida_com_sucesso').optional().isBoolean(),
  ],
  validateRequest,
  adminCtrl.criarPergunta
);

router.put(
  '/admin/perguntas/:id',
  authenticate,
  authorize('admin'),
  [
    param('id').isUUID().withMessage('ID invalido.'),
    body('pergunta').optional().isString().trim().isLength({ min: 3, max: 500 }),
    body('frequencia').optional().isInt({ min: 0 }),
    body('cultura').optional().isString().trim().isLength({ max: 120 }),
    body('regiao').optional().isString().trim().isLength({ max: 120 }),
    body('respondida_com_sucesso').optional().isBoolean(),
  ],
  validateRequest,
  adminCtrl.atualizarPergunta
);

router.delete(
  '/admin/perguntas/:id',
  authenticate,
  authorize('admin'),
  [param('id').isUUID().withMessage('ID invalido.')],
  validateRequest,
  adminCtrl.deletarPergunta
);

router.get(
  '/admin/dashboard/perguntas',
  authenticate,
  authorize('admin'),
  [
    query('periodo_dias').optional().isIn(['7', '30', '90']),
    query('top').optional().isInt({ min: 3, max: 20 }),
  ],
  validateRequest,
  adminCtrl.obterDashboardPerguntas
);

router.get(
  '/admin/artigos/historico',
  authenticate,
  authorize('admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  adminCtrl.obterHistoricoArtigos
);

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

export default router;
