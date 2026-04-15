import "dotenv/config";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.4";

export async function gerarRespostaComOpenAI({ pergunta, contexto }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      texto: null,
      modelo: null,
      modo: "fallback_sem_openai_key",
    };
  }

  const input = montarPrompt(pergunta, contexto);

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input,
      max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 900),
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.error?.message || "Erro ao gerar resposta com a OpenAI.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return {
    texto: payload.output_text || extrairTextoDoPayload(payload),
    modelo: DEFAULT_MODEL,
    modo: "openai",
  };
}

/**
 * Gera resposta da IA usando o texto extraído de um PDF como análise de solo
 * e opcionalmente contexto científico do banco de dados.
 *
 * @param {Object} params
 * @param {string} params.pergunta - Pergunta do agricultor
 * @param {string} params.textoPDF - Texto extraído do PDF
 * @param {string} [params.contextoCientifico] - Contexto recuperado do banco
 */
export async function gerarRespostaComPDF({
  pergunta,
  textoPDF,
  contextoCientifico,
}) {
  return gerarRespostaComOpenAI({
    pergunta,
    contexto: textoPDF,
    contextoCientifico,
  });
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function montarPrompt(pergunta, contexto, contextoCientifico = null) {
  const textoAnalise =
    contexto?.trim() || "Nenhuma análise ou documento fornecido.";
  const perguntaProdutor =
    pergunta?.trim() || "O que devo fazer para melhorar meu solo?";

  let blocoCientifico = "";
  if (contextoCientifico) {
    blocoCientifico = `
---
BASE DE CONHECIMENTO CIENTÍFICO (Artigos Técnicos):
${contextoCientifico}
---
`;
  }

  return `Você é um engenheiro agrônomo especialista em agricultura regenerativa da Agrominas.

Sua tarefa é analisar os dados do agricultor e fornecer recomendações baseadas em princípios regenerativos e na base de conhecimento científico fornecida.

Responda de forma DIRETA, CURTA e PRÁTICA.

Priorize:
- saúde do solo
- aumento de matéria orgânica
- biologia do solo
- práticas regenerativas e sustentáveis

---
DADOS DA ANÁLISE DE SOLO DO AGRICULTOR:
${textoAnalise}
${blocoCientifico}

PERGUNTA DO PRODUTOR:
${perguntaProdutor}

---

Responda OBRIGATORIAMENTE neste formato:

Diagnóstico:
- Resuma em no máximo 2 linhas a situação do solo (incluindo visão química + biológica)
- Se houver conflito entre os dados e a ciência, priorize a segurança do solo.

O que fazer agora:
- Liste ações práticas e diretas (bullet points)
- Use os nomes dos insumos ou técnicas citados na BASE DE CONHECIMENTO CIENTÍFICO se forem aplicáveis.
- Foque no que o produtor deve fazer imediatamente
- Priorize soluções regenerativas e de baixo custo

Quer saber mais?
- Ofereça aprofundamento em 1 linha (ex: posso detalhar solo, nutrientes, biologia, etc.)

---

REGRAS IMPORTANTES:
- NÃO escrever textos longos
- NÃO explicar tudo em detalhes por padrão
- NÃO usar linguagem excessivamente técnica
- Priorizar clareza e ação

Evite respostas genéricas.`;
}

function extrairTextoDoPayload(payload) {
  const partes = payload.output
    ?.flatMap((item) => item.content || [])
    ?.map((content) => content.text)
    ?.filter(Boolean);

  return partes?.join("\n").trim() || "";
}
