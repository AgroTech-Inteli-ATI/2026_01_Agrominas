import { supabase } from '../config/supabase.js';
import { gerarRespostaComOpenAI } from './openai.service.js';

const STOPWORDS = new Set([
  'a', 'ao', 'aos', 'as', 'com', 'como', 'da', 'das', 'de', 'do', 'dos', 'e', 'em',
  'eu', 'me', 'minha', 'meu', 'na', 'nas', 'no', 'nos', 'o', 'os', 'ou', 'para',
  'por', 'qual', 'quais', 'que', 'sobre', 'um', 'uma', 'usar', 'uso',
]);

// Lista mínima de termos ofensivos em pt-br para pré-validação rápida.
const PALAVROES = new Set([
  'merda', 'porra', 'caralho', 'puta', 'puto', 'foda', 'fodase', 'cu',
  'fdp', 'arrombado', 'arrombada', 'idiota', 'imbecil', 'otario', 'otaria',
  'babaca', 'lixo', 'viado', 'cuzao', 'desgracado', 'vagabundo',
]);

const FALLBACK_VAZIO = `Não consegui entender sua pergunta. 🤔

Tente escrever com um pouco mais de detalhe — pode ser o nome do insumo, da cultura ou da prática agrícola que você quer saber.

Ex.: "Como uso bokashi no milho?" ou "O que fazer com solo compactado?"`;

const FALLBACK_OFENSA = `Vamos manter a conversa tranquila por aqui? 🙏

Estou à disposição pra te ajudar com dúvidas sobre solo, lavoura, insumos e práticas regenerativas. É só mandar a pergunta de novo, com calma.`;

const FALLBACK_FORA_ESCOPO = `Hmm, essa pergunta foge um pouquinho do que eu sei responder. 🌱

Aqui eu te ajudo com agricultura regenerativa: solo, insumos, culturas, manejo e laudos. Tenta reformular trazendo o nome do insumo, da cultura ou da prática que você quer entender.`;

const SELECT_ARTIGOS_RAG = `
  id, titulo, resumo, conteudo, autor, fonte, data_publicacao,
  artigos_categorias (categorias (id, nome)),
  artigos_insumos (insumos_regenerativos (id, nome, descricao, beneficios, modo_aplicacao)),
  metadados_artigos (*)
`;

const SELECT_VIDEOS_RAG = `
  id, titulo, url_youtube, youtube_id, canal, transcricao, resumo
`;

export async function responderRAG(pergunta, opcoes = {}) {
  const validacao = validarEntrada(pergunta);
  if (!validacao.valido) {
    return {
      resposta: validacao.mensagem,
      modo: validacao.motivo,
      modelo: null,
      fontes: [],
      videos: [],
      contexto_usado: [],
    };
  }

  const limite = normalizarLimite(opcoes.limit);
  const [candidatos, candidatosVideos] = await Promise.all([
    buscarCandidatos(),
    buscarCandidatosVideos(),
  ]);
  const ranqueados = ranquearArtigos(candidatos, pergunta).slice(0, limite);
  const ranqueadosVideos = ranquearVideos(candidatosVideos, pergunta).slice(0, 3);

  if (!ranqueados.length && !ranqueadosVideos.length) {
    return {
      resposta: FALLBACK_FORA_ESCOPO,
      modo: 'sem_contexto',
      modelo: null,
      fontes: [],
      videos: [],
      contexto_usado: [],
    };
  }

  const contexto = montarContexto(ranqueados);
  const contextoVideos = montarContextoVideos(ranqueadosVideos);
  const respostaIA = await gerarRespostaComOpenAI({
    pergunta,
    contexto,
    contextoVideos,
  });

  const corpo = respostaIA.texto || gerarRespostaFallback(pergunta, ranqueados);
  const blocoReferencias = montarBlocoReferenciasABNT(ranqueados, ranqueadosVideos);

  return {
    resposta: blocoReferencias ? `${corpo}\n\n${blocoReferencias}` : corpo,
    modo: respostaIA.modo,
    modelo: respostaIA.modelo,
    fontes: ranqueados.map(formatarFonte),
    videos: ranqueadosVideos.map(formatarVideo),
    contexto_usado: ranqueados.map((artigo) => ({
      id: artigo.id,
      titulo: artigo.titulo,
      score: artigo.score,
    })),
  };
}

/**
 * Retorna apenas a string de contexto formatada a partir da busca no banco.
 * Usado pelo fluxo de PDF: devolve artigos + vídeos relevantes.
 */
export async function obterContextoArtigos(pergunta, limite = 5) {
  const [candidatos, candidatosVideos] = await Promise.all([
    buscarCandidatos(),
    buscarCandidatosVideos(),
  ]);
  const ranqueados = ranquearArtigos(candidatos, pergunta).slice(0, limite);
  const ranqueadosVideos = ranquearVideos(candidatosVideos, pergunta).slice(0, 3);

  return {
    texto: montarContexto(ranqueados),
    textoVideos: montarContextoVideos(ranqueadosVideos),
    fontes: ranqueados.map(formatarFonte),
    videos: ranqueadosVideos.map(formatarVideo),
    blocoReferencias: montarBlocoReferenciasABNT(ranqueados, ranqueadosVideos),
  };
}

export async function recuperarContextoRAG(pergunta, opcoes = {}) {
  const limite = normalizarLimite(opcoes.limit);
  const candidatos = await buscarCandidatos();
  const ranqueados = ranquearArtigos(candidatos, pergunta).slice(0, limite);

  return {
    total: ranqueados.length,
    contexto: ranqueados.map(formatarFonte),
  };
}

async function buscarCandidatos() {
  const { data, error } = await supabase
    .from('artigos')
    .select(SELECT_ARTIGOS_RAG)
    .eq('status', 'publicado')
    .limit(100);

  if (error) throw error;
  return data || [];
}

async function buscarCandidatosVideos() {
  const { data, error } = await supabase
    .from('videos')
    .select(SELECT_VIDEOS_RAG)
    .eq('status', 'publicado')
    .limit(100);

  if (error) {
    console.warn('[RAG] Falha ao buscar vídeos:', error.message);
    return [];
  }
  return data || [];
}

function ranquearArtigos(artigos, pergunta) {
  const perguntaNormalizada = normalizarTexto(pergunta);
  const termos = extrairTermos(pergunta);

  return artigos
    .map((artigo) => {
      const textoCompleto = normalizarTexto(montarTextoBusca(artigo));
      const titulo = normalizarTexto(artigo.titulo || '');
      const resumo = normalizarTexto(artigo.resumo || '');
      const conteudo = normalizarTexto(artigo.conteudo || '');

      let score = 0;
      if (perguntaNormalizada && titulo.includes(perguntaNormalizada)) score += 12;
      if (perguntaNormalizada && resumo.includes(perguntaNormalizada)) score += 8;
      if (perguntaNormalizada && conteudo.includes(perguntaNormalizada)) score += 6;

      for (const termo of termos) {
        if (titulo.includes(termo)) score += 5;
        if (resumo.includes(termo)) score += 3;
        if (conteudo.includes(termo)) score += 2;
        if (textoCompleto.includes(termo)) score += 1;
      }

      return { ...artigo, score };
    })
    .filter((artigo) => artigo.score > 0)
    .sort((a, b) => b.score - a.score);
}

function montarTextoBusca(artigo) {
  const categorias = artigo.artigos_categorias
    ?.map((item) => item.categorias?.nome)
    ?.filter(Boolean)
    ?.join(' ');

  const insumos = artigo.artigos_insumos
    ?.map((item) => {
      const insumo = item.insumos_regenerativos;
      return [
        insumo?.nome,
        insumo?.descricao,
        insumo?.beneficios,
        insumo?.modo_aplicacao,
      ].filter(Boolean).join(' ');
    })
    ?.filter(Boolean)
    ?.join(' ');

  const metadados = normalizarMetadados(artigo.metadados_artigos);

  return [
    artigo.titulo,
    artigo.resumo,
    artigo.conteudo,
    artigo.autor,
    artigo.fonte,
    categorias,
    insumos,
    metadados?.cultura_agricola,
    metadados?.regiao,
    metadados?.tipo_solo,
    metadados?.nivel_evidencia,
    Array.isArray(metadados?.palavras_chave)
      ? metadados.palavras_chave.join(' ')
      : metadados?.palavras_chave,
  ].filter(Boolean).join(' ');
}

function montarContexto(artigos) {
  return artigos.map((artigo, index) => {
    const metadados = normalizarMetadados(artigo.metadados_artigos);
    const categorias = artigo.artigos_categorias
      ?.map((item) => item.categorias?.nome)
      ?.filter(Boolean)
      ?.join(', ') || 'nao informado';
    const insumos = artigo.artigos_insumos
      ?.map((item) => item.insumos_regenerativos?.nome)
      ?.filter(Boolean)
      ?.join(', ') || 'nao informado';

    return [
      `Fonte ${index + 1}`,
      `ID: ${artigo.id}`,
      `Titulo: ${artigo.titulo}`,
      `Resumo: ${artigo.resumo || 'nao informado'}`,
      `Conteudo: ${limitarTexto(artigo.conteudo || '', 1600)}`,
      `Categorias: ${categorias}`,
      `Insumos: ${insumos}`,
      `Cultura: ${metadados?.cultura_agricola || 'nao informado'}`,
      `Regiao: ${metadados?.regiao || 'nao informado'}`,
      `Tipo de solo: ${metadados?.tipo_solo || 'nao informado'}`,
      `Nivel de evidencia: ${metadados?.nivel_evidencia || 'nao informado'}`,
      `Fonte externa: ${artigo.fonte || 'nao informado'}`,
    ].join('\n');
  }).join('\n\n---\n\n');
}

function gerarRespostaFallback(pergunta, artigos) {
  const lista = artigos.map((artigo, index) => {
    const resumo = artigo.resumo || limitarTexto(artigo.conteudo || '', 280);
    return `${index + 1}. ${artigo.titulo}: ${resumo || 'conteudo disponivel na base.'}`;
  }).join('\n');

  return [
    `Encontrei conteudos relacionados a "${pergunta}" na base de conhecimento:`,
    '',
    lista,
    '',
    'Configure OPENAI_API_KEY no backend para transformar esses trechos em uma resposta agronomica completa.',
  ].join('\n');
}

function formatarFonte(artigo) {
  const metadados = normalizarMetadados(artigo.metadados_artigos);

  return {
    id: artigo.id,
    titulo: artigo.titulo,
    resumo: artigo.resumo,
    fonte: artigo.fonte,
    autor: artigo.autor,
    data_publicacao: artigo.data_publicacao,
    score: artigo.score,
    categorias: artigo.artigos_categorias
      ?.map((item) => item.categorias?.nome)
      ?.filter(Boolean) || [],
    insumos: artigo.artigos_insumos
      ?.map((item) => item.insumos_regenerativos?.nome)
      ?.filter(Boolean) || [],
    metadados,
  };
}

function extrairTermos(texto) {
  return normalizarTexto(texto)
    .split(/\s+/)
    .map((termo) => termo.trim())
    .filter((termo) => termo.length >= 3 && !STOPWORDS.has(termo));
}

function normalizarTexto(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarMetadados(metadados) {
  if (Array.isArray(metadados)) return metadados[0] || {};
  return metadados || {};
}

function limitarTexto(texto, limite) {
  if (!texto || texto.length <= limite) return texto;
  return `${texto.slice(0, limite).trim()}...`;
}

function normalizarLimite(limit = 5) {
  const valor = Number(limit);
  if (Number.isNaN(valor)) return 5;
  return Math.min(Math.max(valor, 1), 10);
}

// ─── Vídeos ──────────────────────────────────────────────────────────────────

function ranquearVideos(videos, pergunta) {
  const perguntaNormalizada = normalizarTexto(pergunta);
  const termos = extrairTermos(pergunta);

  return videos
    .map((video) => {
      const titulo = normalizarTexto(video.titulo || '');
      const resumo = normalizarTexto(video.resumo || '');
      const transcricao = normalizarTexto(video.transcricao || '');
      const canal = normalizarTexto(video.canal || '');

      let score = 0;
      if (perguntaNormalizada && titulo.includes(perguntaNormalizada)) score += 10;
      if (perguntaNormalizada && resumo.includes(perguntaNormalizada)) score += 6;
      if (perguntaNormalizada && transcricao.includes(perguntaNormalizada)) score += 4;

      for (const termo of termos) {
        if (titulo.includes(termo)) score += 5;
        if (resumo.includes(termo)) score += 3;
        if (canal.includes(termo)) score += 2;
        if (transcricao.includes(termo)) score += 1;
      }

      return { ...video, score };
    })
    .filter((video) => video.score > 0)
    .sort((a, b) => b.score - a.score);
}

function montarContextoVideos(videos) {
  if (!videos.length) return '';
  return videos.map((video, index) => {
    return [
      `Video ${index + 1}`,
      `Titulo: ${video.titulo}`,
      `Canal: ${video.canal || 'nao informado'}`,
      `Resumo: ${video.resumo || 'nao informado'}`,
      `Trecho da transcricao: ${limitarTexto(video.transcricao || '', 800)}`,
      `URL: ${video.url_youtube}`,
    ].join('\n');
  }).join('\n\n---\n\n');
}

function formatarVideo(video) {
  return {
    id: video.id,
    titulo: video.titulo,
    canal: video.canal,
    url_youtube: video.url_youtube,
    youtube_id: video.youtube_id,
    resumo: video.resumo,
    score: video.score,
  };
}

// ─── Validação de entrada ────────────────────────────────────────────────────

function validarEntrada(pergunta) {
  const texto = String(pergunta || '').trim();

  if (!texto || texto.length < 3) {
    return { valido: false, motivo: 'entrada_vazia', mensagem: FALLBACK_VAZIO };
  }

  // Sem letras nem dígitos — só emoji, pontuação, símbolos.
  const semLetrasNemNumeros = !/[A-Za-zÀ-ÿ0-9]/.test(texto);
  if (semLetrasNemNumeros) {
    return { valido: false, motivo: 'entrada_vazia', mensagem: FALLBACK_VAZIO };
  }

  // Só números.
  if (/^\d+$/.test(texto)) {
    return { valido: false, motivo: 'entrada_vazia', mensagem: FALLBACK_VAZIO };
  }

  const termos = normalizarTexto(texto).split(/\s+/);
  const temOfensa = termos.some((termo) => PALAVROES.has(termo));
  if (temOfensa) {
    return { valido: false, motivo: 'entrada_ofensiva', mensagem: FALLBACK_OFENSA };
  }

  return { valido: true };
}

// ─── Bloco de referências ABNT ───────────────────────────────────────────────

function montarBlocoReferenciasABNT(artigos = [], videos = []) {
  if (!artigos.length && !videos.length) return '';

  const dataAcesso = formatarDataAcessoABNT(new Date());
  const linhas = ['📚 *Referências*'];

  if (artigos.length) {
    linhas.push('', '*Artigos*');
    artigos.forEach((artigo, index) => {
      linhas.push(`${index + 1}. ${formatarReferenciaArtigo(artigo, dataAcesso)}`);
    });
  }

  if (videos.length) {
    linhas.push('', '*Vídeos*');
    videos.forEach((video, index) => {
      linhas.push(`${index + 1}. ${formatarReferenciaVideo(video, dataAcesso)}`);
    });
  }

  return linhas.join('\n');
}

function formatarReferenciaArtigo(artigo, dataAcesso) {
  const autor = formatarAutorABNT(artigo.autor) || 'AGROMINAS';
  const titulo = artigo.titulo || 'Sem título';
  const fonte = artigo.fonte || 'Agrominas';
  const ano = extrairAno(artigo.data_publicacao) || '[s.d.]';
  return `${autor}. ${titulo}. ${fonte}, ${ano}. Acesso em: ${dataAcesso}.`;
}

function formatarReferenciaVideo(video, dataAcesso) {
  const canal = (video.canal || 'CANAL DESCONHECIDO').toUpperCase();
  const titulo = video.titulo || 'Sem título';
  const url = video.url_youtube || '';
  return `${canal}. ${titulo}. YouTube, [s.d.]. 1 vídeo. Disponível em: <${url}>. Acesso em: ${dataAcesso}.`;
}

function formatarAutorABNT(autor) {
  if (!autor) return '';
  const nome = String(autor).trim();
  if (!nome) return '';
  if (nome.includes(';')) {
    return nome.split(';').map((n) => formatarAutorABNT(n.trim())).filter(Boolean).join('; ');
  }
  const partes = nome.split(/\s+/);
  if (partes.length === 1) return partes[0].toUpperCase();
  const sobrenome = partes.pop().toUpperCase();
  return `${sobrenome}, ${partes.join(' ')}`;
}

function extrairAno(data) {
  if (!data) return null;
  const match = String(data).match(/\d{4}/);
  return match ? match[0] : null;
}

function formatarDataAcessoABNT(date) {
  const meses = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = meses[date.getMonth()];
  const ano = date.getFullYear();
  return `${dia} ${mes} ${ano}`;
}
