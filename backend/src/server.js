import 'dotenv/config';
import app from './app.js';
import { supabase } from './config/supabase.js';

const PORT = process.env.PORT || 3000;

// Testa conexão com Supabase antes de subir
async function verificarConexao() {
  const { error } = await supabase.from('artigos').select('id').limit(1);
  if (error && error.code !== 'PGRST116') { // PGRST116 = tabela vazia, tudo certo
    throw new Error(`Falha na conexão com Supabase: ${error.message}`);
  }
  console.log('✅ Conexão com Supabase OK');
}

async function iniciar() {
  try {
    await verificarConexao();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}/api/v1`);
      console.log(`📋 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\nRotas disponíveis:`);
      console.log(`  POST   /api/v1/auth/login`);
      console.log(`  POST   /api/v1/auth/register`);
      console.log(`  GET    /api/v1/auth/me`);
      console.log(`  GET    /api/v1/artigos`);
      console.log(`  POST   /api/v1/artigos`);
      console.log(`  GET    /api/v1/artigos/:id`);
      console.log(`  PUT    /api/v1/artigos/:id`);
      console.log(`  PATCH  /api/v1/artigos/:id/status`);
      console.log(`  DELETE /api/v1/artigos/:id`);
      console.log(`  GET    /api/v1/categorias`);
      console.log(`  POST   /api/v1/categorias`);
      console.log(`  GET    /api/v1/insumos`);
      console.log(`  POST   /api/v1/insumos`);
      console.log(`  POST   /api/v1/bot/webhook`);
      console.log(`  POST   /api/v1/bot/buscar`);
      console.log(`  GET    /api/v1/bot/metricas`);
      console.log(`  GET    /api/v1/health`);
    });
  } catch (err) {
    console.error('❌ Erro ao iniciar servidor:', err.message);
    process.exit(1);
  }
}

iniciar();
