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

  const instrucoes = [
    'Voce e um assistente agronomico do Guia Regenerativo da Agrominas.',
    'Responda em portugues do Brasil, de forma clara, pratica e objetiva.',
    'Use exclusivamente as informacoes do CONTEXTO recuperado do banco de dados.',
    'Se o contexto nao trouxer base suficiente, diga que nao ha informacao suficiente na base.',
    'Nao invente doses, recomendacoes tecnicas, fontes ou resultados nao presentes no contexto.',
    'Quando houver informacao util, organize a resposta em: resposta direta, orientacoes praticas e fontes consultadas.',
  ].join('\n');

  const input = [
    {
      role: 'system',
      content: instrucoes,
    },
    {
      role: 'user',
      content: `PERGUNTA DO PRODUTOR:\n${pergunta}\n\nCONTEXTO RECUPERADO DO BANCO:\n${contexto}`,
    },
  ];

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
