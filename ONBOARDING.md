# Sapien — Onboarding de acolhimento (plano)

> **Insight do fundador:** o usuário, ao iniciar o app, precisa **se sentir incluído**.
> Perguntas sobre rotina, estado e objetivos ajudam a criar metas *realistas* e
> direcionam a um ideal melhor de leitura. Acontece **antes** de acessar o SaaS de fato,
> mas já **faz parte do app**.

**Princípio que guia tudo:** ninguém cai num painel vazio. Ao fim das perguntas, o Sapien
**entrega uma rotina pronta** — e o usuário pode aceitar ou dizer *"vou organizar
pessoalmente"*.

**Princípio nº 2 (anti-frustração):** nunca perguntar "quanto você *gostaria* de ler"
(gera meta irreal). Perguntar **"o que caberia numa semana normal"** — frequência ×
duração — e o Sapien calcula a meta.

---

## As 6 perguntas

### 1. Qual frase melhor descreve sua leitura hoje? *(escolha única)*
- Quero voltar a ler depois de uma pausa.
- Leio de vez em quando, mas perco a constância.
- Já leio com frequência e quero acompanhar minha evolução.
- Estou começando a criar o hábito agora.

→ **Efeito:** muda a **linguagem do app**. Quem retoma precisa de *acolhimento*; quem já
lê com frequência recebe **métricas mais detalhadas**.

### 2. O que você mais quer conquistar neste momento? *(escolha única — não múltipla)*
- Retomar o hábito de leitura.
- Terminar o livro que estou lendo.
- Ler com mais regularidade.
- Entender melhor minha evolução.
- Criar uma rotina que caiba na minha semana.

### 3. O que mais costuma atrapalhar sua leitura? *(múltipla, sem limite)*
> Era "até 2", mas o limite foi removido: quem tem várias barreiras precisa poder dizer.
- Falta de tempo · Eu me esqueço de ler · Começo, mas não consigo continuar ·
  Cansaço ou dificuldade de concentração · Metas muito difíceis ·
  Minha rotina muda constantemente · Ainda não encontrei um horário adequado.

→ **Efeito:** personaliza lembretes e mensagens. Ex.: *"Sua rotina pode mudar. Sua meta
semanal continua flexível."*

### 4. O que você está lendo atualmente?
- Pesquisa pelo título · Cadastro manual · "Ainda não estou lendo nenhum livro."
- Depois: **em que ponto da leitura você está?** (página, porcentagem ou "ainda não comecei")

### 5. O que realmente caberia em uma semana normal?
- **Quantas vezes por semana seria possível ler?** 1 · 2 · 3 · 4 · 5 ou mais
- **Quanto tempo caberia em cada leitura?** 10 · 15 · 20 · 30 min · outro

→ Com isso o Sapien calcula uma **meta inicial realista**.

### 6. Como você prefere organizar sua leitura?
- Quero escolher dias específicos → *em quais dias?* → *em qual período?* (manhã/tarde/
  noite/depende do dia)
- Prefiro uma meta semanal flexível.
- Quero que o Sapien sugira uma rotina.

→ Dias não escolhidos viram **dias de descanso naturalmente** — sem chamar atenção para
"faltas".

---

## A entrega (tela final)

> **Sua rotina inicial está pronta**
> Meta: 3 sessões por semana · Duração sugerida: 20 minutos · Meta semanal: 60 minutos
> Dias preferidos: terça, quinta e domingo · Livro atual: *Nome*, página 86
> *Você poderá ajustar tudo quando quiser.*
>
> **Quer começar agora com uma sessão de 10 minutos?**

Dois botões: **aceitar** (grava metas + pomodoro) e **"Vou organizar pessoalmente"**.

---

## Perguntas que ficam para DEPOIS (não perguntar no onboarding)
gêneros favoritos · autores favoritos · meta anual de livros · quantos livros já leu ·
profissão/idade/escolaridade · preferências de aparência · **permissão de notificações
antes de demonstrar valor**.

---

## Notas técnicas (encaixe no que já existe)

- **Pomodoro:** a duração da pergunta 5 grava em `pomodoro.focus` (setting já existente).
- **Metas:** `GoalType` hoje é `livros_ano | livros_mes | paginas_dia | minutos_dia` —
  **falta o conceito semanal** (`sessoes_semana`, `minutos_semana`), que é a base deste
  design. Precisa nascer no schema (desktop + Supabase).
- **Estado do onboarding + respostas:** settings novos (`onboarding.done`,
  `onboarding.profile`, `onboarding.goal`, `onboarding.barriers`, `onboarding.days`,
  `onboarding.period`).
- **Tom do app:** a resposta 1 define um "modo de linguagem" (acolhimento vs. métricas) —
  aplicável ao `lib/encouragement.ts`, que já existe.
- **Livro atual (pergunta 4):** reaproveita a busca combinada (Google Books + Open Library)
  e o cadastro manual que já existem.
