// Sistema de roteamento SPA baseado em hash para navegacao entre paginas

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    
    // Escutando mudancas na hash da URL para navegacao
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  // Registrando uma nova rota com seu handler correspondente
  register(path, handler) {
    this.routes[path] = handler;
  }

  // Navegando para uma rota especifica alterando a hash
  navigate(path) {
    window.location.hash = path;
  }

  // Obtendo o caminho atual a partir da hash da URL
  getCurrentPath() {
    const hash = window.location.hash || '#/';
    return hash.slice(1) || '/';
  }

  // Extraindo parametros dinamicos da rota como artigos/:id
  matchRoute(path) {
    for (const routePath in this.routes) {
      const routeParts = routePath.split('/');
      const pathParts = path.split('/');

      if (routeParts.length !== pathParts.length) continue;

      const params = {};
      let match = true;

      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          params[routeParts[i].slice(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        return { handler: this.routes[routePath], params };
      }
    }

    return null;
  }

  // Processando a rota atual e executando seu handler
  async handleRoute() {
    const path = this.getCurrentPath();
    const match = this.matchRoute(path);

    if (match) {
      this.currentRoute = path;
      await match.handler(match.params);
    } else if (this.routes['/404']) {
      await this.routes['/404']();
    } else {
      console.error('Rota nao encontrada:', path);
      this.navigate('/login');
    }
  }
}

// Exportando instancia unica do router para uso global
const router = new Router();
export default router;
