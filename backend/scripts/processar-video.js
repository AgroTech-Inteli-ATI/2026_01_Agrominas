/**
 * Processa um vídeo do YouTube para a base de conhecimento da Agrominas.
 *
 * Fluxo:
 *   1. Extrai metadados do vídeo (título, canal) via oEmbed do YouTube
 *   2. Baixa a transcrição via youtube-transcript
 *   3. Resume a transcrição com OpenAI
 *   4. Salva tudo na tabela `videos` do Supabase
 *
 * Como rodar (da pasta backend/):
 *   node --env-file=.env scripts/processar-video.js <url-do-youtube>
 *
 * Exemplos:
 *   node --env-file=.env scripts/processar-video.js https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *   node --env-file=.env scripts/processar-video.js https://youtu.be/dQw4w9WgXcQ
 */

import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';
import { supabase } from '../src/config/supabase.js';
import { resumirTranscricao } from '../src/services/openai.service.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extrairYoutubeId(url) {
  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i,
  );
  if (!match) throw new Error(`URL inválida ou não reconhecida: "${url}"`);
  return match[1];
}

async function obterMetadados(videoId) {
  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const response = await fetch(oEmbedUrl);

  if (!response.ok) {
    console.warn('⚠️  Não foi possível buscar metadados via oEmbed. Usando valores padrão.');
    return { titulo: `Vídeo ${videoId}`, canal: 'Desconhecido' };
  }

  const data = await response.json();
  return { titulo: data.title, canal: data.author_name };
}

async function obterTranscricao(videoId) {
  // Tenta português primeiro, cai para qualquer idioma disponível
  try {
    const segmentos = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'pt' });
    return segmentos.map((s) => s.text).join(' ');
  } catch {
    const segmentos = await YoutubeTranscript.fetchTranscript(videoId);
    return segmentos.map((s) => s.text).join(' ');
  }
}

// ─── Pipeline principal ───────────────────────────────────────────────────────

async function processarVideo(urlYoutube) {
  console.log('\n🎬  PROCESSAR VÍDEO — Agrominas');
  console.log('═'.repeat(50));
  console.log(`URL: ${urlYoutube}`);

  // 1. Extrai o ID do vídeo
  const videoId = extrairYoutubeId(urlYoutube);
  const urlNormalizada = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`ID do vídeo: ${videoId}`);

  // 2. Verifica se já existe no banco
  const { data: existente } = await supabase
    .from('videos')
    .select('id, titulo')
    .eq('youtube_id', videoId)
    .maybeSingle();

  if (existente) {
    console.log(`\n⚠️  Vídeo já cadastrado: "${existente.titulo}" (${existente.id})`);
    console.log('   Use o Supabase para atualizar manualmente se necessário.');
    return;
  }

  // 3. Busca metadados
  console.log('\n📋  Buscando metadados...');
  const { titulo, canal } = await obterMetadados(videoId);
  console.log(`   Título : ${titulo}`);
  console.log(`   Canal  : ${canal}`);

  // 4. Baixa transcrição
  console.log('\n📝  Baixando transcrição...');
  const transcricao = await obterTranscricao(videoId);
  console.log(`   ${transcricao.length} caracteres extraídos`);

  if (transcricao.trim().length < 100) {
    throw new Error('Transcrição muito curta ou vazia — o vídeo pode não ter legendas habilitadas.');
  }

  // 5. Resume com IA
  console.log('\n🤖  Gerando resumo com OpenAI...');
  const inicio = Date.now();
  const resumo = await resumirTranscricao(titulo, transcricao);
  console.log(`   ${resumo.length} caracteres — ${Date.now() - inicio}ms`);

  // 6. Salva no Supabase
  console.log('\n💾  Salvando no banco...');
  const { data, error } = await supabase
    .from('videos')
    .insert({
      titulo,
      url_youtube: urlNormalizada,
      youtube_id: videoId,
      canal,
      transcricao,
      resumo,
      status: 'publicado',
    })
    .select('id, titulo, criado_em')
    .single();

  if (error) throw new Error(`Erro ao salvar no Supabase: ${error.message}`);

  console.log('\n✅  Vídeo processado com sucesso!');
  console.log('─'.repeat(50));
  console.log(`   ID     : ${data.id}`);
  console.log(`   Título : ${data.titulo}`);
  console.log(`   Criado : ${data.criado_em}`);
  console.log('─'.repeat(50));
  console.log('\nO vídeo já está disponível como fonte de conhecimento no bot. 🌱');
}

// ─── Entrada CLI ──────────────────────────────────────────────────────────────

const url = process.argv[2];

if (!url) {
  console.error('❌  URL não informada.');
  console.error('    Uso: node --env-file=.env scripts/processar-video.js <url-do-youtube>');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('❌  OPENAI_API_KEY não encontrada no .env');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env');
  process.exit(1);
}

processarVideo(url).catch((err) => {
  console.error(`\n💥  Erro: ${err.message}`);
  process.exit(1);
});
