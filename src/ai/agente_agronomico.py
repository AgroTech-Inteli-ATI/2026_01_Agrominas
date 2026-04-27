from src.ai.cliente_openai import cliente


def analisar_solo(texto_analise: str, pergunta_produtor: str) -> str:


    prompt = f"""
Você é um engenheiro agrônomo especialista em fertilidade do solo.

Analise os dados abaixo:

ANÁLISE DE SOLO:
{texto_analise}

PERGUNTA DO PRODUTOR:
{pergunta_produtor}

Responda de forma clara e prática contendo:

1. Diagnóstico do solo
2. Problemas encontrados
3. Correções recomendadas
4. Produtos indicados
5. Forma de aplicação
"""

    response = cliente.responses.create(
        model="gpt-5.4",
        input=prompt
    )

    return response.output_text