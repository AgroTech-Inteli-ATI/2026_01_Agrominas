import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

const apiUrl = removeTrailingSlash(process.env.EVOLUTION_URL || 'http://localhost:8081');
const apiKey = process.env.EVOLUTION_API_KEY;
const instanceName = process.env.EVOLUTION_INSTANCE || 'agrominas';
const webhookUrl =
  process.env.EVOLUTION_WEBHOOK_URL || 'http://backend:3000/api/v1/bot/webhook';
const ownerNumber = process.env.WHATSAPP_OWNER_NUMBER || process.env.EVOLUTION_OWNER_NUMBER;

const webhookEvents = ['MESSAGES_UPSERT'];
const webhookBase64 = false;

function removeTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function requireConfig() {
  if (!apiKey) {
    throw new Error('EVOLUTION_API_KEY nao foi definido no .env.');
  }
}

async function evolutionRequest(route, options = {}) {
  const response = await fetch(`${apiUrl}${route}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
      ...(options.headers || {}),
    },
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    const detail = typeof payload === 'string' ? payload : JSON.stringify(payload);
    throw new Error(`${options.method || 'GET'} ${route} falhou (${response.status}): ${detail}`);
  }

  return payload;
}

async function readPayload(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getInstancesList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.instances)) return payload.instances;
  return [];
}

function getInstanceName(item) {
  return item?.instance?.instanceName || item?.instanceName || item?.name;
}

function getInstanceStatus(item) {
  return (
    item?.instance?.status ||
    item?.connectionStatus ||
    item?.status ||
    item?.instance?.state ||
    item?.state ||
    'unknown'
  );
}

async function findInstance() {
  const instances = getInstancesList(await evolutionRequest('/instance/fetchInstances'));
  return instances.find((item) => getInstanceName(item) === instanceName);
}

async function createInstance() {
  const body = {
    instanceName,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
    rejectCall: false,
    groupsIgnore: true,
    alwaysOnline: false,
    readMessages: false,
    readStatus: false,
    syncFullHistory: false,
  };

  if (ownerNumber) {
    body.number = ownerNumber;
  }

  return evolutionRequest('/instance/create', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function configureWebhook() {
  const webhook = {
    enabled: true,
    url: webhookUrl,
    webhookByEvents: false,
    webhookBase64,
    events: webhookEvents,
  };

  const route = `/webhook/set/${encodeURIComponent(instanceName)}`;
  let firstError;

  try {
    return await evolutionRequest(route, {
      method: 'POST',
      body: JSON.stringify({
        webhook,
      }),
    });
  } catch (error) {
    firstError = error;
  }

  try {
    return await evolutionRequest(route, {
      method: 'POST',
      body: JSON.stringify(webhook),
    });
  } catch (error) {
    throw new Error(`${firstError.message}; tentativa com payload direto tambem falhou: ${error.message}`);
  }
}

async function getConnectionState() {
  try {
    return await evolutionRequest(`/instance/connectionState/${encodeURIComponent(instanceName)}`);
  } catch (error) {
    return { error: error.message };
  }
}

async function getQrOrPairingCode() {
  try {
    const query = ownerNumber ? `?number=${encodeURIComponent(ownerNumber)}` : '';
    return await evolutionRequest(`/instance/connect/${encodeURIComponent(instanceName)}${query}`);
  } catch (error) {
    return { error: error.message };
  }
}

async function main() {
  requireConfig();

  console.log(`[WhatsApp] Evolution URL: ${apiUrl}`);
  console.log(`[WhatsApp] Instancia: ${instanceName}`);
  console.log(`[WhatsApp] Webhook: ${webhookUrl}`);

  let instance = await findInstance();

  if (!instance) {
    console.log('[WhatsApp] Instancia nao encontrada. Criando...');
    await createInstance();
    instance = await findInstance();
  } else {
    console.log(`[WhatsApp] Instancia encontrada com status: ${getInstanceStatus(instance)}`);
  }

  await configureWebhook();
  console.log(`[WhatsApp] Webhook configurado com eventos: ${webhookEvents.join(', ')}`);

  const state = await getConnectionState();
  const currentState = state?.instance?.state || state?.instance?.status || state?.state;

  if (currentState) {
    console.log(`[WhatsApp] Estado atual da conexao: ${currentState}`);
  }

  if (currentState !== 'open') {
    const connection = await getQrOrPairingCode();

    if (connection?.pairingCode) {
      console.log(`[WhatsApp] Codigo de pareamento: ${connection.pairingCode}`);
    }

    if (connection?.error) {
      console.log(`[WhatsApp] Nao foi possivel obter QR/codigo pela API: ${connection.error}`);
    }

    console.log('[WhatsApp] Para escanear o QR Code, abra: http://localhost:8081/manager');
  }

  console.log('[WhatsApp] Setup concluido.');
}

main().catch((error) => {
  console.error(`[WhatsApp] ${error.message}`);
  process.exit(1);
});
