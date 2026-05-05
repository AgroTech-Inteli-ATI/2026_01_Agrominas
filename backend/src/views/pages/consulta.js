// Pagina de consulta e CRUD para gestao completa de fontes
// Inclui busca, filtros, paginacao e painel de detalhes
import api from '../js/api.js';
import { 
  renderLayout, 
  showToast, 
  showLoading, 
  showEmptyState, 
  openModal, 
  closeModal, 
  confirmAction,
  formatDate,
  truncateText,
  debounce,
  escapeHtml
} from '../js/utils.js';
import router from '../js/router.js';

// Estado local para artigos, selecao, paginacao e filtros
let artigos = [];
let artigoSelecionado = null;
let videos = [];
let videoSelecionado = null;
let paginacao = { page: 1, limit: 10, total: 0, pages: 0 };
let filtros = { busca: '', status: '' };
let categorias = [];
let insumos = [];
let tipoFonte = 'artigos';

// Renderizando pagina de consulta com layout split view
export async function renderConsulta(params = {}) {
  // Verificando autenticacao antes de exibir conteudo
  if (!api.isAuthenticated()) {
    router.navigate('/login');
    return;
  }

  // Recuperando termo de busca da URL se existir
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  if (urlParams.get('busca')) {
    filtros.busca = urlParams.get('busca');
  }
  if (urlParams.get('tipo') === 'videos') {
    tipoFonte = 'videos';
  } else {
    tipoFonte = 'artigos';
  }

  // Montando estrutura HTML da pagina de consulta
  const content = `
    <h1 class="page-title">Consultar Fontes</h1>
    
    <!-- Barra de Busca -->
    <div class="search-bar">
      <input type="text" class="search-bar__input" id="search-input" 
             placeholder="Buscar por titulo..." value="${filtros.busca}">
      <button class="search-bar__btn" id="btn-search">🔍 Buscar</button>
    </div>
    
    <!-- Tipo de Fonte -->
    <div class="filters" id="filtro-tipo">
      <button class="filter-chip ${tipoFonte === 'artigos' ? 'filter-chip--active' : ''}" data-tipo="artigos">
        Artigos
      </button>
      <button class="filter-chip ${tipoFonte === 'videos' ? 'filter-chip--active' : ''}" data-tipo="videos">
        Videos
      </button>
    </div>

    <!-- Filtros de Status -->
    <div class="filters" id="filtros"></div>
    
    <!-- Layout dividido lista e detalhes -->
    <div class="split-view">
      <!-- Lista de Resultados -->
      <div>
        <div class="results-list" id="lista-artigos">
          <div class="loading"><div class="loading__spinner"></div></div>
        </div>
        
        <!-- Paginacao -->
        <div class="pagination" id="paginacao"></div>
      </div>
      
      <!-- Painel de Detalhes -->
      <div class="details-panel" id="painel-detalhes" style="display: none;">
        <div id="detalhes-conteudo"></div>
      </div>
    </div>
  `;

  renderLayout(content, 'consulta');

  renderizarFiltrosStatus();

  // Carregando dados auxiliares para formularios
  await carregarDadosAuxiliares();

  // Configurando todos os eventos da pagina
  setupEventListeners();

  // Carregando lista inicial de artigos
  await carregarFontes();
}

// Buscando categorias e insumos do backend
async function carregarDadosAuxiliares() {
  try {
    const [categoriasRes, insumosRes] = await Promise.all([
      api.listarCategorias(),
      api.listarInsumos()
    ]);
    categorias = categoriasRes.data || [];
    insumos = insumosRes.data || [];
  } catch (error) {
    console.error('Erro ao carregar dados auxiliares:', error);
  }
}

// Configurando eventos de busca e filtros
function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  const btnSearch = document.getElementById('btn-search');
  const tipoDiv = document.getElementById('filtro-tipo');

  // Executando busca ao clicar no botao
  btnSearch.addEventListener('click', () => {
    filtros.busca = searchInput.value.trim();
    paginacao.page = 1;
    carregarFontes();
  });

  // Executando busca ao pressionar Enter
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      filtros.busca = searchInput.value.trim();
      paginacao.page = 1;
      carregarFontes();
    }
  });

  // Aplicando debounce para busca automatica ao digitar
  searchInput.addEventListener('input', debounce(() => {
    filtros.busca = searchInput.value.trim();
    paginacao.page = 1;
    carregarFontes();
  }, 500));

  // Alternando entre artigos e videos
  tipoDiv?.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-tipo]');
    if (!chip) return;

    const novoTipo = chip.dataset.tipo;
    if (novoTipo === tipoFonte) return;

    tipoFonte = novoTipo;
    filtros.status = '';
    paginacao.page = 1;
    artigoSelecionado = null;
    videoSelecionado = null;
    document.getElementById('painel-detalhes').style.display = 'none';

    tipoDiv.querySelectorAll('.filter-chip').forEach((c) => {
      c.classList.toggle('filter-chip--active', c.dataset.tipo === tipoFonte);
    });

    renderizarFiltrosStatus();
    carregarFontes();
  });
}

// Renderizando filtros de status conforme o tipo de fonte
function renderizarFiltrosStatus() {
  const filtrosDiv = document.getElementById('filtros');
  if (!filtrosDiv) return;

  const opcoes = tipoFonte === 'videos'
    ? [
        { label: 'Todos', value: '' },
        { label: 'Publicados', value: 'publicado' },
        { label: 'Arquivados', value: 'arquivado' },
      ]
    : [
        { label: 'Todos', value: '' },
        { label: 'Publicados', value: 'publicado' },
        { label: 'Rascunhos', value: 'rascunho' },
        { label: 'Arquivados', value: 'arquivado' },
      ];

  filtrosDiv.innerHTML = opcoes
    .map(
      (opcao) => `
      <button class="filter-chip ${filtros.status === opcao.value ? 'filter-chip--active' : ''}" data-status="${opcao.value}">
        ${opcao.label}
      </button>
    `
    )
    .join('');

  filtrosDiv.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      filtros.status = chip.dataset.status;
      paginacao.page = 1;

      filtrosDiv.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('filter-chip--active'));
      chip.classList.add('filter-chip--active');

      carregarFontes();
    });
  });
}

// Carregando fontes conforme o tipo selecionado
async function carregarFontes() {
  if (tipoFonte === 'videos') {
    return carregarVideos();
  }
  return carregarArtigos();
}

// Buscando artigos do backend com filtros e paginacao
async function carregarArtigos() {
  const lista = document.getElementById('lista-artigos');
  showLoading(lista);

  try {
    const params = {
      page: paginacao.page,
      limit: paginacao.limit
    };

    if (filtros.busca) params.busca = filtros.busca;
    if (filtros.status) params.status = filtros.status;

    const response = await api.listarArtigos(params);
    artigos = response.data || [];
    paginacao = { ...paginacao, ...response.meta };

    renderizarLista();
    renderizarPaginacao();

    // Mantendo selecao se artigo ainda existir na lista
    if (artigoSelecionado) {
      const ainda = artigos.find(a => a.id === artigoSelecionado.id);
      if (ainda) {
        selecionarArtigo(ainda);
      } else {
        artigoSelecionado = null;
        document.getElementById('painel-detalhes').style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Erro ao carregar artigos:', error);
    lista.innerHTML = `
      <div class="alert alert--error">
        Erro ao carregar artigos. Tente novamente.
      </div>
    `;
  }
}

// Buscando videos do backend com filtros e paginacao
async function carregarVideos() {
  const lista = document.getElementById('lista-artigos');
  showLoading(lista);

  try {
    const params = {
      page: paginacao.page,
      limit: paginacao.limit,
    };

    if (filtros.busca) params.busca = filtros.busca;
    if (filtros.status) params.status = filtros.status;

    const response = await api.listarVideos(params);
    videos = response.data || [];
    paginacao = { ...paginacao, ...response.meta };

    renderizarLista();
    renderizarPaginacao();

    if (videoSelecionado) {
      const ainda = videos.find((v) => v.id === videoSelecionado.id);
      if (ainda) {
        selecionarVideo(ainda);
      } else {
        videoSelecionado = null;
        document.getElementById('painel-detalhes').style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Erro ao carregar videos:', error);
    lista.innerHTML = `
      <div class="alert alert--error">
        Erro ao carregar videos. Tente novamente.
      </div>
    `;
  }
}

// Renderizando lista conforme o tipo de fonte
function renderizarLista() {
  if (tipoFonte === 'videos') {
    renderizarListaVideos();
    return;
  }
  renderizarListaArtigos();
}

// Renderizando lista de artigos na tela
function renderizarListaArtigos() {
  const lista = document.getElementById('lista-artigos');

  // Exibindo estado vazio se nao houver resultados
  if (artigos.length === 0) {
    showEmptyState(lista, 'Nenhuma fonte encontrada', 
      'Tente ajustar os filtros ou adicione novas fontes.',
      { label: 'Adicionar Fonte', onClick: () => router.navigate('/home') }
    );
    return;
  }

  // Gerando HTML da lista de artigos
  lista.innerHTML = artigos.map(artigo => `
    <div class="result-item ${artigoSelecionado?.id === artigo.id ? 'result-item--selected' : ''}" 
         data-id="${artigo.id}">
      <div class="result-item__content">
        <div class="result-item__title">${artigo.titulo}</div>
        <div class="result-item__meta">
          ${artigo.autor || 'Autor desconhecido'} • ${formatDate(artigo.criado_em)}
          <span class="card__status card__status--${artigo.status}">${artigo.status}</span>
        </div>
      </div>
      <div class="result-item__actions">
        <button class="btn btn--icon" data-action="menu" data-id="${artigo.id}" title="Opcoes">⋮</button>
      </div>
    </div>
  `).join('');

  // Vinculando evento de selecao aos itens da lista
  lista.querySelectorAll('.result-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="menu"]')) return;
      
      const id = item.dataset.id;
      const artigo = artigos.find(a => a.id === id);
      if (artigo) selecionarArtigo(artigo);
    });
  });

  // Vinculando evento de menu contextual
  lista.querySelectorAll('[data-action="menu"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const artigo = artigos.find(a => a.id === id);
      if (artigo) mostrarMenuContextual(artigo, btn);
    });
  });
}

// Renderizando lista de videos na tela
function renderizarListaVideos() {
  const lista = document.getElementById('lista-artigos');

  if (videos.length === 0) {
    showEmptyState(
      lista,
      'Nenhum video encontrado',
      'Tente ajustar os filtros ou adicione novos videos.',
      { label: 'Adicionar Video', onClick: () => router.navigate('/home') }
    );
    return;
  }

  lista.innerHTML = videos
    .map(
      (video) => `
    <div class="result-item ${videoSelecionado?.id === video.id ? 'result-item--selected' : ''}" 
         data-id="${video.id}">
      <div class="result-item__content">
        <div class="result-item__title">${escapeHtml(video.titulo || '-')}</div>
        <div class="result-item__meta">
          ${escapeHtml(video.canal || 'Canal desconhecido')} • ${formatDate(video.criado_em)}
          <span class="card__status card__status--${video.status}">${video.status}</span>
        </div>
      </div>
      <div class="result-item__actions">
        <button class="btn btn--icon" data-action="menu-video" data-id="${video.id}" title="Opcoes">⋮</button>
      </div>
    </div>
  `
    )
    .join('');

  lista.querySelectorAll('.result-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="menu-video"]')) return;

      const id = item.dataset.id;
      const video = videos.find((v) => v.id === id);
      if (video) selecionarVideo(video);
    });
  });

  lista.querySelectorAll('[data-action="menu-video"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const video = videos.find((v) => v.id === id);
      if (video) mostrarMenuContextualVideo(video, btn);
    });
  });
}

// Renderizando controles de paginacao
function renderizarPaginacao() {
  const container = document.getElementById('paginacao');

  if (paginacao.pages <= 1) {
    container.innerHTML = '';
    return;
  }

  // Gerando HTML dos botoes de paginacao
  let html = `
    <button class="pagination__btn" ${paginacao.page <= 1 ? 'disabled' : ''} data-page="${paginacao.page - 1}">
      ← Anterior
    </button>
    <span class="pagination__info">
      Pagina ${paginacao.page} de ${paginacao.pages}
    </span>
    <button class="pagination__btn" ${paginacao.page >= paginacao.pages ? 'disabled' : ''} data-page="${paginacao.page + 1}">
      Proxima →
    </button>
  `;

  container.innerHTML = html;

  // Vinculando eventos de navegacao entre paginas
  container.querySelectorAll('.pagination__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      if (page >= 1 && page <= paginacao.pages) {
        paginacao.page = page;
        carregarFontes();
      }
    });
  });
}

// Exibindo detalhes completos do artigo selecionado
async function selecionarArtigo(artigo) {
  artigoSelecionado = artigo;
  videoSelecionado = null;
  
  // Atualizando destaque visual na lista
  document.querySelectorAll('.result-item').forEach(item => {
    item.classList.toggle('result-item--selected', item.dataset.id === artigo.id);
  });

  const painel = document.getElementById('painel-detalhes');
  const conteudo = document.getElementById('detalhes-conteudo');
  
  painel.style.display = 'block';

  // Buscando dados completos do artigo selecionado
  try {
    const response = await api.obterArtigo(artigo.id);
    const dados = response.data;

    // Extraindo nomes de categorias e insumos relacionados
    const cats = dados.artigos_categorias?.map(ac => ac.categorias?.nome).filter(Boolean) || [];
    const ins = dados.artigos_insumos?.map(ai => ai.insumos_regenerativos?.nome).filter(Boolean) || [];

    // Renderizando painel de detalhes com todas as informacoes
    conteudo.innerHTML = `
      <div class="details-panel__header">
        <h2 class="details-panel__title">${dados.titulo}</h2>
        <span class="card__status card__status--${dados.status}">${dados.status}</span>
      </div>
      
      <div class="details-panel__section">
        <div class="details-panel__label">Resumo</div>
        <div class="details-panel__value">${dados.resumo || 'Sem resumo'}</div>
      </div>
      
      <div class="details-panel__section">
        <div class="details-panel__label">Autor</div>
        <div class="details-panel__value">${dados.autor || '-'}</div>
      </div>
      
      <div class="details-panel__section">
        <div class="details-panel__label">Fonte</div>
        <div class="details-panel__value">${dados.fonte || '-'}</div>
      </div>
      
      <div class="details-panel__section">
        <div class="details-panel__label">Data de Publicacao</div>
        <div class="details-panel__value">${formatDate(dados.data_publicacao) || '-'}</div>
      </div>
      
      ${cats.length > 0 ? `
      <div class="details-panel__section">
        <div class="details-panel__label">Categorias</div>
        <div class="card__tags">
          ${cats.map(c => `<span class="card__tag">${c}</span>`).join('')}
        </div>
      </div>
      ` : ''}
      
      ${ins.length > 0 ? `
      <div class="details-panel__section">
        <div class="details-panel__label">Insumos Relacionados</div>
        <div class="card__tags">
          ${ins.map(i => `<span class="card__tag">${i}</span>`).join('')}
        </div>
      </div>
      ` : ''}
      
      <div class="details-panel__section">
        <div class="details-panel__label">Criado em</div>
        <div class="details-panel__value">${formatDate(dados.criado_em)}</div>
      </div>
      
      <div class="details-panel__actions">
        <button class="btn btn--secondary" id="btn-editar-detalhe">✏️ Editar</button>
        <button class="btn btn--danger" id="btn-excluir-detalhe">🗑️ Excluir</button>
      </div>
    `;

    // Configurando botoes de acao do painel de detalhes
    document.getElementById('btn-editar-detalhe')?.addEventListener('click', () => {
      abrirModalEdicao(dados);
    });

    document.getElementById('btn-excluir-detalhe')?.addEventListener('click', () => {
      confirmarExclusao(dados);
    });

  } catch (error) {
    console.error('Erro ao carregar detalhes:', error);
    conteudo.innerHTML = `
      <div class="alert alert--error">Erro ao carregar detalhes.</div>
    `;
  }
}

// Exibindo detalhes completos do video selecionado
function obterYoutubeIdVideo(video) {
  if (video.youtube_id) return video.youtube_id;

  const match = String(video.url_youtube || '').match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i
  );
  return match ? match[1] : '';
}

async function selecionarVideo(video) {
  videoSelecionado = video;
  artigoSelecionado = null;

  document.querySelectorAll('.result-item').forEach((item) => {
    item.classList.toggle('result-item--selected', item.dataset.id === video.id);
  });

  const painel = document.getElementById('painel-detalhes');
  const conteudo = document.getElementById('detalhes-conteudo');

  painel.style.display = 'block';

  try {
    const response = await api.obterVideo(video.id);
    const dados = response.data;
    const urlVideo = dados.url_youtube || '';
    const youtubeId = obterYoutubeIdVideo(dados);
    const embedUrl = youtubeId ? `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}` : '';

    conteudo.innerHTML = `
      <div class="details-panel__header">
        <h2 class="details-panel__title">${escapeHtml(dados.titulo || '-')}</h2>
        <span class="card__status card__status--${dados.status}">${dados.status}</span>
      </div>

      <div class="details-panel__section">
        <div class="details-panel__label">Canal</div>
        <div class="details-panel__value">${escapeHtml(dados.canal || '-')}</div>
      </div>

      <div class="details-panel__section">
        <div class="details-panel__label">YouTube</div>
        <div class="details-panel__value">
          ${urlVideo
            ? `<a class="btn btn--secondary" href="${urlVideo}" target="_blank" rel="noopener noreferrer">Abrir video</a>`
            : '-'}
        </div>
      </div>

      <div class="details-panel__section">
        <div class="details-panel__label">Preview</div>
        <div class="details-panel__value">
          ${embedUrl
            ? `<div class="video-embed"><iframe src="${embedUrl}" title="${escapeHtml(dados.titulo || 'Video')}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`
            : '-'}
        </div>
      </div>

      <div class="details-panel__section">
        <div class="details-panel__label">Criado em</div>
        <div class="details-panel__value">${formatDate(dados.criado_em)}</div>
      </div>

      <div class="details-panel__actions">
        <button class="btn btn--secondary" id="btn-editar-detalhe-video">✏️ Editar</button>
        <button class="btn btn--danger" id="btn-excluir-detalhe-video">🗑️ Excluir</button>
      </div>
    `;

    document.getElementById('btn-editar-detalhe-video')?.addEventListener('click', () => {
      abrirModalEdicaoVideo(dados);
    });

    document.getElementById('btn-excluir-detalhe-video')?.addEventListener('click', () => {
      confirmarExclusaoVideo(dados);
    });
  } catch (error) {
    console.error('Erro ao carregar detalhes do video:', error);
    conteudo.innerHTML = `
      <div class="alert alert--error">Erro ao carregar detalhes do video.</div>
    `;
  }
}

// Exibindo menu contextual com acoes do artigo
function mostrarMenuContextual(artigo, btnElement) {
  // Removendo menu existente se houver
  document.querySelectorAll('.context-menu').forEach(m => m.remove());

  // Criando novo menu contextual
  const menu = document.createElement('div');
  menu.className = 'context-menu context-menu--visible';
  menu.innerHTML = `
    <button class="context-menu__item" data-action="editar">✏️ Editar</button>
    <button class="context-menu__item" data-action="status">📋 Alterar Status</button>
    <button class="context-menu__item context-menu__item--danger" data-action="excluir">🗑️ Excluir</button>
  `;

  // Posicionando menu proximo ao botao clicado
  const rect = btnElement.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  document.body.appendChild(menu);

  // Configurando acoes do menu contextual
  menu.querySelector('[data-action="editar"]').addEventListener('click', () => {
    menu.remove();
    abrirModalEdicao(artigo);
  });

  menu.querySelector('[data-action="status"]').addEventListener('click', () => {
    menu.remove();
    abrirModalStatus(artigo);
  });

  menu.querySelector('[data-action="excluir"]').addEventListener('click', () => {
    menu.remove();
    confirmarExclusao(artigo);
  });

  // Fechando menu ao clicar fora dele
  setTimeout(() => {
    document.addEventListener('click', function fechar(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', fechar);
      }
    });
  }, 0);
}

// Exibindo menu contextual para videos
function mostrarMenuContextualVideo(video, btnElement) {
  document.querySelectorAll('.context-menu').forEach(m => m.remove());

  const menu = document.createElement('div');
  menu.className = 'context-menu context-menu--visible';
  menu.innerHTML = `
    <button class="context-menu__item" data-action="editar">✏️ Editar</button>
    <button class="context-menu__item" data-action="status">📋 Alterar Status</button>
    <button class="context-menu__item context-menu__item--danger" data-action="excluir">🗑️ Excluir</button>
  `;

  const rect = btnElement.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  document.body.appendChild(menu);

  menu.querySelector('[data-action="editar"]').addEventListener('click', () => {
    menu.remove();
    abrirModalEdicaoVideo(video);
  });

  menu.querySelector('[data-action="status"]').addEventListener('click', () => {
    menu.remove();
    abrirModalStatusVideo(video);
  });

  menu.querySelector('[data-action="excluir"]').addEventListener('click', () => {
    menu.remove();
    confirmarExclusaoVideo(video);
  });

  setTimeout(() => {
    document.addEventListener('click', function fechar(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', fechar);
      }
    });
  }, 0);
}

// Abrindo modal de edicao completa do artigo
function abrirModalEdicao(artigo) {
  // Gerando opcoes de categorias com selecao atual
  const categoriasOptions = categorias.map(c => {
    const selected = artigo.artigos_categorias?.some(ac => ac.categorias?.id === c.id);
    return `<option value="${c.id}" ${selected ? 'selected' : ''}>${c.nome}</option>`;
  }).join('');

  // Gerando opcoes de insumos com selecao atual
  const insumosOptions = insumos.map(i => {
    const selected = artigo.artigos_insumos?.some(ai => ai.insumos_regenerativos?.id === i.id);
    return `<option value="${i.id}" ${selected ? 'selected' : ''}>${i.nome}</option>`;
  }).join('');

  // Montando formulario completo de edicao
  const content = `
    <form id="form-edicao">
      <div class="form-group">
        <label class="form-label">Titulo *</label>
        <input type="text" id="edit-titulo" class="form-input" value="${artigo.titulo || ''}" required>
      </div>
      
      <div class="form-group">
        <label class="form-label">Resumo</label>
        <textarea id="edit-resumo" class="form-textarea" rows="3">${artigo.resumo || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label class="form-label">Conteudo</label>
        <textarea id="edit-conteudo" class="form-textarea" rows="5">${artigo.conteudo || ''}</textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Autor</label>
          <input type="text" id="edit-autor" class="form-input" value="${artigo.autor || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Fonte</label>
          <input type="text" id="edit-fonte" class="form-input" value="${artigo.fonte || ''}">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Categorias</label>
          <select id="edit-categorias" class="form-select" multiple>
            ${categoriasOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Insumos</label>
          <select id="edit-insumos" class="form-select" multiple>
            ${insumosOptions}
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Status</label>
        <select id="edit-status" class="form-select">
          <option value="rascunho" ${artigo.status === 'rascunho' ? 'selected' : ''}>Rascunho</option>
          <option value="publicado" ${artigo.status === 'publicado' ? 'selected' : ''}>Publicado</option>
          <option value="arquivado" ${artigo.status === 'arquivado' ? 'selected' : ''}>Arquivado</option>
        </select>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn--secondary" id="modal-cancel">Cancelar</button>
    <button class="btn btn--primary" id="modal-save">Salvar</button>
  `;

  openModal('Editar Artigo', content, footer);

  // Configurando eventos do modal de edicao
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-save')?.addEventListener('click', async () => {
    // Coletando dados do formulario
    const dados = {
      titulo: document.getElementById('edit-titulo').value,
      resumo: document.getElementById('edit-resumo').value,
      conteudo: document.getElementById('edit-conteudo').value,
      autor: document.getElementById('edit-autor').value,
      fonte: document.getElementById('edit-fonte').value,
      status: document.getElementById('edit-status').value,
      categorias: Array.from(document.getElementById('edit-categorias').selectedOptions).map(o => o.value),
      insumos: Array.from(document.getElementById('edit-insumos').selectedOptions).map(o => o.value)
    };

    try {
      await api.atualizarArtigo(artigo.id, dados);
      showToast('Artigo atualizado com sucesso!', 'success');
      closeModal();
      await carregarArtigos();
      
      // Atualizando painel de detalhes se artigo estiver selecionado
      if (artigoSelecionado?.id === artigo.id) {
        const atualizado = artigos.find(a => a.id === artigo.id);
        if (atualizado) selecionarArtigo(atualizado);
      }
    } catch (error) {
      showToast('Erro ao atualizar artigo.', 'error');
    }
  });
}

// Abrindo modal de edicao para videos
function abrirModalEdicaoVideo(video) {
  const content = `
    <form id="form-edicao-video">
      <div class="form-group">
        <label class="form-label">Titulo *</label>
        <input type="text" id="edit-video-titulo" class="form-input" value="${escapeHtml(video.titulo || '')}" required>
      </div>

      <div class="form-group">
        <label class="form-label">Canal</label>
        <input type="text" id="edit-video-canal" class="form-input" value="${escapeHtml(video.canal || '')}">
      </div>

      <div class="form-group">
        <label class="form-label">URL do YouTube</label>
        <input type="url" id="edit-video-url" class="form-input" value="${escapeHtml(video.url_youtube || '')}">
      </div>

      <div class="form-group">
        <label class="form-label">Resumo</label>
        <textarea id="edit-video-resumo" class="form-textarea" rows="5">${escapeHtml(video.resumo || '')}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Status</label>
        <select id="edit-video-status" class="form-select">
          <option value="publicado" ${video.status === 'publicado' ? 'selected' : ''}>Publicado</option>
          <option value="arquivado" ${video.status === 'arquivado' ? 'selected' : ''}>Arquivado</option>
        </select>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn--secondary" id="modal-cancel">Cancelar</button>
    <button class="btn btn--primary" id="modal-save">Salvar</button>
  `;

  openModal('Editar Video', content, footer);

  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-save')?.addEventListener('click', async () => {
    const dados = {
      titulo: document.getElementById('edit-video-titulo').value,
      canal: document.getElementById('edit-video-canal').value,
      url_youtube: document.getElementById('edit-video-url').value,
      resumo: document.getElementById('edit-video-resumo').value,
      status: document.getElementById('edit-video-status').value,
    };

    try {
      await api.atualizarVideo(video.id, dados);
      showToast('Video atualizado com sucesso!', 'success');
      closeModal();
      await carregarVideos();

      if (videoSelecionado?.id === video.id) {
        const atualizado = videos.find((v) => v.id === video.id);
        if (atualizado) selecionarVideo(atualizado);
      }
    } catch (error) {
      showToast('Erro ao atualizar video.', 'error');
    }
  });
}

// Abrindo modal para alteracao rapida de status do video
function abrirModalStatusVideo(video) {
  const content = `
    <p>Selecione o novo status para "${escapeHtml(video.titulo)}":</p>
    <div class="form-group" style="margin-top: 16px;">
      <select id="novo-status-video" class="form-select">
        <option value="publicado" ${video.status === 'publicado' ? 'selected' : ''}>Publicado</option>
        <option value="arquivado" ${video.status === 'arquivado' ? 'selected' : ''}>Arquivado</option>
      </select>
    </div>
  `;

  const footer = `
    <button class="btn btn--secondary" id="modal-cancel">Cancelar</button>
    <button class="btn btn--primary" id="modal-save">Alterar</button>
  `;

  openModal('Alterar Status', content, footer);

  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-save')?.addEventListener('click', async () => {
    const novoStatus = document.getElementById('novo-status-video').value;

    try {
      await api.atualizarVideo(video.id, { status: novoStatus });
      showToast(`Status alterado para "${novoStatus}"!`, 'success');
      closeModal();
      await carregarVideos();
    } catch (error) {
      showToast('Erro ao alterar status.', 'error');
    }
  });
}

// Exibindo confirmacao antes de excluir video
function confirmarExclusaoVideo(video) {
  confirmAction(
    'Excluir Video',
    `Tem certeza que deseja excluir "${escapeHtml(video.titulo)}"? Esta acao nao pode ser desfeita.`,
    async () => {
      try {
        await api.deletarVideo(video.id);
        showToast('Video excluido com sucesso!', 'success');

        if (videoSelecionado?.id === video.id) {
          videoSelecionado = null;
          document.getElementById('painel-detalhes').style.display = 'none';
        }

        await carregarVideos();
      } catch (error) {
        showToast('Erro ao excluir video. Verifique suas permissoes.', 'error');
      }
    }
  );
}

// Abrindo modal para alteracao rapida de status
function abrirModalStatus(artigo) {
  const content = `
    <p>Selecione o novo status para "${artigo.titulo}":</p>
    <div class="form-group" style="margin-top: 16px;">
      <select id="novo-status" class="form-select">
        <option value="rascunho" ${artigo.status === 'rascunho' ? 'selected' : ''}>Rascunho</option>
        <option value="publicado" ${artigo.status === 'publicado' ? 'selected' : ''}>Publicado</option>
        <option value="arquivado" ${artigo.status === 'arquivado' ? 'selected' : ''}>Arquivado</option>
      </select>
    </div>
  `;

  const footer = `
    <button class="btn btn--secondary" id="modal-cancel">Cancelar</button>
    <button class="btn btn--primary" id="modal-save">Alterar</button>
  `;

  openModal('Alterar Status', content, footer);

  // Configurando eventos do modal de status
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-save')?.addEventListener('click', async () => {
    const novoStatus = document.getElementById('novo-status').value;

    try {
      await api.alterarStatusArtigo(artigo.id, novoStatus);
      showToast(`Status alterado para "${novoStatus}"!`, 'success');
      closeModal();
      await carregarArtigos();
    } catch (error) {
      showToast('Erro ao alterar status.', 'error');
    }
  });
}

// Exibindo confirmacao antes de excluir artigo
function confirmarExclusao(artigo) {
  confirmAction(
    'Excluir Artigo',
    `Tem certeza que deseja excluir "${artigo.titulo}"? Esta acao nao pode ser desfeita.`,
    async () => {
      try {
        await api.deletarArtigo(artigo.id);
        showToast('Artigo excluido com sucesso!', 'success');
        
        // Limpando selecao se artigo excluido estava selecionado
        if (artigoSelecionado?.id === artigo.id) {
          artigoSelecionado = null;
          document.getElementById('painel-detalhes').style.display = 'none';
        }
        
        await carregarArtigos();
      } catch (error) {
        showToast('Erro ao excluir artigo. Verifique suas permissoes.', 'error');
      }
    }
  );
}
