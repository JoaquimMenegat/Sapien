# Sapien — De rastreador a treinador de hábito

Três peças que transformam *"o app que te faz voltar a ler"* de slogan em verdade
verificável. As três são a mesma ideia: **o Sapien falar com o leitor na hora certa,
do jeito certo.**

---

## 1. Lembretes — a agenda que toca 🔔

**Problema:** o onboarding pergunta se o usuário "esquece de ler", e o app não tem
como lembrar. A agenda é um calendário mudo.

**Solução:** e-mail (o Resend já está configurado e o domínio verificado).

### Restrição real de infraestrutura
A Vercel no plano gratuito roda **cron 1x por dia**. Lembrete no minuto exato exigiria
chamadas de hora em hora. Então:

- **v1 (agora, custo zero):** um **resumo diário pela manhã** — *"Hoje você tem leitura
  às 21h: Sapiens."* Já resolve o "esqueci que hoje era dia".
- **v2 (quando quiser precisão):** o mesmo endpoint aceita ser chamado de hora em hora
  por um agendador externo gratuito (GitHub Actions ou `pg_cron` do Supabase), aí o
  e-mail chega **na hora marcada**. Nenhum código muda — só o gatilho.

### Regras (LGPD e respeito)
- Toggle em Personalização (`reminders.email`), desligável a qualquer momento.
- Nunca mais de **1 e-mail por dia**. Sem agenda no dia = sem e-mail.
- Todo e-mail traz como desativar.
- Tom: convite, nunca cobrança.

---

## 2. Usar as respostas do onboarding 🎯

Hoje as respostas dormem no banco. O plano é cada resposta virar **comportamento
concreto** do app.

### Q1 · Perfil → o **tom** do app
| Resposta | Como o Sapien fala |
| -------- | ------------------ |
| Voltando após pausa | Acolhimento. Celebra qualquer sessão. Nunca cita o tempo parado. |
| Perco a constância | Foco em sequência e regularidade, não em volume. |
| Já leio com frequência | Métricas densas: ritmo, comparativos, evolução. |
| Começando o hábito | Passos pequenos, explica o porquê de cada coisa. |

### Q2 · Objetivo → **o que lidera a tela**
| Objetivo | O painel abre com |
| -------- | ----------------- |
| Retomar o hábito | Sequência + "qualquer leitura conta" |
| Terminar o livro atual | Progresso do livro: quanto falta, tempo estimado |
| Ler com regularidade | Sequência semanal + próxima leitura da agenda |
| Entender minha evolução | Ritmo e gráficos de evolução |
| Criar uma rotina | A Agenda em destaque |

### Q3 · Barreiras → **ajustes concretos** (o mais valioso)
| Barreira | O que o Sapien faz |
| -------- | ------------------ |
| Falta de tempo | Sugere sessões de 10–15 min e mostra "10 min ≈ 7 páginas no seu ritmo" |
| Eu me esqueço | Lembretes **ligados por padrão** e reforçados |
| Começo e não continuo | Sempre lembra **onde parou** e propõe só o próximo passo |
| Cansaço/concentração | Sessões menores; sugere trocar de horário se o desempenho cai |
| Metas muito difíceis | Metas conservadoras; **nunca** sugere aumentar sozinho |
| Rotina muda | Meta **semanal flexível** em vez de dias fixos: "sua meta continua flexível" |
| Sem horário adequado | Depois de ~2 semanas, mostra em que horário ele **de fato** lê melhor |

> Regra: se o usuário marcou várias barreiras, o app **prioriza uma ou duas** — falar de
> tudo ao mesmo tempo vira ruído.

### Onde isso aparece
Principalmente no `lib/encouragement.ts` (que já existe e já prioriza evolução), na
sugestão de metas e na duração padrão das sessões.

---

## 3. Retorno sem culpa 💚

**O momento que define o produto.** Todo hábito quebra. O que separa um treinador de um
fiscal é o que acontece quando a pessoa some por 5 dias.

Hoje: ela volta, vê a sequência zerada e sente que fracassou. É aí que desinstala.

### O conceito: *nada se perde*

**a) A sequência deixa de ser punição.** Passa a existir **"melhor sequência"** (recorde,
que **nunca** é perdido) ao lado da sequência atual. Recorde é conquista permanente; a
sequência atual é só o momento.

**b) Tela de boas-vindas de volta.** Ao detectar ausência (7+ dias), o painel abre
diferente — sem gráfico de falha, sem vermelho:

> **Que bom te ver de volta.**
> Nada se perdeu: você já leu 1.240 páginas no Sapien.
> Quer recomeçar com 10 minutos hoje?
> [ Começar 10 minutos ]

Um botão só. A menor porta de entrada possível.

**c) Retomadas viram métrica positiva.** "Esta é sua 3ª retomada." Quem volta é leitor —
o app trata retomar como sinal de força, não de fracasso.

**d) Ajuste sem vergonha.** Junto do acolhimento, uma oferta discreta: *"quer diminuir a
meta por enquanto?"* — se a meta é o que está quebrando, ela cede, não a pessoa.

**e) Vocabulário proibido no produto inteiro:** "você falhou", "sequência perdida",
"você está atrasado", "meta não cumprida". Sempre a versão neutra ou convidativa.

**f) Um único e-mail de retorno** (~7 dias sem ler), gentil, fácil de desativar. Nunca
uma sequência de cobranças.

---

## Ordem de execução
1. **Lembretes v1** (resumo diário) — fecha o maior buraco.
2. **Barreiras → comportamento** (tabela da parte 2).
3. **Retorno sem culpa** (recorde de sequência + tela de boas-vindas + e-mail de retorno).

## Em aberto (decisão do fundador)
- **Mobile:** o hábito acontece longe do desktop. Sem app/PWA no celular, registrar tem
  atrito no momento exato do hábito. Adiado — mas é limitação estrutural desta promessa.
- **Paywall:** hoje tranca Metas (o motor do hábito). Discussão pendente sobre mover a
  cobrança para rotina/coaching em vez de gráficos.
