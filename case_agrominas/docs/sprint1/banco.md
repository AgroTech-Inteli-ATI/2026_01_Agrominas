# 2. Modelo de Dados do Banco de Dados

## 2.1 Visão Geral

O modelo de dados foi projetado para sustentar a base de conhecimento da plataforma **Guia Regenerativo**, responsável por armazenar e organizar conteúdos técnicos relacionados a insumos regenerativos na agricultura.

A estrutura foi concebida com foco no **MVP (Minimum Viable Product)**, priorizando simplicidade, consistência e escalabilidade inicial, garantindo que o sistema seja capaz de:

* armazenar artigos técnicos estruturados;
* organizar conteúdos por categorias;
* relacionar artigos a insumos regenerativos;
* disponibilizar metadados relevantes para busca e recomendação;
* suportar operações de gerenciamento via painel administrativo;
* fornecer base de dados para consulta pela API e integração com inteligência artificial.

O banco de dados segue o modelo **relacional**, garantindo integridade referencial, normalização e consistência dos dados.

---

## 2.2 Objetivo do Modelo

O modelo de dados tem como principal objetivo estruturar o conteúdo técnico de forma organizada e eficiente, permitindo:

* recuperação rápida de informações;
* filtragem por categorias e atributos técnicos;
* suporte à recomendação de conteúdos relevantes;
* manutenção controlada por usuários autorizados.

Além disso, o modelo separa claramente:

* **dados persistentes** (armazenados no banco);
* **fluxos transitórios** (tratados pela API, como perguntas do bot).

---

## 2.3 Escopo do MVP

Nesta versão inicial, o banco de dados foi intencionalmente simplificado, contemplando apenas os elementos essenciais ao funcionamento do sistema.

### Incluído no modelo:

* Artigos técnicos
* Categorias
* Insumos regenerativos
* Metadados dos artigos
* Usuários administrativos

### Não incluído no modelo:

* histórico de perguntas do bot
* logs detalhados de interação
* controle avançado de permissões
* versionamento de conteúdo

Esses elementos poderão ser incorporados em versões futuras.

---

## 2.4 Entidades do Modelo

### 2.4.1 Usuários Administrativos (`usuarios_admin`)

Responsável por armazenar os usuários que possuem acesso ao painel administrativo.

**Principais atributos:**

* identificação única (UUID);
* nome e email;
* senha criptografada;
* perfil de acesso (`admin` ou `editor`);
* status de ativação.

**Função no sistema:**
Controlar o acesso às operações de criação, edição e exclusão de artigos, conforme definido pela autenticação via JWT.

---

### 2.4.2 Categorias (`categorias`)

Representam a classificação temática dos artigos.

**Exemplos:**

* Manejo do solo
* Bioinsumos
* Recuperação ambiental

**Função no sistema:**
Permitir organização e filtragem de conteúdos, facilitando a navegação e a recomendação.

---

### 2.4.3 Insumos Regenerativos (`insumos_regenerativos`)

Armazenam os insumos utilizados na agricultura regenerativa.

**Principais atributos:**

* nome do insumo;
* descrição;
* benefícios;
* modo de aplicação.

**Função no sistema:**
Relacionar conteúdos técnicos aos insumos, permitindo recomendações mais precisas.

---

### 2.4.4 Artigos (`artigos`)

Entidade central do modelo, responsável por armazenar o conteúdo técnico.

**Principais atributos:**

* título e resumo;
* conteúdo completo;
* autor e fonte;
* data de publicação;
* status (`rascunho`, `publicado`, `arquivado`);
* usuário responsável pela criação.

**Função no sistema:**
Servir como base de conhecimento consultada pelo sistema e pela inteligência artificial.

---

### 2.4.5 Relação Artigos-Categorias (`artigos_categorias`)

Tabela associativa responsável pelo relacionamento **N:N** entre artigos e categorias.

**Função:**
Permitir que:

* um artigo pertença a múltiplas categorias;
* uma categoria contenha múltiplos artigos.

---

### 2.4.6 Relação Artigos-Insumos (`artigos_insumos`)

Tabela associativa que conecta artigos aos insumos regenerativos.

**Função:**
Permitir a vinculação de conteúdos técnicos aos insumos abordados, enriquecendo o contexto das recomendações.

---

### 2.4.7 Metadados dos Artigos (`metadados_artigos`)

Armazena informações complementares que auxiliam na busca e recomendação.

**Principais atributos:**

* cultura agrícola;
* região;
* tipo de solo;
* nível de evidência;
* palavras-chave.

**Função no sistema:**
Apoiar mecanismos de filtragem e fornecer contexto adicional para a inteligência artificial.

---

## 2.5 Relacionamentos

O modelo apresenta os seguintes relacionamentos principais:

* **Usuários → Artigos (1:N)**
  Um usuário pode criar vários artigos.

* **Artigos → Categorias (N:N)**
  Um artigo pode estar em várias categorias.

* **Artigos → Insumos (N:N)**
  Um artigo pode estar relacionado a múltiplos insumos.

* **Artigos → Metadados (1:1)**
  Cada artigo possui um conjunto de metadados associado.

Esses relacionamentos garantem flexibilidade sem comprometer a consistência dos dados.

---

## 2.6 Integridade e Consistência

O banco de dados implementa mecanismos de integridade, tais como:

* **chaves primárias (PK)** para identificação única;
* **chaves estrangeiras (FK)** para garantir consistência entre tabelas;
* **restrições (`CHECK`)** para limitar valores válidos (ex: perfis e status);
* **`ON DELETE CASCADE`** em tabelas associativas para evitar dados órfãos.

---

## 2.7 Considerações de Projeto

### 2.7.1 Separação de responsabilidades

O modelo foi projetado para armazenar exclusivamente dados estruturados e persistentes.

As interações com o bot (perguntas e respostas) são tratadas pela API e não fazem parte do banco de dados neste estágio, evitando acoplamento desnecessário.

---

### 2.7.2 Preparação para integração com IA

Os metadados e a organização por categorias permitem que a API:

1. consulte artigos relevantes;
2. selecione conteúdos com base em contexto;
3. envie essas informações para a IA;
4. gere respostas contextualizadas.

---

### 2.7.3 Escalabilidade futura

O modelo foi estruturado de forma a permitir evolução futura, incluindo:

* histórico de interações do bot;
* sistema de recomendação mais avançado;
* versionamento de artigos;
* enriquecimento de metadados.

---

## 2.8 Conclusão

O modelo de dados desenvolvido atende plenamente às necessidades do MVP da plataforma, oferecendo uma estrutura clara, consistente e extensível.

Ele possibilita a organização eficiente dos conteúdos técnicos, garantindo suporte às funcionalidades da API e à integração com inteligência artificial, ao mesmo tempo em que mantém simplicidade suficiente para rápida implementação e validação do sistema.

A abordagem adotada demonstra um equilíbrio entre robustez e pragmatismo, assegurando que o sistema esteja preparado para evoluções futuras sem comprometer sua implementação inicial.
