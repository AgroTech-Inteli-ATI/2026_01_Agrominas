import { supabase } from "../config/supabase.js";

const HISTORY_ENABLED = process.env.BOT_HISTORY_ENABLED !== "false";
const allowedNumbers = new Set(
  (process.env.BOT_ALLOWED_NUMBERS || "")
    .split(",")
    .map((item) => item.replace(/\D/g, ""))
    .filter(Boolean),
);

let historyUnavailable = false;

function logHistoryError(error) {
  if (historyUnavailable) return;

  historyUnavailable = true;
  console.warn(
    `[BOT HISTORY] Historico indisponivel. Execute a migration 004_bot_whatsapp_historico.sql. Detalhe: ${error.message}`,
  );
}

export function extrairTelefone(remoteJid) {
  return remoteJid?.split("@")[0]?.replace(/\D/g, "") || null;
}

export function isContatoPermitidoPorEnv(remoteJid) {
  const telefone = extrairTelefone(remoteJid);
  return !!telefone && allowedNumbers.has(telefone);
}

export async function obterContatoBot(remoteJid) {
  if (!HISTORY_ENABLED || historyUnavailable || !remoteJid) return null;

  const { data, error } = await supabase
    .from("bot_contatos_whatsapp")
    .select("id, remote_jid, nome, estado, fontes")
    .eq("remote_jid", remoteJid)
    .maybeSingle();

  if (error) {
    logHistoryError(error);
    return null;
  }

  return data;
}

export async function salvarContatoBot({ remoteJid, nome, sessao }) {
  if (!HISTORY_ENABLED || historyUnavailable || !remoteJid) return null;

  const payload = {
    remote_jid: remoteJid,
    telefone: extrairTelefone(remoteJid),
    ultima_interacao_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };

  if (nome) {
    payload.nome = nome;
  }

  if (sessao?.estado) {
    payload.estado = sessao.estado;
  }

  if (Array.isArray(sessao?.fontes)) {
    payload.fontes = sessao.fontes;
  }

  const { data, error } = await supabase
    .from("bot_contatos_whatsapp")
    .upsert(payload, { onConflict: "remote_jid" })
    .select("id, remote_jid")
    .single();

  if (error) {
    logHistoryError(error);
    return null;
  }

  return data;
}

export async function registrarMensagemBot({
  remoteJid,
  messageId,
  direcao,
  tipo = "text",
  texto,
  timestamp,
  payload,
}) {
  if (!HISTORY_ENABLED || historyUnavailable || !remoteJid) return;

  const contato = await salvarContatoBot({ remoteJid });

  const { error } = await supabase.from("bot_mensagens_whatsapp").insert({
    contato_id: contato?.id || null,
    remote_jid: remoteJid,
    message_id: messageId || null,
    direcao,
    tipo,
    texto: texto ? texto.slice(0, 8000) : null,
    evento_timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : null,
    payload: payload || null,
  });

  if (error && error.code !== "23505") {
    logHistoryError(error);
  }
}
