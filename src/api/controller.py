from src.service.processar_analise import processar_analise


def receber_mensagem_whatsapp(dados):

    arquivo = dados["arquivo"]
    pergunta = dados["mensagem"]

    resposta = processar_analise(arquivo, pergunta)

    return {
        "resposta": resposta
    }