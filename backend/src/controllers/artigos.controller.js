import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';
import { supabase } from '../config/supabase.js';
import { resumirTranscricao } from '../services/openai.service.js';

// ─── POLYFILLS exigidos pelo pdfjs-dist em Node.js ───────────────────────────
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      Object.assign(this, {
        a:1,b:0,c:0,d:1,e:0,f:0,
        m11:1,m12:0,m13:0,m14:0,m21:0,m22:1,m23:0,m24:0,
        m31:0,m32:0,m33:1,m34:0,m41:0,m42:0,m43:0,m44:1,
        is2D: true, isIdentity: true,
      });
    }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    inverse() { return this; }
    transformPoint(p) { return p; }
  };
}
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); }
  };
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {};
}

// Extrai texto de um Buffer PDF usando pdfjs-dist
async function extrairTextoPDF(buffer) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;

  let texto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const conteudo = await pagina.getTextContent();
    texto += conteudo.items.map((item) => item.str).join(' ') + '\n';
  }

  // Remove null bytes e caracteres de controle inválidos que o PostgreSQL rejeita.
  // pdfjs-dist em Node <20 pode incluir \x00 no texto extraído.
  return texto
    .replace(/\x00/g, '')                        // null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '') // outros controles (preserva \t \n \r)
    .trim();
}

// Heurísticas simples para extrair metadados do texto bruto do PDF
function extrairMetadados(texto, nomeArquivo) {
  const linhas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Título: primeira linha com 10–200 caracteres que não pareça número de página
  const titulo =
    linhas.find((l) => l.length >= 10 && l.length <= 200 && !/^\d+$/.test(l)) ||
    nomeArquivo.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');

  // Autor: linha que contenha padrões comuns de autoria
  const padroesAutor = /\b(autor[a]?|author|por|by|elaborad[ao] por)\b[:.]?\s*(.+)/i;
  let autor = null;
  for (const linha of linhas.slice(0, 30)) {
    const match = linha.match(padroesAutor);
    if (match) {
      autor = match[2].trim().slice(0, 120);
      break;
    }
  }

  // Fonte: linha que contenha padrões de origem/instituição
  const padroesFonte = /\b(fonte|source|publicad[ao] por|published by|embrapa|universidade|instituto|ministério|revista)\b/i;
  let fonte = null;
  for (const linha of linhas.slice(0, 40)) {
    if (padroesFonte.test(linha) && linha.length <= 150) {
      fonte = linha.slice(0, 150);
      break;
    }
  }

  // Resumo: parágrafo logo após "resumo" ou "abstract", até 600 chars
  let resumo = null;
  const idxResumo = linhas.findIndex((l) => /^(resumo|abstract)[\s.:]*$/i.test(l));
  if (idxResumo !== -1 && linhas[idxResumo + 1]) {
    resumo = linhas
      .slice(idxResumo + 1, idxResumo + 6)
      .join(' ')
      .slice(0, 600);
  }

  return { titulo, autor, fonte, resumo };
}

function extrairYoutubeId(url) {
  const match = String(url || '').match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i
  );
  if (!match) throw new Error(`URL inválida ou não reconhecida: "${url}"`);
  return match[1];
}

function normalizarUrlYoutube(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function limparTextoVideo(texto) {
  if (!texto) return '';
  return String(texto)
    .replace(/\x00/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
}

async function obterMetadadosVideo(videoId) {
  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const response = await fetch(oEmbedUrl);

  if (!response.ok) {
    return { titulo: `Vídeo ${videoId}`, canal: 'Desconhecido' };
  }

  const data = await response.json();
  return { titulo: data.title, canal: data.author_name };
}

async function obterTranscricaoVideo(videoId) {
  try {
    const segmentos = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'pt' });
    return segmentos.map((s) => s.text).join(' ');
  } catch {
    const segmentos = await YoutubeTranscript.fetchTranscript(videoId);
    return segmentos.map((s) => s.text).join(' ');
  }
}

// POST /artigos/processar-pdf  — recebe PDF, extrai texto e retorna metadados sugeridos
export const processarPDF = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Apenas arquivos PDF são aceitos.' });
    }

    let conteudo;
    try {
      conteudo = await extrairTextoPDF(req.file.buffer);
    } catch (e) {
      return res.status(422).json({ error: 'Não foi possível extrair texto do PDF. O arquivo pode estar corrompido ou protegido.' });
    }

    if (!conteudo) {
      return res.status(422).json({ error: 'O PDF não contém texto extraível (pode ser um PDF de imagem).' });
    }

    const metadados = extrairMetadados(conteudo, req.file.originalname);

    res.json({
      data: {
        titulo: metadados.titulo,
        resumo: metadados.resumo || null,
        autor: metadados.autor || null,
        fonte: metadados.fonte || null,
        conteudo,
        nome_arquivo: req.file.originalname,
      },
    });
  } catch (err) {
    next(err);
  }
};

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
        metadados_artigos (cultura, regiao, tipo_solo, nivel_evidencia, palavras_chave)
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
        a.metadados_artigos?.cultura?.toLowerCase().includes(cultura.toLowerCase())
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

// POST /videos/processar — processa URL do YouTube e salva no banco
export const processarVideo = async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL do YouTube é obrigatória.' });
    }

    let videoId;
    try {
      videoId = extrairYoutubeId(url);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const urlNormalizada = normalizarUrlYoutube(videoId);

    const { data: existente, error: existeError } = await supabase
      .from('videos')
      .select('id, titulo, url_youtube, youtube_id, canal, resumo, status, criado_em')
      .eq('youtube_id', videoId)
      .maybeSingle();

    if (existeError) return next(existeError);

    if (existente) {
      return res.json({
        data: existente,
        message: 'Vídeo já cadastrado.',
        meta: { existente: true },
      });
    }

    const metadados = await obterMetadadosVideo(videoId);

    let transcricao;
    try {
      transcricao = await obterTranscricaoVideo(videoId);
    } catch {
      return res.status(422).json({ error: 'Não foi possível obter a transcrição do vídeo.' });
    }

    transcricao = limparTextoVideo(transcricao);
    if (transcricao.length < 100) {
      return res.status(422).json({ error: 'Transcrição muito curta ou vazia.' });
    }

    const resumo = await resumirTranscricao(metadados.titulo, transcricao);

    const { data, error } = await supabase
      .from('videos')
      .insert({
        titulo: metadados.titulo,
        url_youtube: urlNormalizada,
        youtube_id: videoId,
        canal: metadados.canal,
        transcricao,
        resumo,
        status: 'publicado',
      })
      .select('id, titulo, url_youtube, youtube_id, canal, resumo, status, criado_em')
      .single();

    if (error) return next(error);

    res.status(201).json({ data, message: 'Vídeo processado com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// GET /videos — listagem com filtros, busca e paginação
export const listarVideos = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, busca } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('videos')
      .select('id, titulo, canal, resumo, url_youtube, status, criado_em', { count: 'exact' })
      .range(offset, offset + Number(limit) - 1)
      .order('criado_em', { ascending: false });

    if (status) query = query.eq('status', status);
    if (busca) {
      const termo = `%${busca}%`;
      query = query.or(`titulo.ilike.${termo},canal.ilike.${termo}`);
    }

    const { data, error, count } = await query;
    if (error) return next(error);

    res.json({
      data: data || [],
      meta: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /videos/:id — detalhe completo de um vídeo
export const obterVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Vídeo não encontrado.' });
    }

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// PUT /videos/:id — atualização de um vídeo
export const atualizarVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { titulo, canal, resumo, status, url_youtube } = req.body;

    const campos = {};
    if (titulo !== undefined) campos.titulo = titulo;
    if (canal !== undefined) campos.canal = canal;
    if (resumo !== undefined) campos.resumo = resumo;

    if (status !== undefined) {
      const statusValidos = ['publicado', 'arquivado'];
      if (!statusValidos.includes(status)) {
        return res.status(400).json({ error: `Status inválido. Use: ${statusValidos.join(', ')}.` });
      }
      campos.status = status;
    }

    if (url_youtube !== undefined) {
      let videoId;
      try {
        videoId = extrairYoutubeId(url_youtube);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
      campos.url_youtube = normalizarUrlYoutube(videoId);
      campos.youtube_id = videoId;
    }

    if (Object.keys(campos).length === 0) {
      return res.json({ message: 'Nenhuma alteração enviada.' });
    }

    const { data, error } = await supabase
      .from('videos')
      .update(campos)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return next(error);

    res.json({ data, message: 'Vídeo atualizado com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /videos/:id — exclusão
export const deletarVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (error) return next(error);

    res.json({ message: 'Vídeo removido com sucesso.' });
  } catch (err) {
    next(err);
  }
};
