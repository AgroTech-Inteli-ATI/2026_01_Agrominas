import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, perfil: user.perfil },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /auth/login
export const login = async (req, res, next) => {
  try {
    const { email, senha } = req.body;

    const { data: user, error } = await supabase
      .from('usuarios_admin')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('ativo', true)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = generateToken(user);

    res.json({
      token,
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /auth/register  — apenas admins podem criar novos usuários
export const register = async (req, res, next) => {
  try {
    const { nome, email, senha, perfil = 'editor' } = req.body;

    const senhaHash = await bcrypt.hash(senha, 12);

    const { data: novoUsuario, error } = await supabase
      .from('usuarios_admin')
      .insert({ nome, email: email.toLowerCase().trim(), senha_hash: senhaHash, perfil })
      .select('id, nome, email, perfil, ativo, criado_em')
      .single();

    if (error) return next(error);

    res.status(201).json({ usuario: novoUsuario });
  } catch (err) {
    next(err);
  }
};

// GET /auth/me  — retorna dados do usuário logado
export const me = async (req, res) => {
  const { senha_hash, ...usuario } = req.user; // nunca retorna o hash
  res.json({ usuario: req.user });
};
