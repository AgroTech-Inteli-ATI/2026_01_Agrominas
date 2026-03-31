import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

// Verifica token JWT e injeta usuário na requisição
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Valida se o usuário ainda existe e está ativo no banco
    const { data: user, error } = await supabase
      .from('usuarios_admin')
      .select('id, nome, email, perfil, ativo')
      .eq('id', decoded.id)
      .eq('ativo', true)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Usuário não encontrado ou desativado.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Faça login novamente.' });
    }
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

// Restringe acesso a perfis específicos
// Uso: authorize('admin') ou authorize('admin', 'editor')
export const authorize = (...perfis) => {
  return (req, res, next) => {
    if (!perfis.includes(req.user.perfil)) {
      return res.status(403).json({
        error: `Acesso negado. Requer perfil: ${perfis.join(' ou ')}.`,
      });
    }
    next();
  };
};
