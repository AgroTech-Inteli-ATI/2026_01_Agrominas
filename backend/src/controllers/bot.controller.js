import { supabase } from '../config/supabase.js';

// Palavras-chave mapeadas para filtros — base para evolução futura com NLP/IA
const INTENCOES = {
  saudacao: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hello'],
  ajuda: ['ajuda', 'help', 'menu', 'opções', 'opcoes', 'o que você faz', 'o que voce faz'],
  artigos: ['artigo', 'artigos', 'conteúdo', 'conteudo', 'biblioteca', 'pesquisar', 'buscar'],
  insumos: ['insumo', 'insumos', 'produto', 'fertilizante', 'bioinsumo'],
  categorias: ['categoria', 'categorias', 'tema', 'assunto'],
};

const detectarIntencao = (texto) => {
  const lower = texto.toLowerCase();
  for (const [intencao, palavras] of Object.entries(INTENCOES)) {
    if (palavras.some((p) => lower.includes(p))) return intencao;
  }
  return 'busca_livre';
};

// POST /bot/webhook  — entrada de mensagens do WhatsApp (mock por ora)
export const receberMensagem = async (req, res, next) => {
  try {
    // Normaliza payload — adaptar conforme Twilio ou Meta Cloud API futuramente
    const { mensagem, telefone, plataforma = 'mock' } = req.body;

    if (!mensagem) {
      return res.status(400).json({ error: 'Campo "mensagem" é obrigatório.' });
    }

    const intencao = detectarIntencao(mensagem);
    let resposta;

    switch (intencao) {
      case 'saudacao':
        resposta = await respostaSaudacao();
        break;
      case 'ajuda':
        resposta = respostaMenu();
        break;
      case 'insumos':
        resposta = await respostaInsumos(mensagem);
        break;
      case 'categorias':
        resposta = await respostaCategorias();
        break;
      case 'artigos':
      case 'busca_livre':
      default:
        resposta = await buscarConteudo(mensagem);
    }

    // Log mock — substituir por persistência quando implementar histórico
    console.log(`[BOT] ${plataforma} | ${telefone || 'anon'} | "${mensagem}" → ${intencao}`);

    res.json({
      resposta,
      intencao,
      plataforma,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// POST /bot/buscar  — busca direta de artigos para o bot
export const buscarArtigos = async (req, res, next) => {
  try {
    const { termo, categoria_id, insumo_id, cultura, limit = 5 } = req.body;

    if (!termo && !categoria_id && !insumo_id) {
      return res.status(400).json({ error: 'Informe ao menos um critério de busca.' });
    }

    let query = supabase
      .from('artigos')
      .select(
        `
        id, titulo, resumo, fonte,
        artigos_categorias (categorias (id, nome)),
        artigos_insumos (insumos_regenerativos (id, nome)),
        metadados_artigos (cultura_agricola, nivel_evidencia, palavras_chave)
      `
      )
      .eq('status', 'publicado')
      .limit(Number(limit));

    if (termo) query = query.ilike('titulo', `%${termo}%`);

    const { data, error } = await query;
    if (error) return next(error);

    // Filtra por insumo/categoria/cultura em memória (N:N)
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

    // Formata resposta simplificada para o bot
    const artigosFormatados = resultado.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      resumo: a.resumo,
      fonte: a.fonte,
      categorias: a.artigos_categorias.map((ac) => ac.categorias?.nome).filter(Boolean),
      insumos: a.artigos_insumos.map((ai) => ai.insumos_regenerativos?.nome).filter(Boolean),
    }));

    res.json({
      total: artigosFormatados.length,
      artigos: artigosFormatados,
    });
  } catch (err) {
    next(err);
  }
};

// GET /bot/metricas  — métricas básicas de uso (mock + dados reais de artigos)
export const obterMetricas = async (req, res, next) => {
  try {
    const [{ count: totalArtigos }, { count: totalInsumos }, { count: totalCategorias }] =
      await Promise.all([
        supabase.from('artigos').select('*', { count: 'exact', head: true }).eq('status', 'publicado'),
        supabase.from('insumos_regenerativos').select('*', { count: 'exact', head: true }),
        supabase.from('categorias').select('*', { count: 'exact', head: true }),
      ]);

    res.json({
      biblioteca: {
        artigos_publicados: totalArtigos,
        insumos_cadastrados: totalInsumos,
        categorias: totalCategorias,
      },
      // Mock do bot — substituir por dados reais quando tiver histórico
      bot_mock: {
        conversas_ativas: 42,
        consultas_completas: 137,
        artigos_mais_consultados: [
          { titulo: 'Uso de bokashi no manejo do solo', consultas: 28 },
          { titulo: 'Biofertilizantes líquidos: resultados em cana', consultas: 21 },
          { titulo: 'Compostagem aeróbica em pequenas propriedades', consultas: 15 },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Helpers internos ────────────────────────────────────────────────────────

async function respostaSaudacao() {
  const { count } = await supabase
    .from('artigos')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'publicado');

  return `Olá! 👋 Sou o assistente do Guia Regenerativo da Agrominas.\n\nTemos ${count || 0} artigos técnicos sobre insumos regenerativos.\n\nDigite o nome de um insumo, cultura ou prática agrícola para começar!`;
}

function respostaMenu() {
  return `📚 *O que posso fazer por você:*\n\n• Buscar artigos técnicos\n• Consultar insumos regenerativos\n• Ver categorias disponíveis\n\nExemplo: "como usar bokashi" ou "insumos para soja"`;
}

async function respostaInsumos(mensagem) {
  const { data } = await supabase
    .from('insumos_regenerativos')
    .select('nome, descricao')
    .limit(5)
    .order('nome');

  if (!data?.length) return 'Nenhum insumo cadastrado ainda.';

  const lista = data.map((i) => `• *${i.nome}*: ${i.descricao || '—'}`).join('\n');
  return `🌱 *Insumos Regenerativos disponíveis:*\n\n${lista}\n\nDigite o nome de um insumo para ver artigos relacionados.`;
}

async function respostaCategorias() {
  const { data } = await supabase.from('categorias').select('nome').order('nome');
  if (!data?.length) return 'Nenhuma categoria cadastrada ainda.';

  const lista = data.map((c) => `• ${c.nome}`).join('\n');
  return `📂 *Categorias disponíveis:*\n\n${lista}`;
}

async function buscarConteudo(termo) {
  const { data } = await supabase
    .from('artigos')
    .select('titulo, resumo')
    .eq('status', 'publicado')
    .ilike('titulo', `%${termo}%`)
    .limit(3);

  if (!data?.length) {
    return `Não encontrei artigos sobre "${termo}". Tente outros termos como: solo, bokashi, compostagem, biofertilizante.`;
  }

  const lista = data.map((a) => `📄 *${a.titulo}*\n${a.resumo || ''}`).join('\n\n');
  return `Encontrei ${data.length} resultado(s):\n\n${lista}`;
}
