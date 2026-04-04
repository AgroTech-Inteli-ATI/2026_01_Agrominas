// Pagina de login para autenticacao de usuarios no sistema
import api from '../js/api.js';
import { showToast } from '../js/utils.js';

// Renderizando formulario de login e configurando eventos
export function renderLogin() {
  const app = document.getElementById('app');

  // Montando estrutura HTML da pagina de login
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-card__logo">
          <div class="login-card__logo-icon">🌱</div>
          <div class="login-card__logo-text">Guia Regenerativo</div>
        </div>
        <p class="login-card__title">Acesse o painel administrativo</p>
        
        <div id="login-error" class="alert alert--error" style="display: none;"></div>
        
        <form id="login-form">
          <div class="form-group">
            <label class="form-label" for="email">E-mail</label>
            <input type="email" id="email" class="form-input" placeholder="seu@email.com" required>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="senha">Senha</label>
            <input type="password" id="senha" class="form-input" placeholder="••••••••" required>
          </div>
          
          <button type="submit" class="btn btn--primary" style="width: 100%;" id="btn-login">
            Entrar
          </button>
        </form>
      </div>
    </div>
  `;

  // Configurando elementos do formulario de login
  const form = document.getElementById('login-form');
  const errorDiv = document.getElementById('login-error');
  const btnLogin = document.getElementById('btn-login');

  // Processando envio do formulario de login
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando...';
    errorDiv.style.display = 'none';

    try {
      await api.login(email, senha);
      showToast('Login realizado com sucesso!', 'success');
      window.location.hash = '#/home';
    } catch (error) {
      errorDiv.textContent = error.message || 'Credenciais invalidas';
      errorDiv.style.display = 'flex';
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Entrar';
    }
  });
}
