import { supabase } from '../config/supabase.js';

// GET /artigos  — listagem com filtros, busca e paginação
export const listarArtigos = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      categoria_id,
      insumo_id,
      busca,
      cultura,
      regiao,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('artigos')
      .select(
        `
        id, titulo, resumo, autor, fonte, data_publicacao, status, criado_em, atualizado_em,
        usuarios_admin:criado_por (id, nome),
        artigos_categorias (categorias (id, nome)),
        artigos_insumos (insumos_regenerativos (id, nome)),
        metadados_artigos (cultura_agricola, regiao, tipo_solo, nivel_evidencia, palavras_chave)
      `,
        { count: 'exact' }
      )
      .range(offset, offset + Number(limit) - 1)
      .order('criado_em', { ascending: false });

    // Filtros opcionais
    if (status) query = query.eq('status', status);
    if (busca) query = query.ilike('titulo', `%${busca}%`);

    const { data, error, count } = await query;
    if (error) return next(error);

    // Filtros de junção aplicados em memória (N:N não suporta .filter direto no Supabase)
    let resultado = data;
    if (categoria_id) {
      resultado = resultado.filter((a) =>
        a.artigos_categorias.some((ac) => ac.categorias?.id === categoria_id)
      );
    }
    if (insumo_id) {
      resultado = resultado.filter((a) =>
        a.artigos_insumos.some((ai) => ai.insumos_regenerativos?.id === insumo_id)
      );
    }
    if (cultura) {
      resultado = resultado.filter((a) =>
        a.metadados_artigos?.cultura_agricola?.toLowerCase().includes(cultura.toLowerCase())
      );
    }
    if (regiao) {
      resultado = resultado.filter((a) =>
        a.metadados_artigos?.regiao?.toLowerCase().includes(regiao.toLowerCase())
      );
    }

    res.json({
      data: resultado,
      meta: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /artigos/:id  — detalhe completo de um artigo
export const obterArtigo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('artigos')
      .select(
        `
        *,
        usuarios_admin:criado_por (id, nome),
        artigos_categorias (categorias (*)),
        artigos_insumos (insumos_regenerativos (*)),
        metadados_artigos (*)
      `
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Artigo não encontrado.' });
    }

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// POST /artigos  — criação com categorias, insumos e metadados
export const criarArtigo = async (req, res, next) => {
  try {
    const {
      titulo, resumo, conteudo, autor, fonte,
      data_publicacao, status = 'rascunho',
      categorias = [], insumos = [],
      metadados = {},
    } = req.body;

    // 1. Insere o artigo principal
    const { data: artigo, error } = await supabase
      .from('artigos')
      .insert({ titulo, resumo, conteudo, autor, fonte, data_publicacao, status, criado_por: req.user.id })
      .select()
      .single();

    if (error) return next(error);

    // 2. Associa categorias (N:N)
    if (categorias.length > 0) {
      const { error: catError } = await supabase
        .from('artigos_categorias')
        .insert(categorias.map((cat_id) => ({ artigo_id: artigo.id, categoria_id: cat_id })));
      if (catError) return next(catError);
    }

    // 3. Associa insumos (N:N)
    if (insumos.length > 0) {
      const { error: insError } = await supabase
        .from('artigos_insumos')
        .insert(insumos.map((insumo_id) => ({ artigo_id: artigo.id, insumo_id })));
      if (insError) return next(insError);
    }

    // 4. Insere metadados (1:1)
    if (Object.keys(metadados).length > 0) {
      const { error: metaError } = await supabase
        .from('metadados_artigos')
        .insert({ ...metadados, artigo_id: artigo.id });
      if (metaError) return next(metaError);
    }

    res.status(201).json({ data: artigo, message: 'Artigo criado com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// PUT /artigos/:id  — atualização completa
export const atualizarArtigo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      titulo, resumo, conteudo, autor, fonte,
      data_publicacao, status,
      categorias, insumos, metadados,
    } = req.body;

    // 1. Atualiza campos principais
    const campos = {};
    if (titulo !== undefined) campos.titulo = titulo;
    if (resumo !== undefined) campos.resumo = resumo;
    if (conteudo !== undefined) campos.conteudo = conteudo;
    if (autor !== undefined) campos.autor = autor;
    if (fonte !== undefined) campos.fonte = fonte;
    if (data_publicacao !== undefined) campos.data_publicacao = data_publicacao;
    if (status !== undefined) campos.status = status;

    if (Object.keys(campos).length > 0) {
      const { error } = await supabase.from('artigos').update(campos).eq('id', id);
      if (error) return next(error);
    }

    // 2. Recria associações de categorias se fornecidas
    if (Array.isArray(categorias)) {
      await supabase.from('artigos_categorias').delete().eq('artigo_id', id);
      if (categorias.length > 0) {
        await supabase.from('artigos_categorias').insert(
          categorias.map((cat_id) => ({ artigo_id: id, categoria_id: cat_id }))
        );
      }
    }

    // 3. Recria associações de insumos se fornecidas
    if (Array.isArray(insumos)) {
      await supabase.from('artigos_insumos').delete().eq('artigo_id', id);
      if (insumos.length > 0) {
        await supabase.from('artigos_insumos').insert(
          insumos.map((insumo_id) => ({ artigo_id: id, insumo_id }))
        );
      }
    }

    // 4. Upsert metadados se fornecidos
    if (metadados) {
      await supabase
        .from('metadados_artigos')
        .upsert({ ...metadados, artigo_id: id }, { onConflict: 'artigo_id' });
    }

    // Retorna artigo atualizado
    const { data } = await supabase.from('artigos').select('*').eq('id', id).single();
    res.json({ data, message: 'Artigo atualizado com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /artigos/:id  — exclusão (cascade apaga associações via FK)
export const deletarArtigo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('artigos').delete().eq('id', id);
    if (error) return next(error);

    res.json({ message: 'Artigo removido com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// PATCH /artigos/:id/status  — muda status (publicar, arquivar, etc.)
export const alterarStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const statusValidos = ['rascunho', 'publicado', 'arquivado'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ error: `Status inválido. Use: ${statusValidos.join(', ')}.` });
    }

    const { data, error } = await supabase
      .from('artigos')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) return next(error);
    res.json({ data, message: `Artigo marcado como "${status}".` });
  } catch (err) {
    next(err);
  }
};
