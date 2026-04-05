// Ponto de entrada do frontend SPA para o painel administrativo
// Configura rotas e inicializa a aplicacao
import router from './router.js';
import api from './api.js';
import { renderLogin } from '../pages/login.js';
import { renderHome } from '../pages/home.js';
import { renderConfirmacao } from '../pages/confirmacao.js';
import { renderConsulta } from '../pages/consulta.js';

// Middleware para proteger rotas que exigem autenticacao
function requireAuth(handler) {
  return async (params) => {
    if (!api.isAuthenticated()) {
      router.navigate('/login');
      return;
    }
    await handler(params);
  };
}

// Registrando rota de login publica
router.register('/login', renderLogin);

// Redirecionando rota raiz conforme estado de autenticacao
router.register('/', () => {
  if (api.isAuthenticated()) {
    router.navigate('/home');
  } else {
    router.navigate('/login');
  }
});

// Registrando rotas protegidas do sistema
router.register('/home', requireAuth(renderHome));
router.register('/confirmacao', requireAuth(renderConfirmacao));
router.register('/consulta', requireAuth(renderConsulta));

// Renderizando pagina de erro 404 para rotas inexistentes
router.register('/404', () => {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-page" style="background: var(--background);">
      <div class="login-card">
        <div class="empty-state">
          <div class="empty-state__icon">🔍</div>
          <h2 class="empty-state__title">Pagina nao encontrada</h2>
          <p class="empty-state__text">A pagina que voce esta procurando nao existe.</p>
          <button class="btn btn--primary" onclick="window.location.hash='#/home'">
            Voltar ao Inicio
          </button>
        </div>
      </div>
    </div>
  `;
});

// Exibindo informacoes de inicializacao no console
console.log('🌱 Guia Regenerativo - Painel Administrativo');
console.log('Versao: 1.0.0');
