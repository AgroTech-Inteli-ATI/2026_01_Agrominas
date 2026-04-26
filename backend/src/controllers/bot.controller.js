import { supabase } from "../config/supabase.js";
import {
  responderRAG,
  recuperarContextoRAG,
  obterContextoArtigos,
} from "../services/rag.service.js";
import { extrairTextoPDF } from "../services/pdf.service.js";
import { gerarRespostaComPDF } from "../services/openai.service.js";
import { transcreverAudio } from '../services/openai.service.js';
import { enviarMensagem, baixarMidia } from "../services/whatsapp.service.js";

// Cache para evitar processar a mesma mensagem várias vezes (deduplicação)
const processados = new Set();
// Gerenciador de estado simples em memória (em produção, use Redis ou Banco de Dados)
const sessoes = {};

const MENUS = {
  PRINCIPAL: "PRINCIPAL",
  INSUMOS: "INSUMOS",
  INSUMOS_BUSCA: "INSUMOS_BUSCA",
  CULTURA: "CULTURA",
  CULTURA_BUSCA: "CULTURA_BUSCA",
  SOLO: "SOLO",
  AGUARDANDO_PDF: "AWAITING_PDF",
  MOSTRAR_FONTES: "MOSTRAR_FONTES",
};

const MENSAGENS = {
  BOAS_VINDAS: `Olá! 👋 Bem-vindo ao *Guia Regenerativo* da Agrominas.

Sou seu assistente de insumos e manejo sustentável. Estou aqui para te ajudar a encontrar informações técnicas sobre práticas regenerativas de forma simples e rápida.

Para começar, escolha uma opção abaixo:

1️⃣ Insumos Regenerativos Específicos
2️⃣ Cultura / Tipo de Plantio
3️⃣ Dúvidas Gerais sobre Solo
4️⃣ Encerrar atendimento

👉 Digite o *número* da opção desejada.`,

  MENU_PRINCIPAL: `1️⃣ Insumos Regenerativos Específicos
2️⃣ Cultura / Tipo de Plantio
3️⃣ Dúvidas Gerais sobre Solo
4️⃣ Encerrar atendimento`,

  FALLBACK_PRINCIPAL: `Hmm, não reconheci essa opção. 🤔

Por favor, digite apenas o *número* correspondente à sua escolha:

1️⃣ Insumos Regenerativos Específicos
2️⃣ Cultura / Tipo de Plantio
3️⃣ Dúvidas Gerais sobre Solo
4️⃣ Encerrar atendimento`,

  SUBMENU_INSUMOS: `Ótimo! Vamos falar sobre *insumos regenerativos*. 🌿

Selecione o tipo de insumo sobre o qual deseja mais informações:

1️⃣ Biofertilizantes
2️⃣ Compostos Orgânicos
3️⃣ Inoculantes Biológicos
4️⃣ Calcário e Corretivos de Solo
5️⃣ Silicatos e Rochagem
6️⃣ Outro (digitar o nome do insumo)
0️⃣ Voltar ao Menu Principal

👉 Digite o número da opção.`,

  FALLBACK_INSUMOS: `Não entendi sua resposta. Por favor, digite apenas um número entre 0 e 6:

1️⃣ Biofertilizantes
2️⃣ Compostos Orgânicos
3️⃣ Inoculantes Biológicos
4️⃣ Calcário e Corretivos de Solo
5️⃣ Silicatos e Rochagem
6️⃣ Outro (digitar o nome)
0️⃣ Voltar ao Menu Principal`,

  BUSCA_LIVRE_INSUMO: `Tudo bem! Digite o nome do insumo que você quer pesquisar:

(Ex: "húmus de minhoca", "torta de mamona", "pó de basalto")`,

  INSUMO_NAO_ENCONTRADO: `Poxa, ainda não temos esse insumo em nossa biblioteca. 😕

Mas não se preocupe! Aqui estão suas opções:

1️⃣ Tentar buscar por outro nome
2️⃣ Ver a lista de insumos disponíveis
0️⃣ Voltar ao Menu Principal`,

  SUBMENU_CULTURA: `Entendido! Vamos buscar recomendações por *tipo de cultura*. 🌾

Selecione a cultura ou tipo de plantio:

1️⃣ Soja
2️⃣ Milho
3️⃣ Café
4️⃣ Cana-de-açúcar
5️⃣ Hortaliças / Olericultura
6️⃣ Pastagem / Forrageiras
7️⃣ Outra cultura (digitar o nome)
0️⃣ Voltar ao Menu Principal

👉 Digite o número da opção.`,

  FALLBACK_CULTURA: `Não reconheci essa opção. Por favor, digite apenas um número entre 0 e 7:

1️⃣ Soja  2️⃣ Milho  3️⃣ Café
4️⃣ Cana-de-açúcar  5️⃣ Hortaliças
6️⃣ Pastagem  7️⃣ Outra cultura
0️⃣ Voltar ao Menu Principal`,

  BUSCA_LIVRE_CULTURA: `Digite o nome da sua cultura ou tipo de plantio:

(Ex: "feijão", "tomate", "eucalipto", "banana")`,

  CULTURA_NAO_ENCONTRADA: `Ainda não temos recomendações específicas para essa cultura. 🌿

O que você prefere fazer?

1️⃣ Buscar por outra cultura
2️⃣ Consultar insumos regenerativos gerais
0️⃣ Voltar ao Menu Principal`,

  SUBMENU_SOLO: `Vamos falar sobre o *solo*! 🌍 É a base de tudo.

Selecione o tema da sua dúvida:

1️⃣ Análise de Solo (como interpretar resultados)
2️⃣ pH e Correção de Acidez
3️⃣ Compactação e Estrutura do Solo
4️⃣ Matéria Orgânica e Biologia do Solo
5️⃣ Erosão e Conservação
6️⃣ Enviar meu Laudo de Solo (PDF) para análise
0️⃣ Voltar ao Menu Principal

👉 Digite o número do tema.`,

  FALLBACK_SOLO: `Não entendi. Por favor, escolha um número entre 0 e 6:

1️⃣ Análise de Solo
2️⃣ pH e Correção de Acidez
3️⃣ Compactação e Estrutura
4️⃣ Matéria Orgânica e Biologia
5️⃣ Erosão e Conservação
6️⃣ Enviar Laudo de Solo (PDF)
0️⃣ Voltar ao Menu Principal`,

  SOLICITAR_PDF: `Ótimo! Você pode enviar o laudo de análise de solo aqui mesmo pelo WhatsApp. 📎

*Antes de enviar, confira:*
✅ O arquivo deve estar no formato *PDF*
✅ Tamanho máximo: *10 MB*
✅ Deve ser um laudo de análise de solo (laboratório)

Envie o arquivo agora e aguarde a análise. ⏳`,

  FORMATO_INVALIDO: `Hmm, esse arquivo não está no formato correto. 🤔

Por favor, envie apenas arquivos em formato *PDF*.

Se o seu laudo estiver em outro formato (foto, imagem, Word), tente convertê-lo para PDF antes de enviar.

Deseja tentar novamente?

1️⃣ Sim, vou enviar o PDF
0️⃣ Voltar ao Menu Principal`,

  NENHUM_ARQUIVO: `Parece que você enviou uma mensagem de texto, mas eu preciso do arquivo PDF do laudo. 📎

Para enviar, toque no ícone de anexo 📎 no WhatsApp e selecione o arquivo PDF do seu laudo de solo.

Deseja tentar novamente?

1️⃣ Sim, vou anexar o arquivo
0️⃣ Voltar ao Menu Principal`,

  ENCERRAMENTO: `Obrigado por usar o *Guia Regenerativo* da Agrominas! 🌱

Esperamos ter ajudado. Lembre-se: cada passo em direção à agricultura regenerativa faz diferença para o seu solo e para o futuro do campo.

Se precisar de mais informações, é só mandar uma mensagem aqui.

Até mais! 👋`,
};

// POST /bot/webhook — Entrada oficial da Evolution API (WhatsApp)
export const receberMensagem = async (req, res, next) => {
  const payload = req.body;
  const msgId = payload.data?.key?.id;

  // 1. Deduplicação: ignora se já processamos esta mensagem
  if (!msgId || processados.has(msgId)) {
    return res.status(200).send("OK");
  }
  processados.add(msgId);
  // Limpa o cache de IDs após 1 minuto para não crescer infinitamente
  setTimeout(() => processados.delete(msgId), 60000);

  // Ignora mensagens enviadas pelo próprio bot (evita loop)
  if (payload.data?.key?.fromMe === true) {
    return res.status(200).send("OK");
  }

  const remoteJid = payload.data?.key?.remoteJid;

  if (!remoteJid) {
    return res.status(200).send("Ignorado: Sem JID.");
  }

  // Ignora se for mensagem de grupo (geralmente termina em @g.us)
  if (remoteJid.endsWith("@g.us")) {
    return res.status(200).send("Ignorado: Grupo.");
  }

  // Responde OK imediatamente para a Evolution API não reenviar por timeout
  res.status(200).send("OK");

  try {
    const mensagemData = payload.data?.message;
    const mensagemOriginal =
      mensagemData?.conversation ||
      mensagemData?.extendedTextMessage?.text ||
      mensagemData?.documentWithCaptionMessage?.documentMessage?.caption ||
      mensagemData?.imageMessage?.caption ||
      "";

    const textoLimpo = mensagemOriginal.trim().toLowerCase();

    // Detecção de PDF
    const isDocument = !!(
      mensagemData?.documentMessage || mensagemData?.documentWithCaptionMessage
    );
    const documentMessage =
      mensagemData?.documentMessage ||
      mensagemData?.documentWithCaptionMessage?.documentMessage;

    // Detecção de áudio
    const isAudio = !!(mensagemData?.audioMessage);
    const audioMessage = mensagemData?.audioMessage;

    // Processa áudio com Whisper antes de entrar na máquina de estados
    // Se vier áudio, transcreve e trata como texto normal
    if (isAudio && audioMessage) {
      try {
        await enviarMensagem(remoteJid, '🎙️ Recebi seu áudio! Transcrevendo... um momento.');

        const audioBuffer = await baixarMidia(payload.data);
        const mimeType = audioMessage.mimetype || 'audio/ogg; codecs=opus';
        const textoTranscrito = await transcreverAudio(audioBuffer, mimeType);

        if (!textoTranscrito) {
          await enviarMensagem(remoteJid, 'Não consegui entender o áudio. 😕 Pode digitar sua dúvida?');
          return;
        }

        console.log(`[BOT] Áudio transcrito de ${remoteJid}: "${textoTranscrito}"`);

        // Responde a transcrição confirmando e já usa no RAG
        await enviarMensagem(remoteJid, `🎙️ *Entendi:* "${textoTranscrito}"\n\nBuscando informações...`);

        const resultadoRAG = await responderRAG(textoTranscrito);
        sessoes[remoteJid] = sessoes[remoteJid] || { estado: MENUS.PRINCIPAL, fallbacks: 0, fontes: [] };
        sessoes[remoteJid].fontes = resultadoRAG.fontes;

        const resposta = `${resultadoRAG.resposta}\n\n9️⃣ Ver fontes\n0️⃣ Voltar ao Menu Principal`;
        await enviarMensagem(remoteJid, resposta);
        return;
      } catch (err) {
        console.error('[BOT] Erro ao processar áudio:', err);
        await enviarMensagem(remoteJid, 'Tive um problema ao processar o áudio. 😕 Pode digitar sua pergunta?');
        return;
      }
    }

    // 2. Gerenciamento de Sessão / Estado (Usando remoteJid completo como chave)
    if (!sessoes[remoteJid]) {
      sessoes[remoteJid] = { estado: MENUS.PRINCIPAL, fallbacks: 0, fontes: [] };
      await enviarMensagem(remoteJid, MENSAGENS.BOAS_VINDAS);
      return;
    }

    const sessao = sessoes[remoteJid];

    // Palavras-chave globais para voltar ao menu
    if (["menu", "inicio", "início", "voltar"].includes(textoLimpo)) {
      sessao.estado = MENUS.PRINCIPAL;
      sessao.fallbacks = 0;
      await enviarMensagem(
        remoteJid,
        "Claro! Voltando ao menu principal. 👇\n\n" + MENSAGENS.MENU_PRINCIPAL,
      );
      return;
    }

    let respostaTexto;

    // --- MOSTRAR FONTES (Gatilho Global para quando a opção é exibida) ---
    if (textoLimpo === "9") {
      if (sessao.fontes && sessao.fontes.length > 0) {
        const listaFontes = sessao.fontes.map((f, i) => `${i + 1}. *${f.titulo}*`).join('\n');
        await enviarMensagem(remoteJid, `📚 *Fontes utilizadas:* \n\n${listaFontes}\n\n0️⃣ Voltar ao Menu Principal`);
      } else {
        await enviarMensagem(remoteJid, "Nenhuma fonte específica foi usada para a última resposta.\n\n0️⃣ Voltar ao Menu Principal");
      }
      sessao.estado = MENUS.PRINCIPAL;
      return;
    }

    // 3. Lógica da Máquina de Estados

    // --- MENU PRINCIPAL ---
    if (sessao.estado === MENUS.PRINCIPAL) {
      switch (textoLimpo) {
        case "1":
          sessao.estado = MENUS.INSUMOS;
          respostaTexto = MENSAGENS.SUBMENU_INSUMOS;
          break;
        case "2":
          sessao.estado = MENUS.CULTURA;
          respostaTexto = MENSAGENS.SUBMENU_CULTURA;
          break;
        case "3":
          sessao.estado = MENUS.SOLO;
          respostaTexto = MENSAGENS.SUBMENU_SOLO;
          break;
        case "4":
          delete sessoes[remoteJid];
          respostaTexto = MENSAGENS.ENCERRAMENTO;
          break;
        default:
          sessao.fallbacks++;
          if (sessao.fallbacks >= 2) {
            respostaTexto = `Parece que está tendo alguma dificuldade. 😊\n\nVocê pode:\n1️⃣ Tentar novamente (vou repetir as opções)\n2️⃣ Falar com um especialista da Agrominas: https://agrominas.com.br/contato`;
            sessao.fallbacks = 0;
          } else {
            respostaTexto = MENSAGENS.FALLBACK_PRINCIPAL;
          }
      }
    }

    // --- SUBMENU INSUMOS ---
    else if (sessao.estado === MENUS.INSUMOS) {
      const insumosMap = {
        "1": "Biofertilizantes",
        "2": "Compostos Orgânicos",
        "3": "Inoculantes Biológicos",
        "4": "Calcário e Corretivos de Solo",
        "5": "Silicatos e Rochagem",
      };

      if (insumosMap[textoLimpo]) {
        const resultadoRAG = await responderRAG(insumosMap[textoLimpo]);
        sessao.fontes = resultadoRAG.fontes; // Salva fontes na sessão
        respostaTexto = `📋 *${insumosMap[textoLimpo]}*\n\n${resultadoRAG.resposta}\n\n9️⃣ Ver fontes\n0️⃣ Voltar ao Menu Principal`;
      } else if (textoLimpo === "6") {
        sessao.estado = MENUS.INSUMOS_BUSCA;
        respostaTexto = MENSAGENS.BUSCA_LIVRE_INSUMO;
      } else if (textoLimpo === "0") {
        sessao.estado = MENUS.PRINCIPAL;
        respostaTexto = MENSAGENS.MENU_PRINCIPAL;
      } else {
        respostaTexto = MENSAGENS.FALLBACK_INSUMOS;
      }
    }

    // --- BUSCA LIVRE INSUMOS ---
    else if (sessao.estado === MENUS.INSUMOS_BUSCA) {
      if (textoLimpo === "0") {
        sessao.estado = MENUS.PRINCIPAL;
        respostaTexto = MENSAGENS.MENU_PRINCIPAL;
      } else if (textoLimpo === "1") {
        respostaTexto = MENSAGENS.BUSCA_LIVRE_INSUMO;
      } else if (textoLimpo === "2") {
        sessao.estado = MENUS.INSUMOS;
        respostaTexto = MENSAGENS.SUBMENU_INSUMOS;
      } else {
        const resultadoRAG = await responderRAG(mensagemOriginal);
        if (resultadoRAG.modo === "sem_contexto") {
          respostaTexto = MENSAGENS.INSUMO_NAO_ENCONTRADO;
        } else {
          sessao.fontes = resultadoRAG.fontes; // Salva fontes na sessão
          respostaTexto = `📋 *Busca: ${mensagemOriginal}*\n\n${resultadoRAG.resposta}\n\n9️⃣ Ver fontes\n0️⃣ Voltar ao Menu Principal`;
          sessao.estado = MENUS.INSUMOS;
        }
      }
    }

    // --- SUBMENU CULTURA ---
    else if (sessao.estado === MENUS.CULTURA) {
      const culturasMap = {
        "1": "Soja",
        "2": "Milho",
        "3": "Café",
        "4": "Cana-de-açúcar",
        "5": "Hortaliças",
        "6": "Pastagem",
      };

      if (culturasMap[textoLimpo]) {
        const resultadoRAG = await responderRAG(
          `insumos regenerativos para ${culturasMap[textoLimpo]}`,
        );
        sessao.fontes = resultadoRAG.fontes; // Salva fontes na sessão
        respostaTexto = `🌱 *Insumos Regenerativos para ${culturasMap[textoLimpo]}*\n\n${resultadoRAG.resposta}\n\n9️⃣ Ver fontes\n1️⃣ Escolher um insumo para aprofundar\n2️⃣ Consultar outra cultura\n0️⃣ Voltar ao Menu Principal`;
      } else if (textoLimpo === "7") {
        sessao.estado = MENUS.CULTURA_BUSCA;
        respostaTexto = MENSAGENS.BUSCA_LIVRE_CULTURA;
      } else if (textoLimpo === "1") {
        sessao.estado = MENUS.INSUMOS;
        respostaTexto = MENSAGENS.SUBMENU_INSUMOS;
      } else if (textoLimpo === "2") {
        respostaTexto = MENSAGENS.SUBMENU_CULTURA;
      } else if (textoLimpo === "0") {
        sessao.estado = MENUS.PRINCIPAL;
        respostaTexto = MENSAGENS.MENU_PRINCIPAL;
      } else {
        respostaTexto = MENSAGENS.FALLBACK_CULTURA;
      }
    }

    // --- BUSCA LIVRE CULTURA ---
    else if (sessao.estado === MENUS.CULTURA_BUSCA) {
      if (textoLimpo === "0") {
        sessao.estado = MENUS.PRINCIPAL;
        respostaTexto = MENSAGENS.MENU_PRINCIPAL;
      } else if (textoLimpo === "1") {
        respostaTexto = MENSAGENS.BUSCA_LIVRE_CULTURA;
      } else if (textoLimpo === "2") {
        sessao.estado = MENUS.INSUMOS;
        respostaTexto = MENSAGENS.SUBMENU_INSUMOS;
      } else {
        const resultadoRAG = await responderRAG(
          `insumos regenerativos para ${mensagemOriginal}`,
        );
        if (resultadoRAG.modo === "sem_contexto") {
          respostaTexto = MENSAGENS.CULTURA_NAO_ENCONTRADA;
        } else {
          sessao.fontes = resultadoRAG.fontes; // Salva fontes na sessão
          respostaTexto = `🌱 *Recomendações para ${mensagemOriginal}*\n\n${resultadoRAG.resposta}\n\n9️⃣ Ver fontes\n1️⃣ Escolher um insumo para aprofundar\n2️⃣ Consultar outra cultura\n0️⃣ Voltar ao Menu Principal`;
          sessao.estado = MENUS.CULTURA;
        }
      }
    }

    // --- SUBMENU SOLO ---
    else if (sessao.estado === MENUS.SOLO) {
      const soloMap = {
        "1": "interpretacao analise de solo",
        "2": "ph e acidez solo",
        "3": "compactacao solo",
        "4": "materia organica biologia solo",
        "5": "erosao conservacao solo",
      };

      if (soloMap[textoLimpo]) {
        const resultadoRAG = await responderRAG(soloMap[textoLimpo]);
        sessao.fontes = resultadoRAG.fontes; // Salva fontes na sessão
        respostaTexto =
          resultadoRAG.resposta +
          "\n\n9️⃣ Ver fontes\n2️⃣ Consultar outro tema de solo\n0️⃣ Voltar ao Menu Principal";
      } else if (textoLimpo === "2") {
        respostaTexto = MENSAGENS.SUBMENU_SOLO;
      } else if (textoLimpo === "6") {
        sessao.estado = MENUS.AGUARDANDO_PDF;
        respostaTexto = MENSAGENS.SOLICITAR_PDF;
      } else if (textoLimpo === "0") {
        sessao.estado = MENUS.PRINCIPAL;
        respostaTexto = MENSAGENS.MENU_PRINCIPAL;
      } else {
        respostaTexto = MENSAGENS.FALLBACK_SOLO;
      }
    }

    // --- AGUARDANDO PDF ---
    else if (sessao.estado === MENUS.AGUARDANDO_PDF) {
      if (isDocument) {
        if (documentMessage.mimetype !== "application/pdf") {
          respostaTexto = MENSAGENS.FORMATO_INVALIDO;
        } else {
          await enviarMensagem(
            remoteJid,
            "Recebi seu laudo! 🎉\n\nEstou analisando as informações... Isso pode levar alguns segundos. ⏳",
          );

          try {
            // 1. Baixa o arquivo da Evolution API
            const pdfBuffer = await baixarMidia(payload.data);

            // 2. Extrai texto
            const textoPDF = await extrairTextoPDF(pdfBuffer);

            if (!textoPDF || textoPDF.trim().length < 10) {
              throw new Error("Não foi possível extrair texto legível do PDF.");
            }

            // 3. Busca contexto científico relevante
            const contextoCientifico = await obterContextoArtigos(
              "recomendações para laudo de solo",
              3,
            );

            // 4. Gera resposta com IA
            const resultadoIA = await gerarRespostaComPDF({
              pergunta: "Analise este laudo e dê recomendações regenerativas",
              textoPDF: textoPDF,
              contextoCientifico: contextoCientifico.texto,
            });

            sessao.fontes = contextoCientifico.fontes; // Salva fontes na sessão
            respostaTexto = `📊 *Análise do seu Laudo de Solo*\n\n${resultadoIA.texto}\n\n9️⃣ Ver fontes\n\n⚠️ *Aviso importante:* Estas são recomendações orientativas. Consulte sempre um agrônomo.\n\nDeseja saber mais?\n\n1️⃣ Sim, quero detalhes de um insumo\n2️⃣ Enviar outro laudo\n0️⃣ Voltar ao Menu Principal`;
            sessao.estado = MENUS.SOLO;
          } catch (error) {
            console.error("[BOT] Erro ao processar PDF:", error);
            respostaTexto =
              "Recebi o arquivo, mas não consegui ler as informações com clareza. 😕\n\nIsso pode acontecer quando o laudo está em formato de imagem ou com baixa resolução.\n\n1️⃣ Enviar outro arquivo com melhor qualidade\n2️⃣ Consultar os temas de solo manualmente\n0️⃣ Voltar ao Menu Principal";
          }
        }
      } else if (textoLimpo.length > 0) {
        // Só responde se houver texto real enviado, ignorando eventos vazios
        if (textoLimpo === "0") {
          sessao.estado = MENUS.PRINCIPAL;
          respostaTexto = MENSAGENS.MENU_PRINCIPAL;
        } else if (textoLimpo === "1") {
          respostaTexto = MENSAGENS.SOLICITAR_PDF;
        } else if (textoLimpo === "2") {
          sessao.estado = MENUS.SOLO;
          respostaTexto = MENSAGENS.SUBMENU_SOLO;
        } else {
          respostaTexto = MENSAGENS.NENHUM_ARQUIVO;
        }
      }
    }

    // 4. Envia a resposta final
    if (respostaTexto) {
      await enviarMensagem(remoteJid, respostaTexto);
    }

    console.log(`[BOT] Telefone: ${remoteJid} | Estado: ${sessao.estado}`);
  } catch (err) {
    console.error("[BOT] Erro no processamento:", err);
  }
};

// POST /bot/buscar — busca direta de artigos para o bot
export const buscarArtigos = async (req, res, next) => {
  try {
    const { termo, categoria_id, insumo_id, cultura, limit = 5 } = req.body;

    if (!termo && !categoria_id && !insumo_id) {
      return res
        .status(400)
        .json({ error: "Informe ao menos um critério de busca." });
    }

    let query = supabase
      .from("artigos")
      .select(
        `
        id, titulo, resumo, fonte,
        artigos_categorias (categorias (id, nome)),
        artigos_insumos (insumos_regenerativos (id, nome)),
        metadados_artigos (cultura, nivel_evidencia, palavras_chave)
      `,
      )
      .eq("status", "publicado")
      .limit(Number(limit));

    if (termo) query = query.ilike("titulo", `%${termo}%`);

    const { data, error } = await query;
    if (error) return next(error);

    // Filtra por insumo/categoria/cultura em memória (N:N)
    let resultado = data;
    if (categoria_id) {
      resultado = resultado.filter((a) =>
        a.artigos_categorias.some((ac) => ac.categorias?.id === categoria_id),
      );
    }
    if (insumo_id) {
      resultado = resultado.filter((a) =>
        a.artigos_insumos.some(
          (ai) => ai.insumos_regenerativos?.id === insumo_id,
        ),
      );
    }
    if (cultura) {
      resultado = resultado.filter((a) =>
        a.metadados_artigos?.cultura
          ?.toLowerCase()
          .includes(cultura.toLowerCase()),
      );
    }

    // Formata resposta simplificada para o bot
    const artigosFormatados = resultado.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      resumo: a.resumo,
      fonte: a.fonte,
      categorias: a.artigos_categorias
        .map((ac) => ac.categorias?.nome)
        .filter(Boolean),
      insumos: a.artigos_insumos
        .map((ai) => ai.insumos_regenerativos?.nome)
        .filter(Boolean),
    }));

    res.json({
      total: artigosFormatados.length,
      artigos: artigosFormatados,
    });
  } catch (err) {
    next(err);
  }
};

// POST /bot/rag - pergunta do produtor respondida com contexto do banco + OpenAI
export const responderPerguntaRAG = async (req, res, next) => {
  try {
    const { pergunta, mensagem, limit = 5 } = req.body;
    const texto = pergunta || mensagem;

    if (!texto) {
      return res
        .status(400)
        .json({ error: 'Campo "pergunta" ou "mensagem" e obrigatorio.' });
    }

    const resultado = await responderRAG(texto, { limit });

    res.json({
      pergunta: texto,
      ...resultado,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// POST /bot/contexto - somente recupera os trechos/fontes usados pelo RAG
export const recuperarContexto = async (req, res, next) => {
  try {
    const { pergunta, termo, limit = 5 } = req.body;
    const texto = pergunta || termo;

    if (!texto) {
      return res
        .status(400)
        .json({ error: 'Campo "pergunta" ou "termo" e obrigatorio.' });
    }

    const resultado = await recuperarContextoRAG(texto, { limit });
    res.json({ pergunta: texto, ...resultado });
  } catch (err) {
    next(err);
  }
};

// GET /bot/metricas — métricas básicas de uso (mock + dados reais de artigos)
export const obterMetricas = async (req, res, next) => {
  try {
    const [
      { count: totalArtigos },
      { count: totalInsumos },
      { count: totalCategorias },
    ] = await Promise.all([
      supabase
        .from("artigos")
        .select("*", { count: "exact", head: true })
        .eq("status", "publicado"),
      supabase
        .from("insumos_regenerativos")
        .select("*", { count: "exact", head: true }),
      supabase.from("categorias").select("*", { count: "exact", head: true }),
    ]);

    res.json({
      biblioteca: {
        artigos_publicados: totalArtigos,
        insumos_cadastrados: totalInsumos,
        categorias: totalCategorias,
      },
      // Mock do bot — substituir por dados reais quando tiver histórico
      bot_mock: {
        conversas_ativas: 42,
        consultas_completas: 137,
        artigos_mais_consultados: [
          { titulo: "Uso de bokashi no manejo do solo", consultas: 28 },
          {
            titulo: "Biofertilizantes líquidos: resultados em cana",
            consultas: 21,
          },
          {
            titulo: "Compostagem aeróbica em pequenas propriedades",
            consultas: 15,
          },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /bot/pdf
// Recebe PDF do agricultor e retorna interpretação da IA fundamentada na base científica
export const receberPDF = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo PDF enviado." });
    }

    const pergunta =
      req.body?.pergunta || "O que significa essa análise e o que devo fazer?";

    // 1. Extrai o texto do PDF do agricultor
    const textoPDF = await extrairTextoPDF(req.file.buffer);

    // 2. Busca o contexto científico relacionado à pergunta no banco de dados
    const contextoCientifico = await obterContextoArtigos(pergunta, 3);

    // 3. Gera a resposta final combinando os dois contextos
    const resultado = await gerarRespostaComPDF({
      pergunta,
      textoPDF,
      contextoCientifico: contextoCientifico.texto,
    });

    res.json({
      pergunta,
      resposta: resultado.texto,
      modelo: resultado.modelo,
      fontes: contextoCientifico.fontes, // Mostra quais artigos científicos fundamentaram a resposta
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};
