from src.ai.extrator_arquivo import extrair_texto
from src.ai.agente_agronomico import analisar_solo

MENSAGEM_ARQUIVO_INVALIDO = (
    "Não consegui ler o arquivo enviado. 😕 "
    "Por favor, envie a análise de solo em formato de imagem (PNG, JPG), PDF ou texto. "
    "Certifique-se de que o arquivo está legível e tente novamente."
)


def processar_analise(caminho_arquivo: str, pergunta_produtor: str) -> str:

    print(" Extraindo análise...")
    texto = extrair_texto(caminho_arquivo)

    if not texto or len(texto.strip()) < 20:
        return MENSAGEM_ARQUIVO_INVALIDO

    print(" IA analisando...")
    resposta = analisar_solo(texto, pergunta_produtor)

    return resposta