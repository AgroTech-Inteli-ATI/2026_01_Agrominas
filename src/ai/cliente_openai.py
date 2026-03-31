from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

cliente = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

def perguntar_ia(mensagens):
    resposta = cliente.responses.create(
        model="gpt-5.4",
        input=mensagens
    )

    return resposta.output_text