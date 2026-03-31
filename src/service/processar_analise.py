from src.ai.extrator_arquivo import extrair_texto
from src.ai.agente_agronomico import analisar_solo

def processar_analise(caminho_arquivo: str, pergunta_produtor: str):

    print(" Extraindo análise...")
    texto = extrair_texto(caminho_arquivo)

    print(" IA analisando...")
    resposta = analisar_solo(texto, pergunta_produtor)

    return resposta