// Utilitarios de interface para componentes reutilizaveis
// Inclui modais, toasts, formatacao de datas e helpers gerais

// Exibindo notificacao toast no canto da tela
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${type === 'success' ? '✓' : '✕'}</span>
    <span class="toast__message">${message}</span>
    <button class="toast__close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Remove automaticamente após 5 segundos
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// Exibindo spinner de carregamento em um container
export function showLoading(container) {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  
  container.innerHTML = `
    <div class="loading">
      <div class="loading__spinner"></div>
    </div>
  `;
}

// Renderizando estado vazio quando nao ha dados para exibir
export function showEmptyState(container, title, text, action = null) {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }

  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">📭</div>
      <h3 class="empty-state__title">${title}</h3>
      <p class="empty-state__text">${text}</p>
      ${action ? `<button class="btn btn--primary" id="empty-action">${action.label}</button>` : ''}
    </div>
  `;

  if (action) {
    document.getElementById('empty-action')?.addEventListener('click', action.onClick);
  }
}

// Montando layout padrao com header e navegacao
export function renderLayout(content, activePage = 'home') {
  const app = document.getElementById('app');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  app.innerHTML = `
    <header class="header">
      <div class="container">
        <div class="header__logo" onclick="window.location.hash='#/home'">
          <span class="header__logo-icon">🌱</span>
          <span>Guia Regenerativo</span>
        </div>
        <nav class="header__nav">
          <a class="header__nav-link ${activePage === 'home' ? 'header__nav-link--active' : ''}" 
             href="#/home">Adicionar</a>
          <a class="header__nav-link ${activePage === 'consulta' ? 'header__nav-link--active' : ''}" 
             href="#/consulta">Consultar</a>
        </nav>
        <div class="header__user">
          <span class="header__user-name">${usuario.nome || 'Usuário'}</span>
          <button class="btn-logout" id="btn-logout">Sair</button>
        </div>
      </div>
    </header>
    <main class="main-content">
      <div class="container">
        ${content}
      </div>
    </main>
  `;

  // Event listener para logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.hash = '#/login';
  });
}

// Abrindo modal generico com titulo, conteudo e rodape
export function openModal(title, content, footerContent = '') {
  // Remove modal existente
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay modal-overlay--visible';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal__header">
        <h2 class="modal__title">${title}</h2>
        <button class="modal__close" id="modal-close">×</button>
      </div>
      <div class="modal__body">
        ${content}
      </div>
      ${footerContent ? `<div class="modal__footer">${footerContent}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);

  // Fechar ao clicar no X
  document.getElementById('modal-close')?.addEventListener('click', closeModal);

  // Fechar ao clicar fora
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Fechar com ESC
  document.addEventListener('keydown', handleEscKey);

  return overlay;
}

// Fechando modal ativo e removendo do DOM
export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.remove();
  }
  document.removeEventListener('keydown', handleEscKey);
}

function handleEscKey(e) {
  if (e.key === 'Escape') closeModal();
}

// Exibindo modal de confirmacao para acoes destrutivas
export function confirmAction(title, message, onConfirm) {
  const content = `<p>${message}</p>`;
  const footer = `
    <button class="btn btn--secondary" id="confirm-cancel">Cancelar</button>
    <button class="btn btn--danger" id="confirm-ok">Confirmar</button>
  `;

  openModal(title, content, footer);

  document.getElementById('confirm-cancel')?.addEventListener('click', closeModal);
  document.getElementById('confirm-ok')?.addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}

// Formatando data para exibicao no padrao brasileiro
export function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Formatando data e hora completa para exibicao
export function formatDateTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Limitando frequencia de chamadas para eventos repetitivos
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Escapando caracteres HTML para prevenir injecao de scripts
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Truncando texto longo adicionando reticencias ao final
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength) + '...';
}
