from openai import OpenAI

client = OpenAI()

try:
    response = client.responses.create(
        model="gpt-5.4",
        input="Responda apenas: conexão funcionando."
    )
    print(response.output_text)
except Exception as e:
    print("Erro ao conectar com a OpenAI:")
    print(e)