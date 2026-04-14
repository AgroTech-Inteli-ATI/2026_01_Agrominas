from src.ai.cliente_openai import cliente


def analisar_solo(texto_analise: str, pergunta_produtor: str) -> str:

    prompt = f"""
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
"""

    response = cliente.responses.create(
        model="gpt-5.4",
        input=prompt
    )

    return response.output_text.strip()