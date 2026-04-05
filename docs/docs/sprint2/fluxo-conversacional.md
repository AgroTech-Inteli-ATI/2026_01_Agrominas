# Fluxo Conversacional do Bot WhatsApp
## 1. Visão Geral do Fluxo

&ensp; O bot opera com menus numerados simples. O produtor navega sempre escolhendo um número e, ao final de cada consulta, retorna ao ponto de origem ou encerra a conversa.

## 2. Mensagem de Boas-vindas

**Gatilho:** Qualquer primeira mensagem enviada pelo usuário (ex: "oi", "olá", "1", ou qualquer texto inicial).

---

**[BOT — Boas-vindas]**
```
Olá! 👋 Bem-vindo ao *Guia Regenerativo* da Agrominas.

Sou seu assistente de insumos e manejo sustentável. Estou aqui para te ajudar a encontrar informações técnicas sobre práticas regenerativas de forma simples e rápida.

Para começar, escolha uma opção abaixo:

1️⃣ Insumos Regenerativos Específicos
2️⃣ Cultura / Tipo de Plantio
3️⃣ Dúvidas Gerais sobre Solo
4️⃣ Encerrar atendimento

👉 Digite o *número* da opção desejada.
```

---

## 3. Menu Principal

**[INPUT esperado]:** `1`, `2`, `3` ou `4`

| Entrada | Ação |
|--------|------|
| `1` | Ir para o fluxo de Insumos Regenerativos |
| `2` | Ir para o fluxo de Cultura / Plantio |
| `3` | Ir para o fluxo de Solo |
| `4` | Ir para o fluxo de Encerramento |
| Qualquer outro texto | → **Fallback do Menu Principal** |

---

**[FALLBACK — Menu Principal]**
 Acionado quando o usuário digita algo diferente de 1, 2, 3 ou 4.

```
Hmm, não reconheci essa opção. 🤔

Por favor, digite apenas o *número* correspondente à sua escolha:

1️⃣ Insumos Regenerativos Específicos
2️⃣ Cultura / Tipo de Plantio
3️⃣ Dúvidas Gerais sobre Solo
4️⃣ Encerrar atendimento
```

 **Regra:** após **2 fallbacks consecutivos** no mesmo menu, enviar mensagem de suporte (ver Seção 8).

---

## 4. Tema 1 — Insumos Regenerativos Específicos

### 4.1 Apresentação do Sub-menu

**[BOT — Sub-menu Insumos]**
```
Ótimo! Vamos falar sobre *insumos regenerativos*. 🌿

Selecione o tipo de insumo sobre o qual deseja mais informações:

1️⃣ Biofertilizantes
2️⃣ Compostos Orgânicos
3️⃣ Inoculantes Biológicos
4️⃣ Calcário e Corretivos de Solo
5️⃣ Silicatos e Rochagem
6️⃣ Outro (digitar o nome do insumo)
0️⃣ Voltar ao Menu Principal

👉 Digite o número da opção.
```

**[INPUT esperado]:** `1`, `2`, `3`, `4`, `5`, `6`, `0`

| Entrada | Ação |
|--------|------|
| `1` a `5` | Exibir conteúdo técnico do insumo selecionado |
| `6` | Ativar modo de busca livre por nome do insumo |
| `0` | Voltar ao Menu Principal |
| Qualquer outro | → **Fallback do Sub-menu Insumos** |

---

### 4.2 Resposta de Conteúdo (exemplo: Biofertilizantes)

**[BOT — Conteúdo do Insumo]**
```
📋 *Biofertilizantes*

*O que são:* Produtos derivados da fermentação de materiais orgânicos ou de microrganismos que atuam na nutrição e saúde do solo.

*Benefícios principais:*
- Melhoria da atividade biológica do solo
- Redução da dependência de fertilizantes sintéticos
- Incremento gradual na disponibilidade de nutrientes

*Indicação de uso:* Aplicar via fertirrigação ou pulverização foliar, preferencialmente no período de maior atividade radicular da cultura.

📄 Quer ver mais detalhes técnicos ou referências científicas?

1️⃣ Sim, quero ver o artigo completo
2️⃣ Consultar outro insumo
0️⃣ Voltar ao Menu Principal
```

---

### 4.3 Modo Busca Livre (Opção 6)

**[BOT — Busca Livre]**
```
Tudo bem! Digite o nome do insumo que você quer pesquisar:

(Ex: "húmus de minhoca", "torta de mamona", "pó de basalto")
```

**[INPUT esperado]:** Texto livre com nome do insumo

- **Se encontrado na biblioteca:** Exibir o conteúdo do insumo conforme padrão da Seção 4.2.
- **Se não encontrado:** → **Fallback de Busca Livre**

---

**[FALLBACK — Busca Livre: Insumo Não Encontrado]**
```
Poxa, ainda não temos esse insumo em nossa biblioteca. 😕

Mas não se preocupe! Aqui estão suas opções:

1️⃣ Tentar buscar por outro nome
2️⃣ Ver a lista de insumos disponíveis
0️⃣ Voltar ao Menu Principal
```

---

**[FALLBACK — Sub-menu Insumos: Entrada Inválida]**
```
Não entendi sua resposta. Por favor, digite apenas um número entre 0 e 6:

1️⃣ Biofertilizantes
2️⃣ Compostos Orgânicos
3️⃣ Inoculantes Biológicos
4️⃣ Calcário e Corretivos de Solo
5️⃣ Silicatos e Rochagem
6️⃣ Outro (digitar o nome)
0️⃣ Voltar ao Menu Principal
```

---

## 5. Tema 2 — Cultura / Tipo de Plantio

### 5.1 Apresentação do Sub-menu

**[BOT — Sub-menu Cultura]**
```
Entendido! Vamos buscar recomendações por *tipo de cultura*. 🌾

Selecione a cultura ou tipo de plantio:

1️⃣ Soja
2️⃣ Milho
3️⃣ Café
4️⃣ Cana-de-açúcar
5️⃣ Hortaliças / Olericultura
6️⃣ Pastagem / Forrageiras
7️⃣ Outra cultura (digitar o nome)
0️⃣ Voltar ao Menu Principal

👉 Digite o número da opção.
```

**[INPUT esperado]:** `1` a `7`, `0`

| Entrada | Ação |
|--------|------|
| `1` a `6` | Exibir recomendações de insumos regenerativos para aquela cultura |
| `7` | Ativar busca livre por nome da cultura |
| `0` | Voltar ao Menu Principal |
| Qualquer outro | → **Fallback do Sub-menu Cultura** |

---

### 5.2 Resposta de Conteúdo por Cultura (exemplo: Soja)

**[BOT — Conteúdo Cultura]**
```
🌱 *Insumos Regenerativos para Soja*

Práticas e produtos recomendados para equilibrar produtividade e saúde do solo:

✅ *Inoculação com Bradyrhizobium:* Fixa nitrogênio atmosférico, reduzindo a necessidade de adubação nitrogenada.
✅ *Biofertilizantes foliares:* Complementam a nutrição sem agredir a microbiota do solo.
✅ *Calcário dolomítico:* Correção do pH e fornecimento de cálcio e magnésio.

📄 Deseja ver mais detalhes sobre algum desses insumos?

1️⃣ Sim, escolher um insumo para aprofundar
2️⃣ Consultar outra cultura
0️⃣ Voltar ao Menu Principal
```

Se o usuário escolher `1`, redirecionar para o Sub-menu de Insumos (Seção 4.1), com contexto de cultura já salvo.

---

### 5.3 Busca Livre por Cultura (Opção 7)

**[BOT — Busca Livre Cultura]**
```
Digite o nome da sua cultura ou tipo de plantio:

(Ex: "feijão", "tomate", "eucalipto", "banana")
```

- **Se encontrada:** Exibir conteúdo conforme padrão da Seção 5.2.
- **Se não encontrada:** → **Fallback de Cultura Não Encontrada**

---

**[FALLBACK — Cultura Não Encontrada]**
```
Ainda não temos recomendações específicas para essa cultura. 🌿

O que você prefere fazer?

1️⃣ Buscar por outra cultura
2️⃣ Consultar insumos regenerativos gerais
0️⃣ Voltar ao Menu Principal
```

---

**[FALLBACK — Sub-menu Cultura: Entrada Inválida]**
```
Não reconheci essa opção. Por favor, digite apenas um número entre 0 e 7:

1️⃣ Soja  2️⃣ Milho  3️⃣ Café
4️⃣ Cana-de-açúcar  5️⃣ Hortaliças
6️⃣ Pastagem  7️⃣ Outra cultura
0️⃣ Voltar ao Menu Principal
```

---

## 6. Tema 3 — Dúvidas Gerais sobre Solo

### 6.1 Apresentação do Sub-menu

**[BOT — Sub-menu Solo]**
```
Vamos falar sobre o *solo*! 🌍 É a base de tudo.

Selecione o tema da sua dúvida:

1️⃣ Análise de Solo (como interpretar resultados)
2️⃣ pH e Correção de Acidez
3️⃣ Compactação e Estrutura do Solo
4️⃣ Matéria Orgânica e Biologia do Solo
5️⃣ Erosão e Conservação
6️⃣ Enviar meu Laudo de Solo (PDF) para análise
0️⃣ Voltar ao Menu Principal

👉 Digite o número do tema.
```

**[INPUT esperado]:** `1` a `6`, `0`

| Entrada | Ação |
|--------|------|
| `1` a `5` | Exibir conteúdo sobre o tema do solo |
| `6` | Iniciar fluxo de Upload de Laudo (Seção 7) |
| `0` | Voltar ao Menu Principal |
| Qualquer outro | → **Fallback do Sub-menu Solo** |

---

### 6.2 Resposta de Conteúdo sobre Solo (exemplo: pH e Correção)

**[BOT — Conteúdo Solo]**
```
🧪 *pH e Correção de Acidez*

O pH ideal para a maioria das culturas fica entre *5,5 e 6,5*.

*Como corrigir:*
- *Calcário agrícola:* Neutraliza a acidez e fornece cálcio e magnésio.
- *Cal virgem / cal hidratada:* Ação mais rápida, mas exige cuidado com dosagem.
- *Silicatos:* Alternativa regenerativa com efeito residual mais longo.

*Quando aplicar:* Preferencialmente de 3 a 6 meses antes do plantio, incorporado ao solo.

📄 Deseja ver referências técnicas ou consultar outro tema?

1️⃣ Ver artigo completo com referências
2️⃣ Consultar outro tema de solo
0️⃣ Voltar ao Menu Principal
```

---

**[FALLBACK — Sub-menu Solo: Entrada Inválida]**
```
Não entendi. Por favor, escolha um número entre 0 e 6:

1️⃣ Análise de Solo
2️⃣ pH e Correção de Acidez
3️⃣ Compactação e Estrutura
4️⃣ Matéria Orgânica e Biologia
5️⃣ Erosão e Conservação
6️⃣ Enviar Laudo de Solo (PDF)
0️⃣ Voltar ao Menu Principal
```

---

## 7. Fluxo de Upload de Laudo de Solo (PDF)

**Contexto:** acionado quando o produtor escolhe a opção `6` no Sub-menu de Solo. A IA lê o laudo enviado e retorna recomendações de insumos regenerativos personalizadas.

---

### 7.1 Instrução de Envio

**[BOT — Solicitação do PDF]**
```
Ótimo! Você pode enviar o laudo de análise de solo aqui mesmo pelo WhatsApp. 📎

*Antes de enviar, confira:*
✅ O arquivo deve estar no formato *PDF*
✅ Tamanho máximo: *10 MB*
✅ Deve ser um laudo de análise de solo (laboratório)

Envie o arquivo agora e aguarde a análise. ⏳
```

---

### 7.2 Recebimento e Validação do Arquivo

**[INPUT esperado]:** Arquivo PDF anexado pelo produtor

| Situação | Ação |
|----------|------|
| PDF válido (formato e tamanho OK) | Confirmação de recebimento + processamento (7.3) |
| Arquivo não é PDF (imagem, Word, etc.) | **Fallback: Formato Inválido** (7.5) |
| PDF acima de 10 MB | **Fallback: Arquivo Muito Grande** (7.5) |
| Usuário envia texto em vez de arquivo | **Fallback: Nenhum Arquivo** (7.5) |
| Usuário demora mais de 5 minutos | **Fallback de Timeout de Upload** (7.5) |

---

### 7.3 Confirmação e Processamento

**[BOT — Confirmação de Recebimento]**
```
Recebi seu laudo! 🎉

Estou analisando as informações... Isso pode levar alguns segundos. ⏳
```

 **Internamente:** o sistema extrai o texto do PDF e envia para a IA interpretar os dados do laudo (pH, matéria orgânica, macro e micronutrientes, etc.) e gerar recomendações baseadas na biblioteca de insumos regenerativos da Agrominas.

---

### 7.4 Resposta com Recomendações

**[BOT — Resultado da Análise]**
```
📊 *Análise do seu Laudo de Solo*

Com base nos dados do seu laudo, identifiquei o seguinte:

🔎 *Pontos de atenção:*
- pH: [valor identificado] — [avaliação ex: "levemente ácido, recomenda-se correção"]
- Matéria Orgânica: [valor] — [avaliação]
- [outros parâmetros relevantes identificados no laudo]

🌱 *Insumos Regenerativos Recomendados:*
1. [Insumo 1] — [motivo da recomendação]
2. [Insumo 2] — [motivo da recomendação]
3. [Insumo 3] — [motivo da recomendação]

⚠️ *Aviso importante:* Estas são recomendações orientativas baseadas em evidências técnicas. Consulte sempre um agrônomo para validação antes da aplicação.

Deseja saber mais sobre algum desses insumos?

1️⃣ Sim, quero detalhes de um insumo
2️⃣ Enviar outro laudo
0️⃣ Voltar ao Menu Principal
```

 Se o usuário escolher `1`, redirecionar para o Sub-menu de Insumos (Seção 4.1) com o contexto do laudo salvo.

---

### 7.5 Fallbacks do Fluxo de Upload

---

**[FALLBACK — Formato Inválido]**
&ensp; Acionado quando o arquivo enviado não é um PDF.
```
Hmm, esse arquivo não está no formato correto. 🤔

Por favor, envie apenas arquivos em formato *PDF*.

Se o seu laudo estiver em outro formato (foto, imagem, Word), tente convertê-lo para PDF antes de enviar.

Deseja tentar novamente?

1️⃣ Sim, vou enviar o PDF
0️⃣ Voltar ao Menu Principal
```

---

**[FALLBACK — Arquivo Muito Grande]**
 Acionado quando o PDF ultrapassa 10 MB.
```
Ops! O arquivo enviado é muito grande. 😕

O tamanho máximo aceito é de *10 MB*.

Tente compactar o PDF ou envie apenas as páginas do laudo de solo.

Deseja tentar novamente?

1️⃣ Sim, vou enviar um arquivo menor
0️⃣ Voltar ao Menu Principal
```

---

**[FALLBACK — Nenhum Arquivo Enviado]**
 Acionado quando o usuário digita texto em vez de anexar um arquivo.
```
Parece que você enviou uma mensagem de texto, mas eu preciso do arquivo PDF do laudo. 📎

Para enviar, toque no ícone de anexo 📎 no WhatsApp e selecione o arquivo PDF do seu laudo de solo.

Deseja tentar novamente?

1️⃣ Sim, vou anexar o arquivo
0️⃣ Voltar ao Menu Principal
```

---

**[FALLBACK — Timeout de Upload]**
&ensp; Acionado quando o produtor não envia o arquivo após 5 minutos.
```
Ainda não recebi seu laudo. 🕐

Sem problema! Quando quiser enviar, é só mandar o arquivo PDF aqui.

1️⃣ Quero enviar o laudo agora
0️⃣ Voltar ao Menu Principal
```

---

**[FALLBACK — IA Não Conseguiu Interpretar o Laudo]**
&ensp; Acionado quando o PDF é válido mas a IA não consegue extrair dados suficientes (ex: laudo escaneado com baixa qualidade, formato não reconhecido).
```
Recebi o arquivo, mas não consegui ler as informações com clareza. 😕

Isso pode acontecer quando o laudo está em formato de imagem ou com baixa resolução.

O que você prefere fazer?

1️⃣ Enviar outro arquivo com melhor qualidade
2️⃣ Consultar os temas de solo manualmente
0️⃣ Voltar ao Menu Principal
```

---

## 8. Encerramento da Conversa

**Gatilho:** Usuário seleciona `4` no Menu Principal, ou digita "sair", "tchau", "encerrar", "fim".

---

**[BOT — Encerramento]**
```
Obrigado por usar o *Guia Regenerativo* da Agrominas! 🌱

Esperamos ter ajudado. Lembre-se: cada passo em direção à agricultura regenerativa faz diferença para o seu solo e para o futuro do campo.

Se precisar de mais informações, é só mandar uma mensagem aqui.

Até mais! 👋
```

 **Após o encerramento:** a sessão é resetada. A próxima mensagem do usuário aciona o fluxo de Boas-vindas novamente.

---

## 9. Fallbacks Globais

Estas mensagens são acionadas em situações que transcendem um menu específico.

---

### 9.1 Fallback de Reincidência (2 erros consecutivos no mesmo menu)

 Acionado quando o usuário erra a entrada **2 vezes seguidas** sem conseguir avançar.

**[BOT]**
```
Parece que está tendo alguma dificuldade. Sem problema! 😊

Você pode:
1️⃣ Tentar novamente (vou repetir as opções)
2️⃣ Falar com um especialista da Agrominas

Se quiser falar com um especialista, acesse: [link ou contato da Agrominas]
```

---

### 9.2 Fallback de Mensagem Vazia ou Ilegível

 Acionado quando o usuário envia apenas espaços, emojis sem texto ou figurinhas. Áudios e arquivos enviados fora do fluxo de upload também acionam este fallback.

**[BOT]**
```
Não consegui entender sua mensagem. 🤔

Por favor, responda com o *número* da opção do menu. Se quiser recomeçar do início, escreva *menu*.
```

---

### 9.3 Fallback de Tempo Inativo (Timeout)

 Acionado quando o usuário não responde por **X minutos** (tempo a definir pela equipe técnica, sugestão: 10 minutos).

**[BOT]**
```
Oi! Você ainda está por aí? 👀

Sua sessão ficou inativa por alguns minutos. Se quiser continuar, é só digitar *menu* para recomeçar.
```

---

### 9.4 Palavra-chave "Menu" em Qualquer Ponto

 Acionado quando o usuário digita "menu", "início", "inicio" ou "voltar" em qualquer etapa.

**Ação:** Retornar imediatamente ao **Menu Principal** (Seção 3).

**[BOT]**
```
Claro! Voltando ao menu principal. 👇

1️⃣ Insumos Regenerativos Específicos
2️⃣ Cultura / Tipo de Plantio
3️⃣ Dúvidas Gerais sobre Solo
4️⃣ Encerrar atendimento

👉 Digite o número da opção.
```

---

### 9.5 Fallback de Erro do Sistema

&ensp; Acionado quando há falha na consulta à biblioteca (erro de API, timeout do servidor, etc.).

**[BOT]**
```
Ops! Ocorreu um erro ao buscar essa informação. 😕

Tente novamente em alguns instantes ou volte ao menu principal digitando *menu*.

Se o problema persistir, entre em contato com a Agrominas: [contato]
```

---

## 10. Conclusão 

&ensp; Todo o conteúdo entregue pelo bot ao produtor não é gerado livremente pela IA. As respostas são construídas a partir de um processo de funil guiado pelo próprio fluxo de perguntas.

### Como funciona na prática

&ensp; Cada escolha que o produtor faz dentro dos menus funciona como um filtro progressivo. Ao navegar pelo fluxo, selecionando tema, cultura, tipo de insumo ou enviando seu laudo, o bot acumula contexto suficiente para identificar com precisão qual dúvida está sendo feita.

&ensp; A partir desse ponto, a IA não responde com conhecimento genérico: ela consulta a biblioteca de artigos científicos da Agrominas e seleciona os documentos técnicos mais relevantes para aquela combinação específica de filtros. A resposta final é então construída com base nesse material.
### O ponto de ativação
&ensp; O funil de perguntas foi desenhado para que, a partir do segundo nível de escolha (sub-menu), o contexto já seja suficiente para a IA realizar uma busca precisa na biblioteca. Por exemplo:

- Produtor escolhe Solo -> pH e Correção de Acidez -> a IA busca artigos sobre correção de pH com insumos regenerativos
- Produtor escolhe Cultura -> Soja -> a IA busca artigos sobre manejo regenerativo específico para soja
- Produtor envia laudo PDF -> a IA cruza os dados do laudo com artigos sobre os nutrientes e parâmetros identificados