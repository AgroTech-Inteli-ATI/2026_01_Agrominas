/**
 * Teste local do RAG com PDF
 * Simula o que acontece quando o agricultor manda um laudo pelo WhatsApp
 *
 * Como rodar (da pasta backend/):
 *   node --env-file=.env scripts/testar_pdf_rag.js
 *
 * Para testar com um PDF real, coloque o arquivo em backend/src/database/pdfs/
 * e ajuste o caminho abaixo em PDF_TESTE.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  extrairTextoPDF,
  estruturarDadosPDF,
} from "../src/services/pdf.service.js";
import { gerarRespostaComOpenAI } from "../src/services/openai.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Caminho para o PDF de teste — ajuste conforme necessário
const PDF_TESTE = path.join(
  __dirname,
  "../src/database/pdfs/laudo_analise_solo_regenerativo.pdf",
);

// Perguntas que simulam mensagens reais do agricultor após enviar o laudo
const PERGUNTAS_TESTE = [
  "O que significa esse laudo do meu solo?",
  "O que eu preciso fazer para melhorar meu solo?",
  "Quais insumos devo usar com base nessa análise?",
];

async function rodarTeste() {
  console.log("🧪 TESTE RAG COM PDF — GUIA REGENERATIVO");
  console.log("=".repeat(50));

  // Verifica variáveis de ambiente
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY não encontrada no .env");
    process.exit(1);
  }

  // ── TESTE 1: Extração do PDF ──────────────────────────────────────────────
  console.log("\n📄 TESTE 1 — Extração do PDF");
  console.log("─".repeat(50));

  let dadosPDF = null;

  if (!fs.existsSync(PDF_TESTE)) {
    console.log(`⚠️  PDF não encontrado em: ${PDF_TESTE}`);
    console.log("   Rodando teste sem PDF (modo texto puro)...");
  } else {
    const pdfBuffer = fs.readFileSync(PDF_TESTE);
    const textoPDF = await extrairTextoPDF(pdfBuffer);
    dadosPDF = estruturarDadosPDF(textoPDF);

    console.log("✅ PDF extraído com sucesso");
    console.log(`   Linhas: ${dadosPDF.total_linhas}`);
    console.log(`   Chars: ${dadosPDF.conteudo_completo.length}`);
    console.log("\n   Preview (10 primeiras linhas):");
    console.log("   " + dadosPDF.preview.replace(/\n/g, "\n   "));
  }

  // ── TESTE 2: Respostas da IA com contexto do PDF ──────────────────────────
  console.log("\n\n🤖 TESTE 2 — Respostas da IA");
  console.log("─".repeat(50));

  for (const pergunta of PERGUNTAS_TESTE) {
    console.log(`\n📝 Pergunta: "${pergunta}"`);

    const inicio = Date.now();
    const resposta = await gerarRespostaComOpenAI(pergunta, dadosPDF);
    const tempo = Date.now() - inicio;

    console.log(`⏱️  Tempo: ${tempo}ms | Chars: ${resposta.length}/4096`);
    console.log("\n💬 Resposta (como apareceria no WhatsApp):");
    console.log("┌" + "─".repeat(52) + "┐");
    resposta.split("\n").forEach((linha) => {
      // Trunca linhas longas para o preview do terminal
      const preview =
        linha.length > 50 ? linha.substring(0, 47) + "..." : linha;
      console.log("│ " + preview.padEnd(50) + " │");
    });
    console.log("└" + "─".repeat(52) + "┘");
  }

  // ── TESTE 3: Sem PDF (pergunta genérica) ──────────────────────────────────
  console.log("\n\n📭 TESTE 3 — Sem PDF (pergunta genérica)");
  console.log("─".repeat(50));

  const perguntaGenerica = "Como posso melhorar a matéria orgânica do solo?";
  console.log(`📝 Pergunta: "${perguntaGenerica}"`);

  const respostaGenerica = await gerarRespostaComOpenAI(perguntaGenerica, null);
  console.log(`\n✅ Resposta gerada (${respostaGenerica.length} chars)`);
  console.log(respostaGenerica.substring(0, 200) + "...");

  console.log("\n\n" + "=".repeat(50));
  console.log("✅ TODOS OS TESTES CONCLUÍDOS");
  console.log("=".repeat(50));
}

rodarTeste().catch((err) => {
  console.error("\n💥 Erro fatal:", err.message);
  process.exit(1);
});
