import api from '../js/api.js';
import {
  renderLayout,
  showToast,
  showLoading,
  showEmptyState,
  openModal,
  closeModal,
  confirmAction,
  formatDateTime,
  truncateText,
  escapeHtml,
} from '../js/utils.js';
import router from '../js/router.js';

let perguntas = [];
let metaPerguntas = { page: 1, limit: 10, total: 0, pages: 0 };
let filtrosPerguntas = {
  busca: '',
};

let dashboard = null;
let dashboardMeta = null;
let periodoDashboard = 30;

let historicoEventos = [];

export async function renderGestaoBot() {
  if (!api.isAuthenticated()) {
    router.navigate('/login');
    return;
  }

  const content = `
    <h1 class="page-title">Gestão do Bot</h1>
    <p class="bot-admin__subtitle">
      Acompanhe uso por região e monitore o histórico de artigos.
    </p>

    <section class="bot-admin__section">
      <div class="bot-admin__section-header">
        <div>
          <h2 class="bot-admin__section-title">Dashboard de uso</h2>
          <p class="bot-admin__section-text">Top perguntas, uso por região e combinacao de perguntas por região.</p>
        </div>
      </div>

      <div class="bot-periodo" id="bot-periodo-chips">
        <button class="filter-chip filter-chip--active" data-periodo="7">7 dias</button>
        <button class="filter-chip" data-periodo="30">30 dias</button>
        <button class="filter-chip" data-periodo="90">90 dias</button>
      </div>

      <div id="bot-dashboard-alert"></div>
      <div id="bot-kpis" class="bot-kpis"></div>

      <div class="bot-dashboard-grid">
        <div class="bot-chart-card">
          <h3 class="bot-chart-title">Top perguntas</h3>
          <div id="bot-chart-top"></div>
        </div>
        <div class="bot-chart-card">
          <h3 class="bot-chart-title">Utilização do bot por região</h3>
          <div id="bot-chart-regiao"></div>
        </div>
      </div>

      <div class="bot-chart-card" style="margin-top: 16px;">
        <h3 class="bot-chart-title">Perguntas por região</h3>
        <div id="bot-matriz"></div>
      </div>
    </section>

    <section class="bot-admin__section">
      <div class="bot-admin__section-header">
        <div>
          <h2 class="bot-admin__section-title">Histórico de artigos</h2>
          <p class="bot-admin__section-text">Inclusoes e ultimas atualizacoes registradas na biblioteca.</p>
        </div>
        <button class="btn btn--secondary" id="bot-btn-recarregar-historico">Recarregar</button>
      </div>

      <div id="bot-historico-lista" class="bot-timeline"></div>
    </section>
  `;

  renderLayout(content, 'gestao-bot');
  setupEventListeners();

  await Promise.all([carregarPerguntas(), carregarDashboard(), carregarHistoricoArtigos()]);
}

function setupEventListeners() {
  document.getElementById('bot-btn-nova-pergunta')?.addEventListener('click', () => {
    abrirModalPergunta();
  });

  document.getElementById('bot-btn-filtrar')?.addEventListener('click', () => {
    aplicarFiltros(true);
  });

  document.getElementById('bot-btn-limpar')?.addEventListener('click', () => {
    limparFiltros();
  });

  document.getElementById('bot-filter-busca')?.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      aplicarFiltros(true);
    }
  });

  document.getElementById('bot-periodo-chips')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-periodo]');
    if (!button) return;

    const periodo = Number(button.dataset.periodo);
    if (!periodo || periodoDashboard === periodo) return;

    periodoDashboard = periodo;

    document.querySelectorAll('#bot-periodo-chips [data-periodo]').forEach((chip) => {
      chip.classList.toggle('filter-chip--active', Number(chip.dataset.periodo) === periodoDashboard);
    });

    carregarDashboard();
  });

  document.getElementById('bot-btn-recarregar-historico')?.addEventListener('click', () => {
    carregarHistoricoArtigos();
  });
}

function aplicarFiltros(resetPage = false) {
  filtrosPerguntas.busca = document.getElementById('bot-filter-busca')?.value?.trim() || '';
  filtrosPerguntas.cultura = document.getElementById('bot-filter-cultura')?.value?.trim() || '';
  filtrosPerguntas.regiao = document.getElementById('bot-filter-regiao')?.value?.trim() || '';
  filtrosPerguntas.respondida_com_sucesso = document.getElementById('bot-filter-sucesso')?.value || '';

  if (resetPage) {
    metaPerguntas.page = 1;
  }

  carregarPerguntas();
}

function limparFiltros() {
  filtrosPerguntas = {
    busca: '',
    cultura: '',
    regiao: '',
    respondida_com_sucesso: '',
  };

  metaPerguntas.page = 1;

  document.getElementById('bot-filter-busca').value = '';
  document.getElementById('bot-filter-cultura').value = '';
  document.getElementById('bot-filter-regiao').value = '';
  document.getElementById('bot-filter-sucesso').value = '';

  carregarPerguntas();
}

async function carregarPerguntas() {
  const container = document.getElementById('bot-perguntas-table');
  showLoading(container);

  try {
    const response = await api.listarPerguntasBot({
      page: metaPerguntas.page,
      limit: metaPerguntas.limit,
      ...filtrosPerguntas,
    });

    perguntas = response.data || [];
    metaPerguntas = {
      ...metaPerguntas,
      ...(response.meta || {}),
    };

    renderizarTabelaPerguntas();
    renderizarPaginacaoPerguntas();
  } catch (error) {
    console.error('Erro ao carregar perguntas do bot:', error);
    container.innerHTML = '<div class="alert alert--error">Erro ao carregar perguntas do bot.</div>';
  }
}

function renderizarTabelaPerguntas() {
  const container = document.getElementById('bot-perguntas-table');

  if (!perguntas.length) {
    showEmptyState(
      container,
      'Nenhuma pergunta encontrada',
      'Ajuste os filtros ou crie uma nova pergunta pre-setada para o bot.',
      {
        label: 'Nova pergunta',
        onClick: () => abrirModalPergunta(),
      }
    );
    return;
  }

  container.innerHTML = `
    <table class="bot-table">
      <thead>
        <tr>
          <th>Pergunta</th>
          <th>Frequencia</th>
          <th>Atualizada em</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${perguntas
          .map(
            (item) => `
          <tr>
            <td>${escapeHtml(item.pergunta || '-')}</td>
            <td>${Number(item.frequencia || 0)}</td>
            <td>${formatDateTime(item.atualizada_em)}</td>
            <td>
              <div class="bot-table__actions">
                <button class="btn btn--sm btn--secondary" data-action="editar-pergunta" data-id="${item.id}">Editar</button>
                <button class="btn btn--sm btn--danger" data-action="excluir-pergunta" data-id="${item.id}">Excluir</button>
              </div>
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;

  container.querySelectorAll('[data-action="editar-pergunta"]').forEach((button) => {
    button.addEventListener('click', () => {
      const pergunta = perguntas.find((item) => item.id === button.dataset.id);
      if (pergunta) {
        abrirModalPergunta(pergunta);
      }
    });
  });

  container.querySelectorAll('[data-action="excluir-pergunta"]').forEach((button) => {
    button.addEventListener('click', () => {
      const pergunta = perguntas.find((item) => item.id === button.dataset.id);
      if (!pergunta) return;

      confirmAction(
        'Excluir pergunta',
        `Tem certeza que deseja excluir a pergunta "${escapeHtml(pergunta.pergunta)}"?`,
        async () => {
          try {
            await api.excluirPerguntaBot(pergunta.id);
            showToast('Pergunta removida com sucesso.', 'success');

            if (perguntas.length === 1 && metaPerguntas.page > 1) {
              metaPerguntas.page -= 1;
            }

            await Promise.all([carregarPerguntas(), carregarDashboard()]);
          } catch (error) {
            console.error('Erro ao excluir pergunta:', error);
            showToast(error.message || 'Erro ao excluir pergunta.', 'error');
          }
        }
      );
    });
  });
}

function renderizarPaginacaoPerguntas() {
  const container = document.getElementById('bot-perguntas-pagination');

  if (!metaPerguntas.pages || metaPerguntas.pages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <button class="pagination__btn" ${metaPerguntas.page <= 1 ? 'disabled' : ''} data-page="${metaPerguntas.page - 1}">
      ← Anterior
    </button>
    <span class="pagination__info">Pagina ${metaPerguntas.page} de ${metaPerguntas.pages}</span>
    <button class="pagination__btn" ${metaPerguntas.page >= metaPerguntas.pages ? 'disabled' : ''} data-page="${metaPerguntas.page + 1}">
      Proxima →
    </button>
  `;

  container.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => {
      const page = Number(button.dataset.page);
      if (!page || page < 1 || page > metaPerguntas.pages) return;

      metaPerguntas.page = page;
      carregarPerguntas();
    });
  });
}

function abrirModalPergunta(pergunta = null) {
  const emEdicao = !!pergunta;

  const content = `
    <div class="form-group">
      <label class="form-label">Pergunta *</label>
      <textarea id="bot-form-pergunta" class="form-textarea" rows="3" placeholder="Digite a pergunta a ser adicionada">${escapeHtml(
        pergunta?.pergunta || ''
      )}</textarea>
    </div>

  `;

  const footer = `
    <button class="btn btn--secondary" id="bot-modal-cancelar">Cancelar</button>
    <button class="btn btn--primary" id="bot-modal-salvar">${emEdicao ? 'Salvar alteracoes' : 'Cadastrar pergunta'}</button>
  `;

  openModal(emEdicao ? 'Editar pergunta' : 'Nova pergunta', content, footer);

  document.getElementById('bot-modal-cancelar')?.addEventListener('click', closeModal);
  document.getElementById('bot-modal-salvar')?.addEventListener('click', async () => {
    const perguntaTexto = document.getElementById('bot-form-pergunta').value.trim();

    if (perguntaTexto.length < 3) {
      showToast('A pergunta deve ter ao menos 3 caracteres.', 'error');
      return;
    }

    const payload = {
      pergunta: perguntaTexto,
      cultura: document.getElementById('bot-form-cultura').value.trim() || null,
      regiao: document.getElementById('bot-form-regiao').value.trim() || null,
      frequencia: Number(document.getElementById('bot-form-frequencia').value || 0),
      respondida_com_sucesso: document.getElementById('bot-form-sucesso').value === 'true',
    };

    try {
      if (emEdicao) {
        await api.atualizarPerguntaBot(pergunta.id, payload);
        showToast('Pergunta atualizada com sucesso.', 'success');
      } else {
        await api.criarPerguntaBot(payload);
        showToast('Pergunta cadastrada com sucesso.', 'success');
      }

      closeModal();
      metaPerguntas.page = 1;
      await Promise.all([carregarPerguntas(), carregarDashboard()]);
    } catch (error) {
      console.error('Erro ao salvar pergunta:', error);
      showToast(error.message || 'Erro ao salvar pergunta.', 'error');
    }
  });
}

async function carregarDashboard() {
  const kpiContainer = document.getElementById('bot-kpis');
  const topContainer = document.getElementById('bot-chart-top');
  const regiaoContainer = document.getElementById('bot-chart-regiao');
  const matrizContainer = document.getElementById('bot-matriz');

  showLoading(kpiContainer);
  showLoading(topContainer);
  showLoading(regiaoContainer);
  showLoading(matrizContainer);

  try {
    const response = await api.obterDashboardBot({ periodo_dias: periodoDashboard, top: 8 });
    dashboard = response.data || null;
    dashboardMeta = response.meta || null;

    renderizarDashboard();
  } catch (error) {
    console.error('Erro ao carregar dashboard do bot:', error);
    kpiContainer.innerHTML = '<div class="alert alert--error">Erro ao carregar dashboard.</div>';
    topContainer.innerHTML = '<div class="alert alert--error">Erro ao carregar dados.</div>';
    regiaoContainer.innerHTML = '<div class="alert alert--error">Erro ao carregar dados.</div>';
    matrizContainer.innerHTML = '<div class="alert alert--error">Erro ao carregar dados.</div>';
  }
}

function renderizarDashboard() {
  const alerta = document.getElementById('bot-dashboard-alert');
  const kpiContainer = document.getElementById('bot-kpis');
  const topContainer = document.getElementById('bot-chart-top');
  const regiaoContainer = document.getElementById('bot-chart-regiao');
  const matrizContainer = document.getElementById('bot-matriz');

  if (!dashboard) {
    alerta.innerHTML = '';
    showEmptyState(kpiContainer, 'Sem dados', 'Nao foi possivel montar o dashboard no momento.');
    topContainer.innerHTML = '';
    regiaoContainer.innerHTML = '';
    matrizContainer.innerHTML = '';
    return;
  }

  if (dashboardMeta?.origem === 'mock') {
    alerta.innerHTML = `<div class="alert alert--warning">${dashboardMeta.aviso || 'Dados mockados exibidos neste periodo.'}</div>`;
  } else {
    alerta.innerHTML = '';
  }

  const resumo = dashboard.resumo || {};

  kpiContainer.innerHTML = `
    <article class="bot-kpi-card">
      <span class="bot-kpi-label">Interações</span>
      <strong class="bot-kpi-value">${Number(resumo.total_interacoes || 0)}</strong>
    </article>
    <article class="bot-kpi-card">
      <span class="bot-kpi-label">Perguntas distintas</span>
      <strong class="bot-kpi-value">${Number(resumo.perguntas_distintas || 0)}</strong>
    </article>
    <article class="bot-kpi-card">
      <span class="bot-kpi-label">Regiões ativas</span>
      <strong class="bot-kpi-value">${Number(resumo.regioes_ativas || 0)}</strong>
    </article>
    <article class="bot-kpi-card">
      <span class="bot-kpi-label">Taxa de sucesso</span>
      <strong class="bot-kpi-value">${Number(resumo.taxa_sucesso || 0).toFixed(2)}%</strong>
    </article>
  `;

  renderizarGraficoBarras(
    topContainer,
    dashboard.top_perguntas || [],
    'pergunta',
    'frequencia_total',
    (item) => truncateText(item.pergunta, 64)
  );

  renderizarGraficoBarras(
    regiaoContainer,
    dashboard.uso_por_regiao || [],
    'regiao',
    'frequencia_total',
    (item) => item.regiao || 'Nao informado'
  );

  renderizarMatrizPerguntasRegiao(matrizContainer, dashboard.perguntas_por_regiao || {});
}

function renderizarGraficoBarras(container, lista, labelKey, valueKey, labelFormatter) {
  if (!lista.length) {
    showEmptyState(container, 'Sem dados', 'Nao ha informacoes suficientes para este grafico.');
    return;
  }

  const maximo = Math.max(...lista.map((item) => Number(item[valueKey] || 0)), 1);

  container.innerHTML = `
    <div class="bot-bars">
      ${lista
        .map((item) => {
          const valor = Number(item[valueKey] || 0);
          const largura = Math.max((valor / maximo) * 100, 2);
          const label = labelFormatter ? labelFormatter(item) : item[labelKey];

          return `
            <div class="bot-bar-row">
              <div class="bot-bar-row__head">
                <span>${escapeHtml(label || '-')}</span>
                <strong>${valor}</strong>
              </div>
              <div class="bot-bar">
                <span style="width: ${largura}%;"></span>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderizarMatrizPerguntasRegiao(container, dados) {
  const regioes = dados.regioes || [];
  const series = dados.series || [];

  if (!regioes.length || !series.length) {
    showEmptyState(container, 'Sem dados', 'Nao ha dados para cruzar perguntas por regiao.');
    return;
  }

  const maxValor = Math.max(
    ...series.flatMap((item) => item.distribuicao || []),
    1
  );

  container.innerHTML = `
    <div class="bot-matriz-wrapper">
      <table class="bot-matriz-table">
        <thead>
          <tr>
            <th>Pergunta</th>
            ${regioes.map((regiao) => `<th>${escapeHtml(regiao)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${series
            .map((linha) => {
              const celulas = (linha.distribuicao || []).map((valor) => {
                const intensidade = Math.max(Number(valor || 0) / maxValor, 0);
                const alpha = (0.12 + intensidade * 0.45).toFixed(2);
                return `<td style="background: rgba(46, 125, 50, ${alpha});">${Number(valor || 0)}</td>`;
              });

              return `
                <tr>
                  <td class="bot-matriz-table__label">${escapeHtml(truncateText(linha.pergunta || '-', 52))}</td>
                  ${celulas.join('')}
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function carregarHistoricoArtigos() {
  const container = document.getElementById('bot-historico-lista');
  showLoading(container);

  try {
    const response = await api.obterHistoricoArtigosBot({ page: 1, limit: 20 });
    historicoEventos = response?.data?.eventos || [];

    renderizarHistoricoArtigos();
  } catch (error) {
    console.error('Erro ao carregar historico de artigos:', error);
    container.innerHTML = '<div class="alert alert--error">Erro ao carregar historico de artigos.</div>';
  }
}

function renderizarHistoricoArtigos() {
  const container = document.getElementById('bot-historico-lista');

  if (!historicoEventos.length) {
    showEmptyState(container, 'Sem historico', 'Nenhum evento de artigo foi encontrado.');
    return;
  }

  container.innerHTML = `
    <div class="bot-timeline">
      ${historicoEventos
        .map((evento) => {
          const tipoClasse = evento.tipo === 'criado' ? 'bot-timeline__tag--criado' : 'bot-timeline__tag--atualizado';
          const tipoLabel = evento.tipo === 'criado' ? 'Inclusao' : 'Atualizacao';

          return `
            <article class="bot-timeline__item">
              <div class="bot-timeline__top">
                <span class="bot-timeline__tag ${tipoClasse}">${tipoLabel}</span>
                <span class="bot-timeline__date">${formatDateTime(evento.data_evento)}</span>
              </div>

              <h3 class="bot-timeline__title">${escapeHtml(evento.titulo || '-')}</h3>
              <p class="bot-timeline__description">${escapeHtml(evento.descricao || '-')}</p>

              <div class="bot-timeline__meta">
                <span>Status: ${escapeHtml(evento.status || '-')}</span>
                <span>Usuario: ${escapeHtml(evento.usuario || '-')}</span>
                <span>Autor: ${escapeHtml(evento.autor_artigo || '-')}</span>
              </div>
            </article>
          `;
        })
        .join('')}
    </div>
  `;
}
