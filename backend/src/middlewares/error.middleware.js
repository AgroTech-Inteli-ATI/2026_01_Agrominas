import { validationResult } from 'express-validator';

// Valida erros do express-validator antes de chegar no controller
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos.',
      details: errors.array().map((e) => ({ campo: e.path, mensagem: e.msg })),
    });
  }
  next();
};

// Handler global de erros — deve ser registrado por último no app
export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  // Erros conhecidos do Supabase
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Registro duplicado.' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referência inválida (chave estrangeira).' });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor.';

  res.status(status).json({ error: message });
};

// 404 para rotas não encontradas
export const notFound = (req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
};
