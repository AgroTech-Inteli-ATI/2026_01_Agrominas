import { supabase } from '../config/supabase.js';

// GET /insumos
export const listarInsumos = async (req, res, next) => {
  try {
    const { busca } = req.query;

    let query = supabase
      .from('insumos_regenerativos')
      .select('id, nome, descricao, beneficios, modo_aplicacao, criado_em')
      .order('nome');

    if (busca) query = query.ilike('nome', `%${busca}%`);

    const { data, error } = await query;
    if (error) return next(error);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// GET /insumos/:id
export const obterInsumo = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('insumos_regenerativos')
      .select('*, artigos_insumos(artigos(id, titulo, status))')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Insumo não encontrado.' });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// POST /insumos
export const criarInsumo = async (req, res, next) => {
  try {
    const { nome, descricao, beneficios, modo_aplicacao } = req.body;

    const { data, error } = await supabase
      .from('insumos_regenerativos')
      .insert({ nome, descricao, beneficios, modo_aplicacao })
      .select()
      .single();

    if (error) return next(error);
    res.status(201).json({ data, message: 'Insumo criado com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// PUT /insumos/:id
export const atualizarInsumo = async (req, res, next) => {
  try {
    const { nome, descricao, beneficios, modo_aplicacao } = req.body;

    const { data, error } = await supabase
      .from('insumos_regenerativos')
      .update({ nome, descricao, beneficios, modo_aplicacao })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return next(error);
    res.json({ data, message: 'Insumo atualizado.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /insumos/:id
export const deletarInsumo = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('insumos_regenerativos')
      .delete()
      .eq('id', req.params.id);
    if (error) return next(error);
    res.json({ message: 'Insumo removido com sucesso.' });
  } catch (err) {
    next(err);
  }
};
