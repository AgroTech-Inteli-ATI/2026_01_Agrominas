// Servico de comunicacao com a API do backend
// Permite alternar entre modo real e mock para desenvolvimento

const API_BASE_URL = 'http://localhost:3000/api/v1';
const MOCK_MODE = true; // Mude para false quando o backend estiver rodando

// Dados simulados para testes sem backend
const MOCK_DATA = {
  usuario: {
    id: '1',
    nome: 'Admin Demo',
    email: 'admin@demo.com',
    perfil: 'admin'
  },
  categorias: [
    { id: '1', nome: 'Agricultura Regenerativa', descricao: 'Práticas de agricultura regenerativa', criado_em: '2024-01-15' },
    { id: '2', nome: 'Insumos Orgânicos', descricao: 'Fertilizantes e insumos orgânicos', criado_em: '2024-01-16' },
    { id: '3', nome: 'Manejo de Solo', descricao: 'Técnicas de manejo e conservação do solo', criado_em: '2024-01-17' },
    { id: '4', nome: 'Biodiversidade', descricao: 'Preservação e recuperação da biodiversidade', criado_em: '2024-01-18' }
  ],
  insumos: [
    { id: '1', nome: 'Composto Orgânico', descricao: 'Adubo orgânico compostado' },
    { id: '2', nome: 'Biofertilizante', descricao: 'Fertilizante líquido biológico' },
    { id: '3', nome: 'Calcário Dolomítico', descricao: 'Corretivo de acidez do solo' },
    { id: '4', nome: 'Bokashi', descricao: 'Adubo fermentado japonês' }
  ],
  artigos: [
    {
      id: '1',
      titulo: 'Introdução à Agricultura Regenerativa',
      resumo: 'Um guia completo sobre os princípios da agricultura regenerativa e como aplicá-los na sua propriedade.',
      conteudo: 'A agricultura regenerativa é um sistema de práticas agrícolas que visa restaurar a saúde do solo...',
      autor: 'Dr. João Silva',
      fonte: 'Revista Agro Sustentável',
      status: 'publicado',
      data_publicacao: '2024-02-10',
      criado_em: '2024-02-01',
      atualizado_em: '2024-02-10',
      artigos_categorias: [{ categorias: { id: '1', nome: 'Agricultura Regenerativa' } }],
      artigos_insumos: [{ insumos_regenerativos: { id: '1', nome: 'Composto Orgânico' } }],
      metadados_artigos: { cultura_agricola: 'Soja', regiao: 'Cerrado' }
    },
    {
      id: '2',
      titulo: 'Manejo Integrado de Pragas com Controle Biológico',
      resumo: 'Estratégias eficientes para controle de pragas utilizando métodos naturais e sustentáveis.',
      conteudo: 'O controle biológico de pragas é uma alternativa sustentável aos pesticidas químicos...',
      autor: 'Dra. Maria Santos',
      fonte: 'Instituto de Pesquisas Agrícolas',
      status: 'publicado',
      data_publicacao: '2024-02-15',
      criado_em: '2024-02-12',
      atualizado_em: '2024-02-15',
      artigos_categorias: [{ categorias: { id: '4', nome: 'Biodiversidade' } }],
      artigos_insumos: [{ insumos_regenerativos: { id: '2', nome: 'Biofertilizante' } }],
      metadados_artigos: { cultura_agricola: 'Milho', regiao: 'Sul' }
    },
    {
      id: '3',
      titulo: 'Técnicas de Compostagem para Pequenas Propriedades',
      resumo: 'Como produzir composto orgânico de qualidade em pequena escala.',
      conteudo: 'A compostagem é um processo natural de decomposição de matéria orgânica...',
      autor: 'Pedro Oliveira',
      fonte: 'Embrapa',
      status: 'rascunho',
      data_publicacao: null,
      criado_em: '2024-02-20',
      atualizado_em: '2024-02-20',
      artigos_categorias: [{ categorias: { id: '2', nome: 'Insumos Orgânicos' } }],
      artigos_insumos: [{ insumos_regenerativos: { id: '1', nome: 'Composto Orgânico' } }, { insumos_regenerativos: { id: '4', nome: 'Bokashi' } }],
      metadados_artigos: { cultura_agricola: 'Hortaliças', regiao: 'Sudeste' }
    },
    {
      id: '4',
      titulo: 'Recuperação de Pastagens Degradadas',
      resumo: 'Métodos eficazes para restaurar pastagens e aumentar a produtividade pecuária.',
      conteudo: 'A degradação de pastagens é um problema sério que afeta milhões de hectares no Brasil...',
      autor: 'Carlos Mendes',
      fonte: 'Universidade Federal de Viçosa',
      status: 'publicado',
      data_publicacao: '2024-01-25',
      criado_em: '2024-01-20',
      atualizado_em: '2024-01-25',
      artigos_categorias: [{ categorias: { id: '3', nome: 'Manejo de Solo' } }],
      artigos_insumos: [{ insumos_regenerativos: { id: '3', nome: 'Calcário Dolomítico' } }],
      metadados_artigos: { cultura_agricola: 'Pastagem', regiao: 'Centro-Oeste' }
    },
    {
      id: '5',
      titulo: 'Sistemas Agroflorestais: Integrando Produção e Conservação',
      resumo: 'Como implementar sistemas agroflorestais que combinam produção agrícola com preservação ambiental.',
      conteudo: 'Os sistemas agroflorestais (SAFs) representam uma forma de uso da terra...',
      autor: 'Ana Costa',
      fonte: 'Instituto Socioambiental',
      status: 'arquivado',
      data_publicacao: '2023-11-10',
      criado_em: '2023-11-01',
      atualizado_em: '2023-12-01',
      artigos_categorias: [{ categorias: { id: '1', nome: 'Agricultura Regenerativa' } }, { categorias: { id: '4', nome: 'Biodiversidade' } }],
      artigos_insumos: [],
      metadados_artigos: { cultura_agricola: 'Café', regiao: 'Mata Atlântica' }
    }
  ]
};

// Classe principal que gerencia todas as requisicoes HTTP
class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.mockMode = MOCK_MODE;
    
    if (this.mockMode) {
      console.log('🔧 MODO MOCK ATIVO - Dados simulados');
    }
  }

  // Recuperando token de autenticacao do navegador
  getToken() {
    return localStorage.getItem('token');
  }

  // Salvando token de autenticacao no navegador
  setToken(token) {
    localStorage.setItem('token', token);
  }

  // Removendo credenciais ao fazer logout
  removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }

  // Verificando se o usuario possui sessao ativa
  isAuthenticated() {
    return !!this.getToken();
  }

  // Montando headers padrao para todas as requisicoes
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Executando requisicao HTTP generica com tratamento de erros
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Se for 401, redireciona para login
        if (response.status === 401) {
          this.removeToken();
          window.location.hash = '#/login';
        }
        throw new Error(data.error || 'Erro na requisição');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Requisicao GET com suporte a query params
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  // Requisicao POST para criar novos recursos
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Requisicao PUT para atualizar recursos completos
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Requisicao PATCH para atualizacoes parciais
  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Requisicao DELETE para remover recursos
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ─── AUTENTICACAO ───────────────────────────────────────────────────────────

  // Realizando login e salvando credenciais do usuario
  async login(email, senha) {
    if (this.mockMode) {
      // Simula delay de rede
      await this.mockDelay();
      // Aceita qualquer credencial no modo mock
      const response = {
        token: 'mock-jwt-token-12345',
        usuario: MOCK_DATA.usuario
      };
      this.setToken(response.token);
      localStorage.setItem('usuario', JSON.stringify(response.usuario));
      return response;
    }
    
    const response = await this.post('/auth/login', { email, senha });
    if (response.token) {
      this.setToken(response.token);
      localStorage.setItem('usuario', JSON.stringify(response.usuario));
    }
    return response;
  }

  // Encerrando sessao e redirecionando para login
  logout() {
    this.removeToken();
    window.location.hash = '#/login';
  }

  // Buscando dados do usuario autenticado na API
  async getMe() {
    return this.get('/auth/me');
  }

  // Recuperando dados do usuario do armazenamento local
  getUsuario() {
    const usuario = localStorage.getItem('usuario');
    return usuario ? JSON.parse(usuario) : null;
  }

  // ─── ARTIGOS ────────────────────────────────────────────────────────────────

  // Listando artigos com filtros de busca, status e paginacao
  async listarArtigos(params = {}) {
    if (this.mockMode) {
      await this.mockDelay();
      let artigos = [...MOCK_DATA.artigos];
      
      // Filtro por busca
      if (params.busca) {
        const termo = params.busca.toLowerCase();
        artigos = artigos.filter(a => 
          a.titulo.toLowerCase().includes(termo) ||
          a.resumo?.toLowerCase().includes(termo)
        );
      }
      
      // Filtro por status
      if (params.status) {
        artigos = artigos.filter(a => a.status === params.status);
      }
      
      // Paginação
      const page = parseInt(params.page) || 1;
      const limit = parseInt(params.limit) || 10;
      const total = artigos.length;
      const start = (page - 1) * limit;
      const paginados = artigos.slice(start, start + limit);
      
      return {
        data: paginados,
        meta: { total, page, limit, pages: Math.ceil(total / limit) }
      };
    }
    return this.get('/artigos', params);
  }

  // Buscando detalhes completos de um artigo especifico
  async obterArtigo(id) {
    if (this.mockMode) {
      await this.mockDelay();
      const artigo = MOCK_DATA.artigos.find(a => a.id === id);
      if (!artigo) throw new Error('Artigo não encontrado');
      return { data: artigo };
    }
    return this.get(`/artigos/${id}`);
  }

  // Criando novo artigo com dados do formulario
  async criarArtigo(dados) {
    if (this.mockMode) {
      await this.mockDelay();
      const novoArtigo = {
        id: String(Date.now()),
        ...dados,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        artigos_categorias: [],
        artigos_insumos: [],
        metadados_artigos: {}
      };
      MOCK_DATA.artigos.unshift(novoArtigo);
      return { data: novoArtigo, message: 'Artigo criado com sucesso.' };
    }
    return this.post('/artigos', dados);
  }

  // Atualizando dados de um artigo existente
  async atualizarArtigo(id, dados) {
    if (this.mockMode) {
      await this.mockDelay();
      const index = MOCK_DATA.artigos.findIndex(a => a.id === id);
      if (index === -1) throw new Error('Artigo não encontrado');
      MOCK_DATA.artigos[index] = { 
        ...MOCK_DATA.artigos[index], 
        ...dados,
        atualizado_em: new Date().toISOString()
      };
      return { data: MOCK_DATA.artigos[index], message: 'Artigo atualizado com sucesso.' };
    }
    return this.put(`/artigos/${id}`, dados);
  }

  // Alterando status do artigo (rascunho, publicado, arquivado)
  async alterarStatusArtigo(id, status) {
    if (this.mockMode) {
      await this.mockDelay();
      const artigo = MOCK_DATA.artigos.find(a => a.id === id);
      if (!artigo) throw new Error('Artigo não encontrado');
      artigo.status = status;
      artigo.atualizado_em = new Date().toISOString();
      return { data: artigo, message: `Artigo marcado como "${status}".` };
    }
    return this.patch(`/artigos/${id}/status`, { status });
  }

  // Removendo artigo permanentemente da base
  async deletarArtigo(id) {
    if (this.mockMode) {
      await this.mockDelay();
      const index = MOCK_DATA.artigos.findIndex(a => a.id === id);
      if (index === -1) throw new Error('Artigo não encontrado');
      MOCK_DATA.artigos.splice(index, 1);
      return { message: 'Artigo removido com sucesso.' };
    }
    return this.delete(`/artigos/${id}`);
  }

  // ─── CATEGORIAS ─────────────────────────────────────────────────────────────

  // Listando todas as categorias disponiveis
  async listarCategorias() {
    if (this.mockMode) {
      await this.mockDelay();
      return { data: MOCK_DATA.categorias };
    }
    return this.get('/categorias');
  }

  // Buscando dados de uma categoria especifica
  async obterCategoria(id) {
    if (this.mockMode) {
      await this.mockDelay();
      const categoria = MOCK_DATA.categorias.find(c => c.id === id);
      if (!categoria) throw new Error('Categoria não encontrada');
      return { data: categoria };
    }
    return this.get(`/categorias/${id}`);
  }

  // Criando nova categoria no sistema
  async criarCategoria(dados) {
    if (this.mockMode) {
      await this.mockDelay();
      const nova = { id: String(Date.now()), ...dados, criado_em: new Date().toISOString() };
      MOCK_DATA.categorias.push(nova);
      return { data: nova, message: 'Categoria criada com sucesso.' };
    }
    return this.post('/categorias', dados);
  }

  // Atualizando dados de uma categoria existente
  async atualizarCategoria(id, dados) {
    if (this.mockMode) {
      await this.mockDelay();
      const index = MOCK_DATA.categorias.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Categoria não encontrada');
      MOCK_DATA.categorias[index] = { ...MOCK_DATA.categorias[index], ...dados };
      return { data: MOCK_DATA.categorias[index], message: 'Categoria atualizada.' };
    }
    return this.put(`/categorias/${id}`, dados);
  }

  // Removendo categoria da base de dados
  async deletarCategoria(id) {
    if (this.mockMode) {
      await this.mockDelay();
      const index = MOCK_DATA.categorias.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Categoria não encontrada');
      MOCK_DATA.categorias.splice(index, 1);
      return { message: 'Categoria removida com sucesso.' };
    }
    return this.delete(`/categorias/${id}`);
  }

  // ─── INSUMOS ────────────────────────────────────────────────────────────────

  // Listando todos os insumos regenerativos cadastrados
  async listarInsumos() {
    if (this.mockMode) {
      await this.mockDelay();
      return { data: MOCK_DATA.insumos };
    }
    return this.get('/insumos');
  }

  // Buscando dados de um insumo especifico
  async obterInsumo(id) {
    if (this.mockMode) {
      await this.mockDelay();
      const insumo = MOCK_DATA.insumos.find(i => i.id === id);
      if (!insumo) throw new Error('Insumo não encontrado');
      return { data: insumo };
    }
    return this.get(`/insumos/${id}`);
  }

  // Cadastrando novo insumo regenerativo
  async criarInsumo(dados) {
    if (this.mockMode) {
      await this.mockDelay();
      const novo = { id: String(Date.now()), ...dados };
      MOCK_DATA.insumos.push(novo);
      return { data: novo, message: 'Insumo criado com sucesso.' };
    }
    return this.post('/insumos', dados);
  }

  // Atualizando informacoes de um insumo existente
  async atualizarInsumo(id, dados) {
    if (this.mockMode) {
      await this.mockDelay();
      const index = MOCK_DATA.insumos.findIndex(i => i.id === id);
      if (index === -1) throw new Error('Insumo não encontrado');
      MOCK_DATA.insumos[index] = { ...MOCK_DATA.insumos[index], ...dados };
      return { data: MOCK_DATA.insumos[index], message: 'Insumo atualizado.' };
    }
    return this.put(`/insumos/${id}`, dados);
  }

  // Removendo insumo do cadastro
  async deletarInsumo(id) {
    if (this.mockMode) {
      await this.mockDelay();
      const index = MOCK_DATA.insumos.findIndex(i => i.id === id);
      if (index === -1) throw new Error('Insumo não encontrado');
      MOCK_DATA.insumos.splice(index, 1);
      return { message: 'Insumo removido com sucesso.' };
    }
    return this.delete(`/insumos/${id}`);
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  // Simulando delay de rede para testes em modo mock
  mockDelay(ms = 300) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exportando instancia unica do servico de API
const api = new ApiService();
export default api;
