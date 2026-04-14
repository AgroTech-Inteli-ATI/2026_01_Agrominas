import 'dotenv/config';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4';

export async function gerarRespostaComOpenAI({ pergunta, contexto }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      texto: null,
      modelo: null,
      modo: 'fallback_sem_openai_key',
    };
  }

  if (typeof fetch !== 'function') {
    throw new Error('A versao do Node precisa ter fetch nativo para chamar a OpenAI.');
  }

  const input = `
Voce e um engenheiro agronomo especialista em fertilidade do solo e agricultura regenerativa.

Analise os dados abaixo. Eles foram recuperados do banco de dados do Guia Regenerativo da Agrominas e devem ser tratados como a unica base de conhecimento disponivel para esta resposta.

CONTEXTO RECUPERADO DO BANCO:
${contexto}

PERGUNTA DO PRODUTOR:
${pergunta}

Responda de forma clara e pratica contendo:

1. Diagnostico do solo ou do contexto produtivo
2. Problemas encontrados
3. Correcoes recomendadas
4. Produtos ou insumos indicados
5. Forma de aplicacao
6. Fontes consultadas

Regras obrigatorias:
- Use somente as informacoes presentes no contexto recuperado do banco.
- Se o contexto nao tiver informacao suficiente para algum item, diga explicitamente que a base nao traz dados suficientes.
- Nao invente doses, produtos, fontes, resultados ou formas de aplicacao.
- Quando a pergunta nao envolver analise de solo, adapte os cinco primeiros itens ao tema agricola perguntado sem sair do contexto.
`;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input,
      max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 900),
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || 'Erro ao gerar resposta com a OpenAI.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return {
    texto: payload.output_text || extrairTextoDoPayload(payload),
    modelo: DEFAULT_MODEL,
    modo: 'openai',
  };
}

function extrairTextoDoPayload(payload) {
  const partes = payload.output
    ?.flatMap((item) => item.content || [])
    ?.map((content) => content.text)
    ?.filter(Boolean);

  return partes?.join('\n').trim() || '';
}
