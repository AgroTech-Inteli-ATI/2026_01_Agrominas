from pathlib import Path
import pytesseract
from PIL import Image
from pdf2image import convert_from_path

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def extrair_texto_txt(caminho):
    with open(caminho, "r", encoding="utf-8") as f:
        return f.read()


def extrair_texto_imagem(caminho):
    imagem = Image.open(caminho)
    texto = pytesseract.image_to_string(imagem, lang="por")
    return texto


def extrair_texto_pdf(caminho):
    texto_final = ""

    paginas = convert_from_path(caminho)

    for pagina in paginas:
        texto_final += pytesseract.image_to_string(pagina, lang="por")

    return texto_final


def extrair_texto(caminho_arquivo: str):

    caminho = Path(caminho_arquivo)

    if not caminho.exists():
        raise FileNotFoundError("Arquivo não encontrado")

    extensao = caminho.suffix.lower()

    if extensao == ".txt":
        return extrair_texto_txt(caminho)

    if extensao in [".png", ".jpg", ".jpeg"]:
        return extrair_texto_imagem(caminho)

    if extensao == ".pdf":
        return extrair_texto_pdf(caminho)

    raise ValueError("Formato não suportado")