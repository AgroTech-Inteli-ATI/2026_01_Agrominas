import { supabase } from '../config/supabase.js';
import { gerarRespostaComOpenAI } from './openai.service.js';

const STOPWORDS = new Set([
  'a', 'ao', 'aos', 'as', 'com', 'como', 'da', 'das', 'de', 'do', 'dos', 'e', 'em',
  'eu', 'me', 'minha', 'meu', 'na', 'nas', 'no', 'nos', 'o', 'os', 'ou', 'para',
  'por', 'qual', 'quais', 'que', 'sobre', 'um', 'uma', 'usar', 'uso',
]);

const SELECT_ARTIGOS_RAG = `
  id, titulo, resumo, conteudo, autor, fonte, data_publicacao,
  artigos_categorias (categorias (id, nome)),
  artigos_insumos (insumos_regenerativos (id, nome, descricao, beneficios, modo_aplicacao)),
  metadados_artigos (*)
`;

export async function responderRAG(pergunta, opcoes = {}) {
  const limite = normalizarLimite(opcoes.limit);
  const candidatos = await buscarCandidatos();
  const ranqueados = ranquearArtigos(candidatos, pergunta).slice(0, limite);

  if (!ranqueados.length) {
    return {
      resposta: `Nao encontrei informacoes na base de conhecimento para responder sobre "${pergunta}". Tente informar o nome do insumo, cultura ou pratica agricola.`,
      modo: 'sem_contexto',
      modelo: null,
      fontes: [],
      contexto_usado: [],
    };
  }

  const contexto = montarContexto(ranqueados);
  const respostaIA = await gerarRespostaComOpenAI({ pergunta, contexto });

  return {
    resposta: respostaIA.texto || gerarRespostaFallback(pergunta, ranqueados),
    modo: respostaIA.modo,
    modelo: respostaIA.modelo,
    fontes: ranqueados.map(formatarFonte),
    contexto_usado: ranqueados.map((artigo) => ({
      id: artigo.id,
      titulo: artigo.titulo,
      score: artigo.score,
    })),
  };
}

/**
 * Retorna apenas a string de contexto formatada a partir da busca no banco.
 */
export async function obterContextoArtigos(pergunta, limite = 5) {
  const candidatos = await buscarCandidatos();
  const ranqueados = ranquearArtigos(candidatos, pergunta).slice(0, limite);
  
  return {
    texto: montarContexto(ranqueados),
    fontes: ranqueados.map(formatarFonte)
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
