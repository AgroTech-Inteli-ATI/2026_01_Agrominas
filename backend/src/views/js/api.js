// Servico de comunicacao com a API do backend
// Permite alternar entre modo real e mock para desenvolvimento

const API_BASE_URL = 'http://localhost:3000/api/v1';
const MOCK_MODE = true; // Mude para true para usar dados simulados sem backend

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
      metadados_artigos: { cultura: 'Soja', regiao: 'Cerrado' }
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
      metadados_artigos: { cultura: 'Milho', regiao: 'Sul' }
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
      metadados_artigos: { cultura: 'Hortaliças', regiao: 'Sudeste' }
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
      metadados_artigos: { cultura: 'Pastagem', regiao: 'Centro-Oeste' }
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
      metadados_artigos: { cultura: 'Café', regiao: 'Mata Atlântica' }
    }
  ],
  perguntas_bot: [
    {
      id: 'p1',
      pergunta: 'Como usar fertilizante no preparo do solo para soja?',
      frequencia: 34,
      cultura: 'Soja',
      regiao: 'Centro-Oeste',
      respondida_com_sucesso: true,
      criada_em: '2026-02-04T10:00:00.000Z',
      atualizada_em: '2026-04-12T11:30:00.000Z'
    },
    {
      id: 'p2',
      pergunta: 'Qual a dose recomendada de biofertilizante em cana-de-acucar?',
      frequencia: 29,
      cultura: 'Cana',
      regiao: 'Sudeste',
      respondida_com_sucesso: true,
      criada_em: '2026-02-08T10:00:00.000Z',
      atualizada_em: '2026-04-08T09:10:00.000Z'
    },
    {
      id: 'p3',
      pergunta: 'Como recuperar solo com baixa materia organica em milho?',
      frequencia: 25,
      cultura: 'Milho',
      regiao: 'Centro-Oeste',
      respondida_com_sucesso: false,
      criada_em: '2026-02-12T10:00:00.000Z',
      atualizada_em: '2026-04-03T18:25:00.000Z'
    },
    {
      id: 'p4',
      pergunta: 'Quando aplicar composto organico em hortas comerciais?',
      frequencia: 21,
      cultura: 'Hortalicas',
      regiao: 'Sudeste',
      respondida_com_sucesso: true,
      criada_em: '2026-02-16T10:00:00.000Z',
      atualizada_em: '2026-03-28T13:40:00.000Z'
    },
    {
      id: 'p5',
      pergunta: 'Existe manejo regenerativo para pastagem degradada?',
      frequencia: 18,
      cultura: 'Pastagem',
      regiao: 'Centro-Oeste',
      respondida_com_sucesso: true,
      criada_em: '2026-02-18T10:00:00.000Z',
      atualizada_em: '2026-03-25T08:10:00.000Z'
    },
    {
      id: 'p6',
      pergunta: 'Como reduzir compactacao do solo no cafezal?',
      frequencia: 16,
      cultura: 'Cafe',
      regiao: 'Sudeste',
      respondida_com_sucesso: false,
      criada_em: '2026-02-21T10:00:00.000Z',
      atualizada_em: '2026-03-20T19:50:00.000Z'
    },
    {
      id: 'p7',
      pergunta: 'Quais praticas regenerativas ajudam no solo arenoso?',
      frequencia: 14,
      cultura: 'Milho',
      regiao: 'Nordeste',
      respondida_com_sucesso: true,
      criada_em: '2026-02-24T10:00:00.000Z',
      atualizada_em: '2026-03-18T09:40:00.000Z'
    },
    {
      id: 'p8',
      pergunta: 'Em qual fase aplicar inoculantes na soja?',
      frequencia: 12,
      cultura: 'Soja',
      regiao: 'Norte',
      respondida_com_sucesso: true,
      criada_em: '2026-02-26T10:00:00.000Z',
      atualizada_em: '2026-03-11T11:00:00.000Z'
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

  // ─── UPLOAD / PROCESSAMENTO DE PDF ─────────────────────────────────────────

  // Envia PDF para o backend e retorna metadados extraídos (sem salvar no banco)
  async processarPDF(file) {
    if (this.mockMode) {
      await this.mockDelay(800);
      const nome = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      return {
        data: {
          titulo: nome,
          resumo: null,
          autor: null,
          fonte: null,
          conteudo: `[Conteúdo simulado do PDF: ${file.name}]`,
          nome_arquivo: file.name,
        },
      };
    }

    const formData = new FormData();
    formData.append('arquivo', file);

    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}/artigos/processar-pdf`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        this.removeToken();
        window.location.hash = '#/login';
      }
      throw new Error(data.error || 'Erro ao processar PDF');
    }

    return data;
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

  // ─── ADMIN / GESTAO DO BOT ────────────────────────────────────────────────

  // Lista perguntas pre-setadas do bot com filtros e paginacao
  async listarPerguntasBot(params = {}) {
    if (this.mockMode) {
      await this.mockDelay();

      let perguntas = [...MOCK_DATA.perguntas_bot];

      if (params.busca) {
        const termo = String(params.busca).toLowerCase();
        perguntas = perguntas.filter((item) => item.pergunta.toLowerCase().includes(termo));
      }

      if (params.cultura) {
        const cultura = String(params.cultura).toLowerCase();
        perguntas = perguntas.filter((item) => String(item.cultura || '').toLowerCase().includes(cultura));
      }

      if (params.regiao) {
        const regiao = String(params.regiao).toLowerCase();
        perguntas = perguntas.filter((item) => String(item.regiao || '').toLowerCase().includes(regiao));
      }

      if (params.respondida_com_sucesso !== undefined && params.respondida_com_sucesso !== '') {
        const sucesso = params.respondida_com_sucesso === true || params.respondida_com_sucesso === 'true';
        perguntas = perguntas.filter((item) => item.respondida_com_sucesso === sucesso);
      }

      if (params.periodo_dias) {
        const dias = Number(params.periodo_dias);
        if (!Number.isNaN(dias) && dias > 0) {
          const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
          perguntas = perguntas.filter((item) => new Date(item.atualizada_em).getTime() >= limite);
        }
      }

      perguntas.sort((a, b) => new Date(b.atualizada_em) - new Date(a.atualizada_em));

      const page = parseInt(params.page, 10) || 1;
      const limit = parseInt(params.limit, 10) || 10;
      const total = perguntas.length;
      const start = (page - 1) * limit;
      const paginados = perguntas.slice(start, start + limit);

      return {
        data: paginados,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    }

    return this.get('/admin/perguntas', params);
  }

  // Cadastra nova pergunta pre-setada
  async criarPerguntaBot(dados) {
    if (this.mockMode) {
      await this.mockDelay();
      const agora = new Date().toISOString();
      const novaPergunta = {
        id: `p-${Date.now()}`,
        pergunta: dados.pergunta,
        frequencia: Number(dados.frequencia || 1),
        cultura: dados.cultura || null,
        regiao: dados.regiao || null,
        respondida_com_sucesso: dados.respondida_com_sucesso !== false,
        criada_em: agora,
        atualizada_em: agora,
      };

      MOCK_DATA.perguntas_bot.unshift(novaPergunta);
      return { data: novaPergunta, message: 'Pergunta cadastrada com sucesso.' };
    }

    return this.post('/admin/perguntas', dados);
  }

  // Atualiza pergunta pre-setada do bot
  async atualizarPerguntaBot(id, dados) {
    if (this.mockMode) {
      await this.mockDelay();
      const index = MOCK_DATA.perguntas_bot.findIndex((item) => item.id === id);
      if (index === -1) throw new Error('Pergunta não encontrada');

      MOCK_DATA.perguntas_bot[index] = {
        ...MOCK_DATA.perguntas_bot[index],
        ...dados,
        atualizada_em: new Date().toISOString(),
      };

      return { data: MOCK_DATA.perguntas_bot[index], message: 'Pergunta atualizada com sucesso.' };
    }

    return this.put(`/admin/perguntas/${id}`, dados);
  }

  // Remove pergunta pre-setada
  async excluirPerguntaBot(id) {
    if (this.mockMode) {
      await this.mockDelay();
      const index = MOCK_DATA.perguntas_bot.findIndex((item) => item.id === id);
      if (index === -1) throw new Error('Pergunta não encontrada');

      MOCK_DATA.perguntas_bot.splice(index, 1);
      return { message: 'Pergunta removida com sucesso.' };
    }

    return this.delete(`/admin/perguntas/${id}`);
  }

  // Recupera analiticos do dashboard da Gestao do Bot
  async obterDashboardBot(params = {}) {
    if (this.mockMode) {
      await this.mockDelay();
      const periodoDias = Number(params.periodo_dias || 30);
      const top = Number(params.top || 10);

      return {
        data: this.gerarDashboardMockPerguntas(periodoDias, top),
        meta: {
          origem: 'mock',
          aviso: 'Dados simulados locais da aplicacao frontend.',
        },
      };
    }

    return this.get('/admin/dashboard/perguntas', params);
  }

  // Recupera historico de inclusoes e ultimas atualizacoes de artigos
  async obterHistoricoArtigosBot(params = {}) {
    if (this.mockMode) {
      await this.mockDelay();

      const eventos = [];
      const artigos = [...MOCK_DATA.artigos].sort(
        (a, b) => new Date(b.atualizado_em) - new Date(a.atualizado_em)
      );

      for (const artigo of artigos) {
        eventos.push({
          id: `${artigo.id}-criado`,
          artigo_id: artigo.id,
          titulo: artigo.titulo,
          status: artigo.status,
          tipo: 'criado',
          descricao: 'Artigo adicionado na biblioteca.',
          data_evento: artigo.criado_em,
          usuario: 'Admin Demo',
          autor_artigo: artigo.autor,
          fonte: artigo.fonte,
        });

        if (artigo.atualizado_em !== artigo.criado_em) {
          eventos.push({
            id: `${artigo.id}-atualizado`,
            artigo_id: artigo.id,
            titulo: artigo.titulo,
            status: artigo.status,
            tipo: 'atualizado',
            descricao: 'Ultima atualizacao de conteudo/status registrada.',
            data_evento: artigo.atualizado_em,
            usuario: 'Admin Demo',
            autor_artigo: artigo.autor,
            fonte: artigo.fonte,
          });
        }
      }

      eventos.sort((a, b) => new Date(b.data_evento) - new Date(a.data_evento));

      return {
        data: {
          eventos,
          artigos,
        },
        meta: {
          total: artigos.length,
          page: 1,
          limit: Number(params.limit || 20),
          pages: 1,
        },
      };
    }

    return this.get('/admin/artigos/historico', params);
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  // Gera agregacoes de dashboard a partir dos dados mockados
  gerarDashboardMockPerguntas(periodoDias = 30, top = 10) {
    const limite = Date.now() - Number(periodoDias || 30) * 24 * 60 * 60 * 1000;
    let registros = MOCK_DATA.perguntas_bot.filter((item) => {
      const data = new Date(item.atualizada_em).getTime();
      return !Number.isNaN(data) && data >= limite;
    });

    if (!registros.length) {
      registros = [...MOCK_DATA.perguntas_bot];
    }

    const perguntasMap = new Map();
    const regioesMap = new Map();
    const matrizMap = new Map();
    let totalInteracoes = 0;
    let respostasSucesso = 0;

    for (const item of registros) {
      const pergunta = item.pergunta || 'Pergunta nao informada';
      const regiao = item.regiao || 'Nao informado';
      const cultura = item.cultura || 'Nao informado';
      const frequencia = Number(item.frequencia || 0);
      const sucesso = item.respondida_com_sucesso === true;

      totalInteracoes += frequencia;
      if (sucesso) respostasSucesso += frequencia;

      if (!perguntasMap.has(pergunta)) {
        perguntasMap.set(pergunta, {
          pergunta,
          frequencia_total: 0,
          sucesso_interacoes: 0,
          regioes: new Set(),
          culturas: new Set(),
        });
      }

      const perguntaAtual = perguntasMap.get(pergunta);
      perguntaAtual.frequencia_total += frequencia;
      perguntaAtual.sucesso_interacoes += sucesso ? frequencia : 0;
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
      .slice(0, Math.max(Number(top) || 10, 1))
      .map((item) => ({
        pergunta: item.pergunta,
        frequencia_total: item.frequencia_total,
        taxa_sucesso: totalInteracoes ? Number(((item.sucesso_interacoes / item.frequencia_total) * 100).toFixed(2)) : 0,
        regioes: Array.from(item.regioes),
        culturas: Array.from(item.culturas),
      }));

    const usoPorRegiao = Array.from(regioesMap.values())
      .sort((a, b) => b.frequencia_total - a.frequencia_total)
      .map((item) => ({
        regiao: item.regiao,
        frequencia_total: item.frequencia_total,
        perguntas_distintas: item.perguntas_distintas.size,
        taxa_sucesso: item.frequencia_total
          ? Number(((item.sucesso_interacoes / item.frequencia_total) * 100).toFixed(2))
          : 0,
      }));

    const regioes = usoPorRegiao.map((item) => item.regiao);
    const series = topPerguntas.slice(0, 5).map((item) => ({
      pergunta: item.pergunta,
      distribuicao: regioes.map((regiao) => matrizMap.get(item.pergunta)?.[regiao] || 0),
    }));

    return {
      periodo_dias: Number(periodoDias || 30),
      resumo: {
        total_interacoes: totalInteracoes,
        perguntas_distintas: perguntasMap.size,
        regioes_ativas: usoPorRegiao.length,
        taxa_sucesso: totalInteracoes ? Number(((respostasSucesso / totalInteracoes) * 100).toFixed(2)) : 0,
        respostas_sucesso: respostasSucesso,
        respostas_falha: Math.max(totalInteracoes - respostasSucesso, 0),
      },
      top_perguntas: topPerguntas,
      uso_por_regiao: usoPorRegiao,
      perguntas_por_regiao: {
        regioes,
        series,
      },
    };
  }

  // Simulando delay de rede para testes em modo mock
  mockDelay(ms = 300) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exportando instancia unica do servico de API
const api = new ApiService();
export default api;
