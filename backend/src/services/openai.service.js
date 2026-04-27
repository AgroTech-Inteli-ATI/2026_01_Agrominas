import "dotenv/config";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.4";

export async function gerarRespostaComOpenAI({
  pergunta,
  contexto,
  contextoCientifico,
  contextoVideos,
  tipo = "geral",
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      texto: null,
      modelo: null,
      modo: "fallback_sem_openai_key",
    };
  }

  const input = montarPrompt(pergunta, contexto, contextoCientifico, contextoVideos, tipo);

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
  contextoVideos,
}) {
  return gerarRespostaComOpenAI({
    pergunta,
    contexto: textoPDF,
    contextoCientifico,
    contextoVideos,
    tipo: "laudo_solo",
  });
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function montarPrompt(pergunta, contexto, contextoCientifico = null, contextoVideos = null, tipo = "geral") {
  if (tipo === "laudo_solo") {
    return montarPromptLaudoSolo(pergunta, contexto, contextoCientifico, contextoVideos);
  }

  return montarPromptGeral(pergunta, contexto, contextoCientifico, contextoVideos);
}

function blocoVideosContexto(contextoVideos) {
  if (!contextoVideos || !String(contextoVideos).trim()) return "";
  return `
---
VÍDEOS DE APOIO (transcrições e resumos):
${contextoVideos}
---
`;
}

function blocoCientificoContexto(contextoCientifico) {
  if (!contextoCientifico || !String(contextoCientifico).trim()) return "";
  return `
---
BASE DE CONHECIMENTO COMPLEMENTAR:
${contextoCientifico}
---
`;
}

function montarPromptGeral(pergunta, contexto, contextoCientifico = null, contextoVideos = null) {
  const contextoBase =
    contexto?.trim() || "Nenhum contexto encontrado na base de conhecimento.";
  const perguntaProdutor =
    pergunta?.trim() || "Qual orientação regenerativa você recomenda?";

  return `Você é o assistente da Agrominas no WhatsApp, conversando com um produtor rural sobre agricultura regenerativa.

Fale como um amigo agrônomo: acolhedor, próximo, em linguagem simples, sem termos técnicos pesados. Pode usar 1 ou 2 emojis quando fizer sentido (🌱 🌾 👍), sem exagerar. Trate o produtor por "você".

Use apenas a base de conhecimento abaixo (artigos e vídeos). Não invente nada que não esteja ali.

Não use o formato "Diagnóstico" — esse formato é só para laudo de solo em PDF.

---
BASE DE CONHECIMENTO (Artigos):
${contextoBase}
${blocoCientificoContexto(contextoCientifico)}${blocoVideosContexto(contextoVideos)}
PERGUNTA DO PRODUTOR:
${perguntaProdutor}

---

Responda neste formato (sem incluir as palavras "Orientação:" e "O que fazer agora:" se ficar mais natural sem elas, mas mantenha a ordem):

Orientação:
- 1 a 3 frases curtas explicando o ponto principal, em tom de conversa.

O que fazer agora:
- 2 a 4 ações práticas em bullets curtos.
- Cite insumos, culturas ou técnicas da base quando ajudarem.
- Se algum vídeo da base reforçar a recomendação, mencione "(tem um vídeo sobre isso nas referências abaixo)" no bullet correspondente.

REGRAS:
- Não invente informações fora da base.
- Texto curto, fácil de ler no celular.
- Não use jargão técnico sem explicar.
- NÃO escreva o bloco de "Referências" — ele é gerado automaticamente depois da sua resposta. Apenas escreva o corpo da resposta.`;
}

function montarPromptLaudoSolo(pergunta, contexto, contextoCientifico = null, contextoVideos = null) {
  const textoAnalise =
    contexto?.trim() || "Nenhuma análise ou documento fornecido.";
  const perguntaProdutor =
    pergunta?.trim() || "O que devo fazer para melhorar meu solo?";

  return `Você é o agrônomo da Agrominas conversando pelo WhatsApp com um produtor que acabou de mandar o laudo de solo dele.

Fale de forma acolhedora e próxima, como quem está ao lado dele explicando o resultado. Linguagem simples, frases curtas, 1 ou 2 emojis se fizer sentido (🌱 🌍 👍). Trate por "você".

Apoie a análise nos princípios regenerativos e na base científica/vídeos abaixo. Priorize:
- saúde do solo
- matéria orgânica
- biologia do solo
- soluções regenerativas e de baixo custo

---
DADOS DA ANÁLISE DE SOLO DO AGRICULTOR:
${textoAnalise}
${blocoCientificoContexto(contextoCientifico)}${blocoVideosContexto(contextoVideos)}
PERGUNTA DO PRODUTOR:
${perguntaProdutor}

---

Responda OBRIGATORIAMENTE neste formato:

Diagnóstico:
- 1 a 2 linhas resumindo a situação do solo (química + biológica).
- Em caso de conflito entre os dados e a ciência, priorize a segurança do solo.

O que fazer agora:
- Bullets curtos e diretos com ações práticas imediatas.
- Use os nomes dos insumos/técnicas da base quando aplicável.
- Se algum vídeo da base reforçar a recomendação, mencione "(tem um vídeo sobre isso nas referências abaixo)" no bullet.

REGRAS:
- NÃO escreva textos longos.
- NÃO use linguagem excessivamente técnica.
- Tom acolhedor, sem soar robótico.
- NÃO escreva o bloco de "Referências" — ele é gerado automaticamente depois da sua resposta.
- Evite respostas genéricas.`;
}

function extrairTextoDoPayload(payload) {
  const partes = payload.output
    ?.flatMap((item) => item.content || [])
    ?.map((content) => content.text)
    ?.filter(Boolean);

  return partes?.join("\n").trim() || "";
}
