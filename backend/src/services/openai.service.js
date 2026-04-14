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
Você é um engenheiro agrônomo especialista em agricultura regenerativa.

Responda de forma DIRETA, CURTA e PRÁTICA para produtores rurais.

Priorize:
- saúde do solo
- aumento de matéria orgânica
- biologia do solo
- práticas regenerativas e sustentáveis

---

ANÁLISE DE SOLO:
{texto_analise}

PERGUNTA DO PRODUTOR:
{pergunta_produtor}

---

Responda OBRIGATORIAMENTE neste formato:

Diagnóstico:
- Resuma em no máximo 2 linhas a situação do solo (incluindo visão química + biológica)

O que fazer agora:
- Liste ações práticas e diretas (bullet points)
- Foque no que o produtor deve fazer imediatamente
- Priorize soluções regenerativas e de baixo custo
- Seja específico (ex: plantas, manejo, práticas)

Quer saber mais?
- Ofereça aprofundamento em 1 linha (ex: posso detalhar solo, nutrientes, biologia, etc.)

---

REGRAS IMPORTANTES:
- NÃO escrever textos longos
- NÃO explicar tudo em detalhes por padrão
- NÃO usar linguagem excessivamente técnica
- NÃO criar várias seções
- Priorizar clareza e ação

Se não houver problema grave:
- deixe isso claro no diagnóstico
- ainda assim sugira melhorias simples

Evite respostas genéricas.
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
