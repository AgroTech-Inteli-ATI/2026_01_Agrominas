import { supabase } from '../config/supabase.js';

const PERIODOS_PERMITIDOS = new Set([7, 30, 90]);

function normalizarPeriodoDias(valor) {
  const numero = Number(valor || 30);
  if (!PERIODOS_PERMITIDOS.has(numero)) return 30;
  return numero;
}

function normalizarPaginacao(page, limit) {
  const pagina = Math.max(Number(page) || 1, 1);
  const tamanho = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const offset = (pagina - 1) * tamanho;

  return { pagina, tamanho, offset };
}

function paraBoolean(valor) {
  if (valor === true || valor === false) return valor;
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  return undefined;
}

function normalizarBoolean(valor, fallback = true) {
  const convertido = paraBoolean(valor);
  return convertido === undefined ? fallback : convertido;
}

function sanitizarTexto(valor) {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto.length > 0 ? texto : null;
}

function sanitizarFrequencia(valor, fallback = 1) {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return fallback;
  return Math.max(Math.round(numero), 0);
}

function calcularTaxa(parte, total) {
  if (!total) return 0;
  return Number(((parte / total) * 100).toFixed(2));
}

function construirDashboardMock(periodoDias) {
  return {
    periodo_dias: periodoDias,
    resumo: {
      total_interacoes: 186,
      perguntas_distintas: 24,
      regioes_ativas: 6,
      taxa_sucesso: 84.95,
      respostas_sucesso: 158,
      respostas_falha: 28,
    },
    top_perguntas: [
      {
        pergunta: 'Qual a melhor forma de usar bokashi no inicio da safra?',
        frequencia_total: 42,
        taxa_sucesso: 90.48,
        regioes: ['Sul', 'Sudeste'],
        culturas: ['Soja', 'Milho'],
      },
      {
        pergunta: 'Como corrigir acidez em solo argiloso?',
        frequencia_total: 35,
        taxa_sucesso: 82.86,
        regioes: ['Centro-Oeste', 'Sudeste'],
        culturas: ['Milho'],
      },
      {
        pergunta: 'Quando aplicar biofertilizante em cana?',
        frequencia_total: 28,
        taxa_sucesso: 78.57,
        regioes: ['Nordeste', 'Sudeste'],
        culturas: ['Cana'],
      },
    ],
    uso_por_regiao: [
      { regiao: 'Sudeste', frequencia_total: 58, perguntas_distintas: 11, taxa_sucesso: 87.93 },
      { regiao: 'Sul', frequencia_total: 37, perguntas_distintas: 8, taxa_sucesso: 89.19 },
      { regiao: 'Centro-Oeste', frequencia_total: 34, perguntas_distintas: 7, taxa_sucesso: 82.35 },
      { regiao: 'Nordeste', frequencia_total: 25, perguntas_distintas: 6, taxa_sucesso: 72.0 },
      { regiao: 'Norte', frequencia_total: 18, perguntas_distintas: 4, taxa_sucesso: 77.78 },
      { regiao: 'Nao informado', frequencia_total: 14, perguntas_distintas: 3, taxa_sucesso: 78.57 },
    ],
    perguntas_por_regiao: {
      regioes: ['Sudeste', 'Sul', 'Centro-Oeste', 'Nordeste', 'Norte', 'Nao informado'],
      series: [
        {
          pergunta: 'Qual a melhor forma de usar bokashi no inicio da safra?',
          distribuicao: [18, 14, 3, 2, 1, 4],
        },
        {
          pergunta: 'Como corrigir acidez em solo argiloso?',
          distribuicao: [11, 3, 15, 2, 1, 3],
        },
        {
          pergunta: 'Quando aplicar biofertilizante em cana?',
          distribuicao: [8, 2, 1, 12, 3, 2],
        },
      ],
    },
  };
}

function montarDashboard(registros, periodoDias, limiteTop) {
  const perguntasMap = new Map();
  const regioesMap = new Map();
  const matrizMap = new Map();

  let totalInteracoes = 0;
  let respostasSucesso = 0;

  for (const item of registros) {
    const pergunta = sanitizarTexto(item.pergunta) || 'Pergunta nao informada';
    const regiao = sanitizarTexto(item.regiao) || 'Nao informado';
    const cultura = sanitizarTexto(item.cultura) || 'Nao informado';
    const frequencia = sanitizarFrequencia(item.frequencia, 0);
    const sucesso = item.respondida_com_sucesso === true;

    totalInteracoes += frequencia;
    if (sucesso) respostasSucesso += frequencia;

    if (!perguntasMap.has(pergunta)) {
      perguntasMap.set(pergunta, {
        pergunta,
        frequencia_total: 0,
        sucesso_interacoes: 0,
        falha_interacoes: 0,
        regioes: new Set(),
        culturas: new Set(),
      });
    }

    const perguntaAtual = perguntasMap.get(pergunta);
    perguntaAtual.frequencia_total += frequencia;
    perguntaAtual.sucesso_interacoes += sucesso ? frequencia : 0;
    perguntaAtual.falha_interacoes += sucesso ? 0 : frequencia;
    perguntaAtual.regioes.add(regiao);
    perguntaAtual.culturas.add(cultura);

    if (!regioesMap.has(regiao)) {
      regioesMap.set(regiao, {
        regiao,
        frequencia_total: 0,
        sucesso_interacoes: 0,
        perguntas_distintas: new Set(),
      });
    }

    const regiaoAtual = regioesMap.get(regiao);
    regiaoAtual.frequencia_total += frequencia;
    regiaoAtual.sucesso_interacoes += sucesso ? frequencia : 0;
    regiaoAtual.perguntas_distintas.add(pergunta);

    if (!matrizMap.has(pergunta)) {
      matrizMap.set(pergunta, {});
    }
    matrizMap.get(pergunta)[regiao] = (matrizMap.get(pergunta)[regiao] || 0) + frequencia;
  }

  const topPerguntas = Array.from(perguntasMap.values())
    .sort((a, b) => b.frequencia_total - a.frequencia_total)
    .slice(0, limiteTop)
    .map((item) => ({
      pergunta: item.pergunta,
      frequencia_total: item.frequencia_total,
      taxa_sucesso: calcularTaxa(item.sucesso_interacoes, item.frequencia_total),
      regioes: Array.from(item.regioes),
      culturas: Array.from(item.culturas),
    }));

  const usoPorRegiao = Array.from(regioesMap.values())
    .sort((a, b) => b.frequencia_total - a.frequencia_total)
    .map((item) => ({
      regiao: item.regiao,
      frequencia_total: item.frequencia_total,
      perguntas_distintas: item.perguntas_distintas.size,
      taxa_sucesso: calcularTaxa(item.sucesso_interacoes, item.frequencia_total),
    }));

  const regioesOrdenadas = usoPorRegiao.map((item) => item.regiao);
  const seriesMatriz = topPerguntas.slice(0, 5).map((item) => ({
    pergunta: item.pergunta,
    distribuicao: regioesOrdenadas.map((regiao) => matrizMap.get(item.pergunta)?.[regiao] || 0),
  }));

  return {
    periodo_dias: periodoDias,
    resumo: {
      total_interacoes: totalInteracoes,
      perguntas_distintas: perguntasMap.size,
      regioes_ativas: usoPorRegiao.length,
      taxa_sucesso: calcularTaxa(respostasSucesso, totalInteracoes),
      respostas_sucesso: respostasSucesso,
      respostas_falha: Math.max(totalInteracoes - respostasSucesso, 0),
    },
    top_perguntas: topPerguntas,
    uso_por_regiao: usoPorRegiao,
    perguntas_por_regiao: {
      regioes: regioesOrdenadas,
      series: seriesMatriz,
    },
  };
}

// GET /admin/perguntas
export const listarPerguntas = async (req, res, next) => {
  try {
    const { busca, cultura, regiao, respondida_com_sucesso, periodo_dias } = req.query;
    const { pagina, tamanho, offset } = normalizarPaginacao(req.query.page, req.query.limit);

    let query = supabase
      .from('perguntas_frequentes_whatsapp')
      .select(
        'id, pergunta, frequencia, cultura, regiao, respondida_com_sucesso, criada_em, atualizada_em',
        { count: 'exact' }
      )
      .order('atualizada_em', { ascending: false })
      .range(offset, offset + tamanho - 1);

    if (busca) query = query.ilike('pergunta', `%${busca}%`);
    if (cultura) query = query.ilike('cultura', `%${cultura}%`);
    if (regiao) query = query.ilike('regiao', `%${regiao}%`);

    const sucesso = paraBoolean(respondida_com_sucesso);
    if (sucesso !== undefined) {
      query = query.eq('respondida_com_sucesso', sucesso);
    }

    const periodoDias = Number(periodo_dias);
    if (!Number.isNaN(periodoDias) && periodoDias > 0) {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - periodoDias);
      query = query.gte('atualizada_em', dataLimite.toISOString());
    }

    const { data, error, count } = await query;
    if (error) return next(error);

    res.json({
      data: data || [],
      meta: {
        total: count || 0,
        page: pagina,
        limit: tamanho,
        pages: Math.ceil((count || 0) / tamanho),
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /admin/perguntas
export const criarPergunta = async (req, res, next) => {
  try {
    const pergunta = sanitizarTexto(req.body.pergunta);

    const payload = {
      pergunta,
      frequencia: sanitizarFrequencia(req.body.frequencia, 1),
      cultura: sanitizarTexto(req.body.cultura),
      regiao: sanitizarTexto(req.body.regiao),
      respondida_com_sucesso: normalizarBoolean(req.body.respondida_com_sucesso, true),
      atualizada_em: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('perguntas_frequentes_whatsapp')
      .insert(payload)
      .select('*')
      .single();

    if (error) return next(error);

    res.status(201).json({ data, message: 'Pergunta cadastrada com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// PUT /admin/perguntas/:id
export const atualizarPergunta = async (req, res, next) => {
  try {
    const { id } = req.params;
    const campos = {};

    if (req.body.pergunta !== undefined) {
      campos.pergunta = sanitizarTexto(req.body.pergunta);
    }
    if (req.body.frequencia !== undefined) {
      campos.frequencia = sanitizarFrequencia(req.body.frequencia, 0);
    }
    if (req.body.cultura !== undefined) {
      campos.cultura = sanitizarTexto(req.body.cultura);
    }
    if (req.body.regiao !== undefined) {
      campos.regiao = sanitizarTexto(req.body.regiao);
    }
    if (req.body.respondida_com_sucesso !== undefined) {
      campos.respondida_com_sucesso = normalizarBoolean(req.body.respondida_com_sucesso, true);
    }

    if (Object.keys(campos).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo informado para atualizacao.' });
    }

    campos.atualizada_em = new Date().toISOString();

    const { data, error } = await supabase
      .from('perguntas_frequentes_whatsapp')
      .update(campos)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return next(error);

    res.json({ data, message: 'Pergunta atualizada com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/perguntas/:id
export const deletarPergunta = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('perguntas_frequentes_whatsapp').delete().eq('id', id);
    if (error) return next(error);

    res.json({ message: 'Pergunta removida com sucesso.' });
  } catch (err) {
    next(err);
  }
};

// GET /admin/dashboard/perguntas
export const obterDashboardPerguntas = async (req, res, next) => {
  try {
    const periodoDias = normalizarPeriodoDias(req.query.periodo_dias);
    const top = Math.min(Math.max(Number(req.query.top) || 10, 3), 20);
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - periodoDias);

    const { data, error } = await supabase
      .from('perguntas_frequentes_whatsapp')
      .select('pergunta, frequencia, cultura, regiao, respondida_com_sucesso, atualizada_em')
      .gte('atualizada_em', dataLimite.toISOString())
      .order('frequencia', { ascending: false })
      .limit(5000);

    if (error) return next(error);

    if (!data || data.length === 0) {
      return res.json({
        data: {
          periodo_dias: periodoDias,
          resumo: {
            total_interacoes: 0,
            perguntas_distintas: 0,
            regioes_ativas: 0,
            taxa_sucesso: 0,
            respostas_sucesso: 0,
            respostas_falha: 0,
          },
          top_perguntas: [],
          uso_por_regiao: [],
          perguntas_por_regiao: {
            regioes: [],
            series: [],
          },
        },
        meta: {
          origem: 'real',
        },
      });
    }

    const dashboard = montarDashboard(data, periodoDias, top);

    res.json({
      data: dashboard,
      meta: { origem: 'real' },
    });
  } catch (err) {
    next(err);
  }
};

// GET /admin/artigos/historico
export const obterHistoricoArtigos = async (req, res, next) => {
  try {
    const { pagina, tamanho, offset } = normalizarPaginacao(req.query.page, req.query.limit || 20);

    const { data, error, count } = await supabase
      .from('artigos')
      .select(
        `
        id, titulo, status, autor, fonte, criado_em, atualizado_em,
        usuarios_admin:criado_por (id, nome, email)
      `,
        { count: 'exact' }
      )
      .order('atualizado_em', { ascending: false })
      .range(offset, offset + tamanho - 1);

    if (error) return next(error);

    const artigos = data || [];
    const eventos = [];

    for (const artigo of artigos) {
      const usuario = artigo.usuarios_admin?.nome || artigo.usuarios_admin?.email || 'Usuario removido';

      eventos.push({
        id: `${artigo.id}-criado`,
        artigo_id: artigo.id,
        titulo: artigo.titulo,
        status: artigo.status,
        tipo: 'criado',
        descricao: 'Artigo adicionado na biblioteca.',
        data_evento: artigo.criado_em,
        usuario,
        autor_artigo: artigo.autor,
        fonte: artigo.fonte,
      });

      const criadoEm = new Date(artigo.criado_em).getTime();
      const atualizadoEm = new Date(artigo.atualizado_em).getTime();

      if (!Number.isNaN(criadoEm) && !Number.isNaN(atualizadoEm) && atualizadoEm - criadoEm > 1000) {
        eventos.push({
          id: `${artigo.id}-atualizado`,
          artigo_id: artigo.id,
          titulo: artigo.titulo,
          status: artigo.status,
          tipo: 'atualizado',
          descricao: 'Ultima atualizacao de conteudo/status registrada.',
          data_evento: artigo.atualizado_em,
          usuario,
          autor_artigo: artigo.autor,
          fonte: artigo.fonte,
        });
      }
    }

    eventos.sort((a, b) => new Date(b.data_evento) - new Date(a.data_evento));

    res.json({
      data: {
        eventos,
        artigos,
      },
      meta: {
        total: count || 0,
        page: pagina,
        limit: tamanho,
        pages: Math.ceil((count || 0) / tamanho),
      },
    });
  } catch (err) {
    next(err);
  }
};