/**
 * Seed do banco de dados — Guia Regenerativo
 *
 * Popula: usuário admin, categorias, insumos e artigos (via PDF).
 * É seguro rodar múltiplas vezes — usa upsert em todos os passos.
 *
 * Uso: node backend/src/database/seed.js
 *
 * Antes de rodar:
 *   1. Configure o .env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 *   2. Execute as migrations 001 e 002 no Supabase
 *   3. Coloque os PDFs em backend/src/database/pdfs/
 *   4. Edite o array ARTIGOS abaixo com os metadados de cada PDF
 */

import { createClient } from '@supabase/supabase-js'; // inicializado em main()
import bcrypt from 'bcryptjs';
// pdfjs-dist é importado dinamicamente em extrairTextoPDF,
// após os polyfills serem definidos (imports estáticos são hoistados,
// impossibilitando polyfill antes da avaliação do módulo).
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const __dirname = dirname(fileURLToPath(import.meta.url));

// Polyfills de APIs do browser exigidas pelo pdfjs-dist em ambiente Node.js
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      Object.assign(this, { a:1,b:0,c:0,d:1,e:0,f:0,
        m11:1,m12:0,m13:0,m14:0,m21:0,m22:1,m23:0,m24:0,
        m31:0,m32:0,m33:1,m34:0,m41:0,m42:0,m43:0,m44:1,
        is2D: true, isIdentity: true });
    }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    inverse() { return this; }
    transformPoint(p) { return p; }
  };
}
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); }
  };
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {};
}

// Client criado após dotenv carregar as variáveis
let supabase;

// ─── CONFIGURAÇÃO ────────────────────────────────────────────────────────────

const ADMIN = {
  nome: 'Admin Agrominas',
  email: 'admin@agrominas.com',
  senha: 'Admin@1234',
  perfil: 'admin',
};

const CATEGORIAS = [
  { nome: 'Manejo do Solo', descricao: 'Técnicas de manejo e conservação do solo' },
  { nome: 'Bioinsumos', descricao: 'Fertilizantes e insumos biológicos' },
  { nome: 'Recuperação Ambiental', descricao: 'Restauração de áreas degradadas' },
  { nome: 'Agricultura Regenerativa', descricao: 'Práticas de agricultura regenerativa' },
  { nome: 'Controle Biológico', descricao: 'Controle de pragas por métodos naturais' },
];

const INSUMOS = [
  {
    nome: 'Bokashi',
    descricao: 'Adubo fermentado de origem japonesa',
    beneficios: 'Melhora a microbiota do solo e fornece nutrientes',
    modo_aplicacao: 'Incorporar ao solo antes do plantio',
  },
  {
    nome: 'Biofertilizante',
    descricao: 'Fertilizante líquido biológico',
    beneficios: 'Estimula o crescimento radicular e aumenta a absorção de nutrientes',
    modo_aplicacao: 'Aplicar via fertirrigação ou pulverização foliar',
  },
  {
    nome: 'Composto Orgânico',
    descricao: 'Adubo orgânico compostado a partir de resíduos vegetais e animais',
    beneficios: 'Aumenta a matéria orgânica e melhora a estrutura do solo',
    modo_aplicacao: 'Incorporar ao solo na adubação de plantio',
  },
  {
    nome: 'Calcário Dolomítico',
    descricao: 'Corretivo de acidez do solo com cálcio e magnésio',
    beneficios: 'Eleva o pH e fornece cálcio e magnésio às plantas',
    modo_aplicacao: 'Aplicar a lanço e incorporar com grade antes do plantio',
  },
  {
    nome: 'Húmus de Minhoca',
    descricao: 'Adubo orgânico produzido pela vermicompostagem',
    beneficios: 'Rico em nutrientes e hormônios de crescimento vegetal',
    modo_aplicacao: 'Aplicar no sulco de plantio ou em cobertura',
  },
];

/**
 * Defina aqui os metadados de cada PDF que está em pdfs/.
 * O campo "arquivo" deve corresponder ao nome do arquivo em pdfs/.
 * Os campos "categorias" e "insumos" usam os nomes definidos acima.
 */
const ARTIGOS = [
  // Exemplo — substitua ou adicione conforme seus PDFs:
  // {
  //   arquivo: 'manejo-solo-regenerativo.pdf',
  //   titulo: 'Manejo do Solo em Sistemas Regenerativos',
  //   resumo: 'Práticas de manejo do solo que promovem a saúde e a biodiversidade.',
  //   autor: 'Embrapa Solos',
  //   fonte: 'Embrapa, 2023',
  //   data_publicacao: '2023-06-15',
  //   status: 'publicado',
  //   categorias: ['Manejo do Solo', 'Agricultura Regenerativa'],
  //   insumos: ['Bokashi', 'Composto Orgânico'],
  //   metadados: {
  //     cultura: 'Soja',
  //     regiao: 'Cerrado',
  //     tipo_solo: 'Latossolo Vermelho',
  //     nivel_evidencia: 'alto',
  //     palavras_chave: 'solo, cobertura, plantio direto',
  //   },
  // },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

function erro(msg, err) {
  console.error(`❌  ${msg}`, err?.message || err);
}

async function extrairTextoPDF(caminhoAbsoluto) {
  // Import dinâmico garante que os polyfills acima já estão definidos
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const buffer = readFileSync(caminhoAbsoluto);
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;

  let textoCompleto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const conteudo = await pagina.getTextContent();
    const textoPagina = conteudo.items.map((item) => item.str).join(' ');
    textoCompleto += textoPagina + '\n';
  }

  return textoCompleto.trim();
}

// ─── ETAPAS ──────────────────────────────────────────────────────────────────

async function seedAdmin() {
  log('👤', `Verificando usuário admin (${ADMIN.email})...`);

  const { data: existente } = await supabase
    .from('usuarios_admin')
    .select('id')
    .eq('email', ADMIN.email)
    .single();

  if (existente) {
    log('✅', 'Usuário admin já existe — pulando.');
    return existente.id;
  }

  const senhaHash = await bcrypt.hash(ADMIN.senha, 12);

  const { data, error } = await supabase
    .from('usuarios_admin')
    .insert({ nome: ADMIN.nome, email: ADMIN.email, senha_hash: senhaHash, perfil: ADMIN.perfil })
    .select('id')
    .single();

  if (error) {
    erro('Falha ao criar admin.', error);
    process.exit(1);
  }

  log('✅', `Admin criado: ${ADMIN.email} / senha: ${ADMIN.senha}`);
  return data.id;
}

async function seedCategorias() {
  log('📂', 'Inserindo categorias...');

  const { error } = await supabase
    .from('categorias')
    .upsert(CATEGORIAS, { onConflict: 'nome', ignoreDuplicates: false });

  if (error) {
    erro('Falha ao inserir categorias.', error);
    process.exit(1);
  }

  const { data } = await supabase.from('categorias').select('id, nome');
  log('✅', `${data.length} categorias no banco.`);
  return Object.fromEntries(data.map((c) => [c.nome, c.id]));
}

async function seedInsumos() {
  log('🌱', 'Inserindo insumos...');

  const { error } = await supabase
    .from('insumos_regenerativos')
    .upsert(INSUMOS, { onConflict: 'nome', ignoreDuplicates: false });

  if (error) {
    erro('Falha ao inserir insumos.', error);
    process.exit(1);
  }

  const { data } = await supabase.from('insumos_regenerativos').select('id, nome');
  log('✅', `${data.length} insumos no banco.`);
  return Object.fromEntries(data.map((i) => [i.nome, i.id]));
}

async function seedArtigos(adminId, mapCategorias, mapInsumos) {
  if (ARTIGOS.length === 0) {
    log('⚠️ ', 'Nenhum artigo configurado em ARTIGOS. Adicione entradas no seed.js.');
    return;
  }

  log('📄', `Processando ${ARTIGOS.length} artigo(s)...`);

  for (const artigo of ARTIGOS) {
    const caminhoPDF = resolve(__dirname, 'pdfs', artigo.arquivo);

    if (!existsSync(caminhoPDF)) {
      erro(`PDF não encontrado: ${caminhoPDF} — artigo "${artigo.titulo}" pulado.`);
      continue;
    }

    log('📖', `Extraindo texto de ${artigo.arquivo}...`);
    let conteudo;
    try {
      conteudo = await extrairTextoPDF(caminhoPDF);
    } catch (e) {
      erro(`Falha ao ler PDF "${artigo.arquivo}".`, e);
      continue;
    }

    if (!conteudo) {
      erro(`PDF "${artigo.arquivo}" gerou texto vazio — pulando.`);
      continue;
    }

    // Upsert do artigo principal
    const { data: artigoSalvo, error: errArtigo } = await supabase
      .from('artigos')
      .upsert(
        {
          titulo: artigo.titulo,
          resumo: artigo.resumo || null,
          conteudo,
          autor: artigo.autor || null,
          fonte: artigo.fonte || null,
          data_publicacao: artigo.data_publicacao || null,
          status: artigo.status || 'rascunho',
          criado_por: adminId,
        },
        { onConflict: 'titulo' }
      )
      .select('id')
      .single();

    if (errArtigo) {
      erro(`Falha ao salvar artigo "${artigo.titulo}".`, errArtigo);
      continue;
    }

    const artigoId = artigoSalvo.id;

    // Recria associações de categorias
    if (artigo.categorias?.length) {
      await supabase.from('artigos_categorias').delete().eq('artigo_id', artigoId);
      const assocCats = artigo.categorias
        .filter((nome) => mapCategorias[nome])
        .map((nome) => ({ artigo_id: artigoId, categoria_id: mapCategorias[nome] }));

      if (assocCats.length) {
        const { error: errCat } = await supabase.from('artigos_categorias').insert(assocCats);
        if (errCat) erro(`Falha nas categorias do artigo "${artigo.titulo}".`, errCat);
      }
    }

    // Recria associações de insumos
    if (artigo.insumos?.length) {
      await supabase.from('artigos_insumos').delete().eq('artigo_id', artigoId);
      const assocIns = artigo.insumos
        .filter((nome) => mapInsumos[nome])
        .map((nome) => ({ artigo_id: artigoId, insumo_id: mapInsumos[nome] }));

      if (assocIns.length) {
        const { error: errIns } = await supabase.from('artigos_insumos').insert(assocIns);
        if (errIns) erro(`Falha nos insumos do artigo "${artigo.titulo}".`, errIns);
      }
    }

    // Upsert de metadados
    if (artigo.metadados) {
      const { error: errMeta } = await supabase
        .from('metadados_artigos')
        .upsert({ ...artigo.metadados, artigo_id: artigoId }, { onConflict: 'artigo_id' });
      if (errMeta) erro(`Falha nos metadados do artigo "${artigo.titulo}".`, errMeta);
    }

    log('✅', `Artigo salvo: "${artigo.titulo}"`);
  }
}

// ─── EXECUÇÃO ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌿  Seed — Guia Regenerativo\n');

  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const adminId = await seedAdmin();
  const mapCategorias = await seedCategorias();
  const mapInsumos = await seedInsumos();
  await seedArtigos(adminId, mapCategorias, mapInsumos);

  console.log('\n🎉  Seed concluído!\n');
}

main().catch((err) => {
  console.error('\n💥  Erro inesperado:', err);
  process.exit(1);
});
