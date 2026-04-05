from src.service.processar_analise import processar_analise


def main():

    print("\n AgroMinas - Assistente de Solo\n")

    # Simulação do que virá da API do WhatsApp
    caminho_arquivo = "assets/test_analise_slo.png"

    pergunta_produtor = input(
        "Digite a pergunta do produtor: "
    )

    print("\n Lendo análise de solo...")
    
    resposta = processar_analise(
        caminho_arquivo,
        pergunta_produtor
    )

    print("\n===== RESPOSTA AO PRODUTOR =====\n")
    print(resposta)


if __name__ == "__main__":
    main()