import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Extrai o texto bruto de um buffer de PDF.
 * Usado quando o agricultor envia um laudo, análise de solo, etc. pelo WhatsApp.
 *
 * @param {Buffer} pdfBuffer - Buffer do arquivo PDF recebido
 * @returns {Promise<string>} Texto extraído do PDF
 */
export async function extrairTextoPDF(pdfBuffer) {
  const data = await pdfParse(pdfBuffer);
  return data.text;
}

/**
 * Estrutura o texto extraído do PDF em um JSON organizado.
 * Facilita a leitura pela IA e melhora a qualidade das respostas.
 *
 * @param {string} textoPDF - Texto bruto extraído do PDF
 * @returns {object} Dados estruturados do PDF
 */
export function estruturarDadosPDF(textoPDF) {
  const linhas = textoPDF
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return {
    conteudo_completo: textoPDF.trim(),
    total_linhas: linhas.length,
    preview: linhas.slice(0, 10).join('\n'), // primeiras 10 linhas para debug
  };
}