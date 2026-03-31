import { supabase } from '../config/supabase.js';

// GET /categorias
export const listarCategorias = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('id, nome, descricao, criado_em')
      .order('nome');

    if (error) return next(error);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// GET /categorias/:id
export const obterCategoria = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*, artigos_categorias(artigos(id, titulo, status))')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Categoria não encontrada.' });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// POST /categorias
export const criarCategoria = async (req, res, next) => {
  try {
    const { nome, descricao } = req.body;

    const { data, error } = await supabase
      .from('categorias')
      .insert({ nome, descricao })
      .select()
      .single();

    if (error) return next(error);
    res.status(201).json({ data, message: 'Categoria criada com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// PUT /categorias/:id
export const atualizarCategoria = async (req, res, next) => {
  try {
    const { nome, descricao } = req.body;

    const { data, error } = await supabase
      .from('categorias')
      .update({ nome, descricao })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return next(error);
    res.json({ data, message: 'Categoria atualizada.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /categorias/:id
export const deletarCategoria = async (req, res, next) => {
  try {
    const { error } = await supabase.from('categorias').delete().eq('id', req.params.id);
    if (error) return next(error);
    res.json({ message: 'Categoria removida com sucesso.' });
  } catch (err) {
    next(err);
  }
};
