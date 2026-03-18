# Wireframes
## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Objetivo dos Wireframes](#2-objetivo-dos-wireframes)
3. [Arquitetura das Telas](#3-arquitetura-das-telas)
4. [Componentes de Interface](#4-componentes-de-interface)
5. [Estados de Interface e Feedback](#5-estados-de-interface-e-feedback)
6. [Regras Funcionais e Não Funcionais](#6-regras-funcionais-e-não-funcionais)
7. [Conclusão](#7-conclusão)

---

## 1. Visão Geral

Este documento apresenta a especificação dos wireframes da funcionalidade de gestão de fontes do painel administrativo. O foco está no comportamento da interface e na organização visual das ações de adicionar, consultar, editar e remover conteúdos da biblioteca.

As telas modeladas representam o fluxo principal de curadoria do acervo técnico: entrada de novas fontes, confirmação do envio e manutenção dos itens já cadastrados. A proposta foi estruturada para apoiar tarefas recorrentes da equipe interna com navegação simples e previsível.

---

## 2. Objetivo dos Wireframes

Os wireframes têm como objetivo definir a base de interação da funcionalidade antes da implementação visual final, garantindo clareza sobre estrutura, hierarquia de informação e sequência operacional.

No escopo desta documentação, os protótipos cobrem três momentos da jornada:

- tela inicial para adicionar novas fontes ou pesquisar fontes existentes;
- tela de confirmação de arquivos anexados antes do envio;
- tela de consulta com ações de CRUD por item.

---

## 3. Arquitetura das Telas

A arquitetura proposta distribui a experiência em três telas integradas.

### 3.1 Tela Inicial

A tela inicial concentra os pontos de entrada de conteúdo. Ela combina barra de busca superior com área de drag-and-drop e botões de origem alternativa (arquivos locais, sites, Drive e texto copiado).

![Wireframe da tela inicial](https://res.cloudinary.com/djwea91x2/image/upload/v1773799194/tela_inicial_my0doh.jpg)

### 3.2 Tela de Confirmação de Envio

Após a seleção de anexos, os arquivos são apresentados em cards para revisão final. Essa etapa formaliza a validação humana do lote antes da persistência na biblioteca.

![Wireframe da tela de confirmação de envio](https://res.cloudinary.com/djwea91x2/image/upload/v1773799195/tela_inser%C3%A7%C3%A3o_fsy1nj.jpg)

### 3.3 Tela de Consulta e CRUD

A tela de consulta exibe resultados em lista, com card lateral e bloco descritivo. Cada item possui menu contextual para ações de edição e exclusão, permitindo manutenção contínua da base.

![Wireframe da tela de consulta](https://res.cloudinary.com/djwea91x2/image/upload/v1773799195/tela_consulta_ipze8p.jpg)

![Wireframe da tela de CRUD (menu contextual)](https://res.cloudinary.com/djwea91x2/image/upload/v1773799195/tela_crud_ucgtm4.jpg)

---

## 4. Componentes de Interface

A especificação dos wireframes considera os seguintes componentes como centrais para a usabilidade do módulo.

### 4.1 Barra de Busca

Presente na tela inicial e na tela de consulta, permite busca textual por termos livres para localização rápida de fontes.

### 4.2 Área de Upload (Dropzone)

Elemento de destaque da tela inicial para arrastar e soltar arquivos, com suporte ao envio por seletor tradicional de arquivos.

### 4.3 Ações de Fonte Externa

Botões auxiliares para inclusão por site, Drive e texto copiado, mantendo múltiplos canais de entrada no mesmo fluxo de gestão.

### 4.4 Cards de Confirmação

Representam visualmente os anexos selecionados e organizam a revisão antes do envio definitivo.

### 4.5 Lista de Resultados

Apresenta as fontes cadastradas com leitura escaneável e menu de opções por item.

### 4.6 Menu Contextual (CRUD)

Controla ações de manutenção sobre cada fonte, com opções de editar e apagar de forma contextual.

---

## 5. Estados de Interface e Feedback

Os wireframes contemplam estados essenciais para previsibilidade de uso.

- estado vazio: ausência de resultados ou ausência de anexos selecionados;
- estado de carregamento: processamento de busca ou envio;
- estado de sucesso: confirmação de inclusão, edição ou remoção;
- estado de erro: falha de validação, integração ou indisponibilidade temporária;
- estado com dados: lista populada e pronta para manutenção.

As mensagens de feedback devem ser curtas, diretas e orientadas à próxima ação do usuário.

---

## 6. Regras Funcionais e Não Funcionais

### 6.1 Regras Funcionais

- RF01: permitir pesquisa de fontes por texto;
- RF02: permitir inclusão de conteúdo por upload local;
- RF03: permitir inclusão por canais externos (site, Drive e texto copiado);
- RF04: exigir confirmação do lote antes do envio final;
- RF05: permitir edição de item existente;
- RF06: permitir exclusão de item com confirmação de ação.

### 6.2 Regras Não Funcionais

- RNF01: manter a navegação objetiva, com baixo número de interações por tarefa;
- RNF02: preservar consistência visual entre as três telas;
- RNF03: apresentar feedback imediato para ações críticas;
- RNF04: garantir legibilidade e acessibilidade mínima dos componentes;
- RNF05: manter responsividade para diferentes larguras de tela.

---

## 7. Conclusão

A documentação de wireframes consolida a estrutura da experiência de gestão de fontes no painel administrativo, definindo os pontos de interação necessários para inclusão, consulta e manutenção do acervo.

Com essa base, a equipe pode evoluir para prototipação de alta fidelidade e implementação front-end com menor risco de retrabalho, mantendo alinhamento entre design, produto e desenvolvimento.

---

*Documento gerado para o projeto Guia Regenerativo - AgroTech Inteli + Agrominas Fertilizantes.*
