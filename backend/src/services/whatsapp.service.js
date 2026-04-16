import 'dotenv/config';

const EVOLUTION_API_URL = process.env.EVOLUTION_URL || 'http://localhost:8081';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '422470c0-669a-4d5a-82e4-a15d08d9512d';
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE || 'agrominas';

/**
 * Envia uma mensagem de texto simples via Evolution API
 * @param {string} to - Número de telefone (ex: 5511999999999)
 * @param {string} text - Mensagem a ser enviada
 */
export async function enviarMensagem(to, text) {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: to,
        text: text
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[WHATSAPP SERVICE] Erro da API:', JSON.stringify(data, null, 2));
    }

    return data;
  } catch (error) {
    console.error('[WHATSAPP SERVICE] Erro ao enviar mensagem:', error);
    throw error;
  }
}

/**
 * Baixa o conteúdo de uma mídia (PDF, Imagem, etc) da Evolution API
 * @param {object} message - Objeto da mensagem recebida no webhook
 * @returns {Promise<Buffer>} Buffer do arquivo
 */
export async function baixarMidia(message) {
  try {
    // Corrigido: endpoint correto é /chat/ em vez de /message/
    const response = await fetch(`${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        message: message
      })
    });

    const data = await response.json();

    if (!response.ok || !data.base64) {
      console.error('[WHATSAPP SERVICE] Erro ao baixar mídia:', data);
      throw new Error('Falha ao obter base64 da mídia');
    }

    // Converte base64 para Buffer
    return Buffer.from(data.base64, 'base64');
  } catch (error) {
    console.error('[WHATSAPP SERVICE] Erro ao baixar mídia:', error);
    throw error;
  }
}
