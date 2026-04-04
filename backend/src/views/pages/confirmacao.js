// Pagina de confirmacao para revisao e envio dos arquivos selecionados
// Permite editar metadados antes de salvar na biblioteca
import api from '../js/api.js';
import { renderLayout, showToast, showLoading, openModal, closeModal } from '../js/utils.js';
import router from '../js/router.js';

// Estado local para arquivos pendentes e dados auxiliares
let arquivosPendentes = [];
let categorias = [];
let insumos = [];

// Renderizando pagina de confirmacao com lista de arquivos
export async function renderConfirmacao() {
  // Verificando autenticacao antes de exibir conteudo
  if (!api.isAuthenticated()) {
    router.navigate('/login');
    return;
  }

  // Recuperando arquivos salvos na sessao anterior
  const arquivosJson = sessionStorage.getItem('arquivosPendentes');
  if (!arquivosJson) {
    router.navigate('/home');
    return;
  }

  arquivosPendentes = JSON.parse(arquivosJson);

  if (arquivosPendentes.length === 0) {
    router.navigate('/home');
    return;
  }

  // Montando estrutura HTML da pagina de confirmacao
  const content = `
    <h1 class="page-title">Confirmar Envio</h1>
    <p style="color: var(--text-secondary); margin-bottom: 24px;">
      Revise os itens abaixo antes de confirmar o envio para a biblioteca.
    </p>
    
    <!-- Cards de Confirmacao -->
    <div class="confirmation-cards" id="confirmacao-lista"></div>
    
    <!-- Botoes de acao -->
    <div class="btn-group" style="margin-top: 32px;">
      <button class="btn btn--secondary" id="btn-voltar">← Voltar</button>
      <button class="btn btn--primary" id="btn-enviar">✓ Confirmar Envio</button>
    </div>
  `;

  renderLayout(content, 'home');

  // Carregando dados auxiliares para os formularios
  await carregarDadosAuxiliares();

  // Renderizando lista de arquivos pendentes
  renderizarLista();

  // Configurando navegacao e envio
  document.getElementById('btn-voltar')?.addEventListener('click', () => {
    router.navigate('/home');
  });

  document.getElementById('btn-enviar')?.addEventListener('click', enviarTodos);
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

// Renderizando cards de preview para cada arquivo pendente
function renderizarLista() {
  const lista = document.getElementById('confirmacao-lista');

  // Gerando HTML dos cards de confirmacao
  lista.innerHTML = arquivosPendentes.map((arquivo, index) => `
    <div class="confirmation-card" data-index="${index}">
      <div class="confirmation-card__icon">
        ${getIconePorTipo(arquivo.tipo)}
      </div>
      <div class="confirmation-card__info">
        <div class="confirmation-card__name">${arquivo.nome}</div>
        <div class="confirmation-card__meta">${arquivo.tipo} • ${arquivo.tamanho || ''}</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn--sm btn--secondary" data-action="editar" data-index="${index}">
          ✏️ Editar
        </button>
        <button class="confirmation-card__remove" data-action="remover" data-index="${index}">×</button>
      </div>
    </div>
  `).join('');

  // Vinculando evento de edicao aos botoes
  lista.querySelectorAll('[data-action="editar"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      abrirModalEdicao(index);
    });
  });

  // Vinculando evento de remocao aos botoes
  lista.querySelectorAll('[data-action="remover"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      arquivosPendentes.splice(index, 1);
      sessionStorage.setItem('arquivosPendentes', JSON.stringify(arquivosPendentes));
      
      if (arquivosPendentes.length === 0) {
        router.navigate('/home');
      } else {
        renderizarLista();
      }
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

// Abrindo modal para edicao de metadados do arquivo
function abrirModalEdicao(index) {
  const arquivo = arquivosPendentes[index];

  // Gerando opcoes de categorias e insumos
  const categoriasOptions = categorias.map(c => 
    `<option value="${c.id}">${c.nome}</option>`
  ).join('');

  const insumosOptions = insumos.map(i => 
    `<option value="${i.id}">${i.nome}</option>`
  ).join('');

  // Montando formulario de edicao
  const content = `
    <form id="form-edicao">
      <div class="form-group">
        <label class="form-label">Titulo *</label>
        <input type="text" id="edit-titulo" class="form-input" value="${arquivo.nome}" required>
      </div>
      
      <div class="form-group">
        <label class="form-label">Resumo</label>
        <textarea id="edit-resumo" class="form-textarea" rows="3" 
                  placeholder="Breve descricao do conteudo...">${arquivo.resumo || ''}</textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Autor</label>
          <input type="text" id="edit-autor" class="form-input" value="${arquivo.autor || ''}" 
                 placeholder="Nome do autor">
        </div>
        <div class="form-group">
          <label class="form-label">Fonte</label>
          <input type="text" id="edit-fonte" class="form-input" value="${arquivo.fonte || ''}" 
                 placeholder="Origem do conteudo">
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
          <label class="form-label">Insumos Relacionados</label>
          <select id="edit-insumos" class="form-select" multiple>
            ${insumosOptions}
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Status</label>
        <select id="edit-status" class="form-select">
          <option value="rascunho" ${arquivo.status === 'rascunho' ? 'selected' : ''}>Rascunho</option>
          <option value="publicado" ${arquivo.status === 'publicado' ? 'selected' : ''}>Publicado</option>
        </select>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn--secondary" id="modal-cancel">Cancelar</button>
    <button class="btn btn--primary" id="modal-save">Salvar</button>
  `;

  openModal('Editar Informacoes', content, footer);

  // Configurando eventos do modal de edicao
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-save')?.addEventListener('click', () => {
    // Salvando alteracoes no arquivo pendente
    arquivosPendentes[index] = {
      ...arquivo,
      nome: document.getElementById('edit-titulo').value,
      titulo: document.getElementById('edit-titulo').value,
      resumo: document.getElementById('edit-resumo').value,
      autor: document.getElementById('edit-autor').value,
      fonte: document.getElementById('edit-fonte').value,
      categorias: Array.from(document.getElementById('edit-categorias').selectedOptions).map(o => o.value),
      insumos: Array.from(document.getElementById('edit-insumos').selectedOptions).map(o => o.value),
      status: document.getElementById('edit-status').value
    };

    sessionStorage.setItem('arquivosPendentes', JSON.stringify(arquivosPendentes));
    renderizarLista();
    closeModal();
    showToast('Informacoes atualizadas!', 'success');
  });
}

// Enviando todos os arquivos pendentes para o backend
async function enviarTodos() {
  const btnEnviar = document.getElementById('btn-enviar');
  btnEnviar.disabled = true;
  btnEnviar.textContent = 'Enviando...';

  let sucessos = 0;
  let erros = 0;

  // Processando cada arquivo individualmente
  for (const arquivo of arquivosPendentes) {
    try {
      const dados = {
        titulo: arquivo.titulo || arquivo.nome,
        resumo: arquivo.resumo || '',
        conteudo: arquivo.conteudo || arquivo.url || '',
        autor: arquivo.autor || '',
        fonte: arquivo.fonte || arquivo.url || '',
        status: arquivo.status || 'rascunho',
        categorias: arquivo.categorias || [],
        insumos: arquivo.insumos || []
      };

      await api.criarArtigo(dados);
      sucessos++;
    } catch (error) {
      console.error('Erro ao criar artigo:', error);
      erros++;
    }
  }

  // Limpando arquivos pendentes apos envio
  sessionStorage.removeItem('arquivosPendentes');

  // Exibindo resultado do envio ao usuario
  if (erros === 0) {
    showToast(`${sucessos} fonte(s) adicionada(s) com sucesso!`, 'success');
    router.navigate('/consulta');
  } else {
    showToast(`${sucessos} sucesso(s), ${erros} erro(s)`, erros > sucessos ? 'error' : 'success');
    btnEnviar.disabled = false;
    btnEnviar.textContent = '✓ Confirmar Envio';
  }
}
