// Pagina inicial para adicao de fontes ao sistema
// Permite upload de arquivos, URLs, Google Drive e texto copiado
import api from '../js/api.js';
import { renderLayout, showToast, showLoading } from '../js/utils.js';
import router from '../js/router.js';

// Estado local para armazenar arquivos e dados auxiliares
let arquivosSelecionados = [];
let categorias = [];
let insumos = [];

// Renderizando pagina inicial com dropzone e botoes de fonte
export async function renderHome() {
  // Verificando autenticacao antes de exibir conteudo
  if (!api.isAuthenticated()) {
    router.navigate('/login');
    return;
  }

  // Montando estrutura HTML da pagina de adicao de fontes
  const content = `
    <h1 class="page-title">Adicionar Fontes</h1>
    
    <!-- Barra de Busca -->
    <div class="search-bar">
      <input type="text" class="search-bar__input" id="search-input" 
             placeholder="Pesquisar fontes existentes...">
      <button class="search-bar__btn" id="btn-search">🔍 Buscar</button>
    </div>
    
    <!-- Area de Upload Dropzone -->
    <div class="dropzone" id="dropzone">
      <input type="file" id="file-input" class="dropzone__input" multiple 
             accept=".pdf,.doc,.docx,.txt,.md">
      <div class="dropzone__icon">📁</div>
      <p class="dropzone__text">Arraste e solte arquivos aqui</p>
      <p class="dropzone__hint">ou clique para selecionar</p>
    </div>
    
    <!-- Botoes para fontes alternativas -->
    <div class="source-buttons">
      <button class="source-btn" id="btn-arquivo">
        <span class="source-btn__icon">💾</span>
        Arquivo Local
      </button>
      <button class="source-btn" id="btn-site">
        <span class="source-btn__icon">🌐</span>
        Site / URL
      </button>
      <button class="source-btn" id="btn-drive">
        <span class="source-btn__icon">☁️</span>
        Google Drive
      </button>
      <button class="source-btn" id="btn-texto">
        <span class="source-btn__icon">📝</span>
        Texto Copiado
      </button>
    </div>
    
    <!-- Preview dos arquivos selecionados -->
    <div id="arquivos-preview" style="display: none;">
      <h2 style="font-size: 1.2rem; margin-bottom: 16px;">Arquivos Selecionados</h2>
      <div class="confirmation-cards" id="arquivos-lista"></div>
      <div class="btn-group" style="margin-top: 20px;">
        <button class="btn btn--secondary" id="btn-limpar">Limpar</button>
        <button class="btn btn--primary" id="btn-continuar">Continuar →</button>
      </div>
    </div>
  `;

  renderLayout(content, 'home');

  // Carregando categorias e insumos para formularios
  await carregarDadosAuxiliares();

  // Configurando todos os eventos da pagina
  setupEventListeners();
}

// Buscando categorias e insumos do backend para uso nos formularios
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

// Configurando todos os event listeners da pagina
function setupEventListeners() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const searchInput = document.getElementById('search-input');
  const btnSearch = document.getElementById('btn-search');
  const btnArquivo = document.getElementById('btn-arquivo');
  const btnSite = document.getElementById('btn-site');
  const btnDrive = document.getElementById('btn-drive');
  const btnTexto = document.getElementById('btn-texto');
  const btnLimpar = document.getElementById('btn-limpar');
  const btnContinuar = document.getElementById('btn-continuar');

  // Configurando eventos de drag and drop no dropzone
  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dropzone--active');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dropzone--active');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dropzone--active');
    const files = Array.from(e.dataTransfer.files);
    adicionarArquivos(files);
  });

  // Processando arquivos selecionados pelo input
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    adicionarArquivos(files);
  });

  // Vinculando botao de arquivo local ao input
  btnArquivo.addEventListener('click', () => fileInput.click());

  // Abrindo modais para cada tipo de fonte externa
  btnSite.addEventListener('click', () => abrirModalURL());
  btnDrive.addEventListener('click', () => abrirModalDrive());
  btnTexto.addEventListener('click', () => abrirModalTexto());

  // Configurando busca ao clicar ou pressionar Enter
  btnSearch.addEventListener('click', realizarBusca);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') realizarBusca();
  });

  // Limpando lista de arquivos selecionados
  btnLimpar?.addEventListener('click', () => {
    arquivosSelecionados = [];
    atualizarPreviewArquivos();
  });

  // Navegando para confirmacao com arquivos selecionados
  btnContinuar?.addEventListener('click', () => {
    if (arquivosSelecionados.length > 0) {
      sessionStorage.setItem('arquivosPendentes', JSON.stringify(arquivosSelecionados));
      router.navigate('/confirmacao');
    }
  });
}

// Adicionando novos arquivos a lista de selecionados
function adicionarArquivos(files) {
  files.forEach(file => {
    arquivosSelecionados.push({
      id: Date.now() + Math.random(),
      nome: file.name,
      tipo: 'arquivo',
      tamanho: formatarTamanho(file.size),
      arquivo: file
    });
  });
  atualizarPreviewArquivos();
}

// Atualizando exibicao dos arquivos selecionados na tela
function atualizarPreviewArquivos() {
  const preview = document.getElementById('arquivos-preview');
  const lista = document.getElementById('arquivos-lista');

  if (arquivosSelecionados.length === 0) {
    preview.style.display = 'none';
    return;
  }

  // Renderizando cards de preview para cada arquivo
  preview.style.display = 'block';
  lista.innerHTML = arquivosSelecionados.map(arquivo => `
    <div class="confirmation-card" data-id="${arquivo.id}">
      <div class="confirmation-card__icon">
        ${getIconePorTipo(arquivo.tipo)}
      </div>
      <div class="confirmation-card__info">
        <div class="confirmation-card__name">${arquivo.nome}</div>
        <div class="confirmation-card__meta">${arquivo.tipo} • ${arquivo.tamanho || ''}</div>
      </div>
      <button class="confirmation-card__remove" data-id="${arquivo.id}">×</button>
    </div>
  `).join('');

  // Adicionando evento de remover para cada card
  lista.querySelectorAll('.confirmation-card__remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseFloat(e.target.dataset.id);
      arquivosSelecionados = arquivosSelecionados.filter(a => a.id !== id);
      atualizarPreviewArquivos();
    });
  });
}

// Retornando icone apropriado para cada tipo de fonte
function getIconePorTipo(tipo) {
  const icones = {
    'arquivo': '📄',
    'url': '🌐',
    'drive': '☁️',
    'texto': '📝'
  };
  return icones[tipo] || '📄';
}

// Formatando tamanho de arquivo em bytes para exibicao legivel
function formatarTamanho(bytes) {
  if (!bytes) return '';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

// Redirecionando para consulta com termo de busca
function realizarBusca() {
  const termo = document.getElementById('search-input').value.trim();
  if (termo) {
    router.navigate(`/consulta?busca=${encodeURIComponent(termo)}`);
  } else {
    router.navigate('/consulta');
  }
}

// Abrindo modal para adicionar fonte via URL
function abrirModalURL() {
  import('../js/utils.js').then(({ openModal, closeModal }) => {
    const content = `
      <div class="form-group">
        <label class="form-label">URL do Site ou Artigo</label>
        <input type="url" id="input-url" class="form-input" placeholder="https://exemplo.com/artigo">
      </div>
      <div class="form-group">
        <label class="form-label">Titulo (opcional)</label>
        <input type="text" id="input-url-titulo" class="form-input" placeholder="Titulo do conteudo">
      </div>
    `;
    
    const footer = `
      <button class="btn btn--secondary" id="modal-cancel">Cancelar</button>
      <button class="btn btn--primary" id="modal-confirm">Adicionar</button>
    `;
    
    openModal('Adicionar por URL', content, footer);
    
    document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('modal-confirm')?.addEventListener('click', () => {
      const url = document.getElementById('input-url').value.trim();
      const titulo = document.getElementById('input-url-titulo').value.trim();
      
      if (url) {
        arquivosSelecionados.push({
          id: Date.now() + Math.random(),
          nome: titulo || url,
          tipo: 'url',
          url: url,
          tamanho: ''
        });
        atualizarPreviewArquivos();
        closeModal();
      }
    });
  });
}

// Abrindo modal para adicionar fonte do Google Drive
function abrirModalDrive() {
  import('../js/utils.js').then(({ openModal, closeModal }) => {
    const content = `
      <div class="form-group">
        <label class="form-label">Link do Google Drive</label>
        <input type="url" id="input-drive" class="form-input" placeholder="https://drive.google.com/...">
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px;">
          Cole o link de compartilhamento do arquivo no Google Drive
        </p>
      </div>
      <div class="form-group">
        <label class="form-label">Titulo</label>
        <input type="text" id="input-drive-titulo" class="form-input" placeholder="Nome do arquivo">
      </div>
    `;
    
    const footer = `
      <button class="btn btn--secondary" id="modal-cancel">Cancelar</button>
      <button class="btn btn--primary" id="modal-confirm">Adicionar</button>
    `;
    
    openModal('Adicionar do Google Drive', content, footer);
    
    document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('modal-confirm')?.addEventListener('click', () => {
      const url = document.getElementById('input-drive').value.trim();
      const titulo = document.getElementById('input-drive-titulo').value.trim();
      
      if (url && titulo) {
        arquivosSelecionados.push({
          id: Date.now() + Math.random(),
          nome: titulo,
          tipo: 'drive',
          url: url,
          tamanho: ''
        });
        atualizarPreviewArquivos();
        closeModal();
      }
    });
  });
}

// Abrindo modal para adicionar texto copiado manualmente
function abrirModalTexto() {
  import('../js/utils.js').then(({ openModal, closeModal }) => {
    const content = `
      <div class="form-group">
        <label class="form-label">Titulo</label>
        <input type="text" id="input-texto-titulo" class="form-input" placeholder="Titulo do conteudo">
      </div>
      <div class="form-group">
        <label class="form-label">Conteudo</label>
        <textarea id="input-texto-conteudo" class="form-textarea" rows="8" 
                  placeholder="Cole ou digite o conteudo aqui..."></textarea>
      </div>
    `;
    
    const footer = `
      <button class="btn btn--secondary" id="modal-cancel">Cancelar</button>
      <button class="btn btn--primary" id="modal-confirm">Adicionar</button>
    `;
    
    openModal('Adicionar Texto', content, footer);
    
    document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('modal-confirm')?.addEventListener('click', () => {
      const titulo = document.getElementById('input-texto-titulo').value.trim();
      const conteudo = document.getElementById('input-texto-conteudo').value.trim();
      
      if (titulo && conteudo) {
        arquivosSelecionados.push({
          id: Date.now() + Math.random(),
          nome: titulo,
          tipo: 'texto',
          conteudo: conteudo,
          tamanho: `${conteudo.length} caracteres`
        });
        atualizarPreviewArquivos();
        closeModal();
      }
    });
  });
}

// Exportando estado para acesso em outras paginas
export function getArquivosSelecionados() {
  return arquivosSelecionados;
}

// Exportando categorias carregadas do backend
export function getCategorias() {
  return categorias;
}

// Exportando insumos carregados do backend
export function getInsumos() {
  return insumos;
}
