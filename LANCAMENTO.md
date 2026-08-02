# Sapien — Roadmap de Lançamento: Segurança + Empresa (PJ)

> **Aviso importante:** este documento é **orientação geral**, não aconselhamento
> jurídico ou contábil. As partes sobre abrir empresa, impostos e obrigações **devem
> ser confirmadas com um contador** (e os termos/privacidade, idealmente, com um
> advogado). Onde um profissional é necessário, está marcado com 👤.

O lançamento acontece em **dois estágios**, de propósito:

1. **Estágio 1 — Pessoa Física (agora):** endurecer a segurança, testar tudo a fundo,
   rodar um beta pequeno e validar que o produto e a operação estão sólidos.
2. **Estágio 2 — Pessoa Jurídica (depois):** com o produto validado, constituir a
   empresa, migrar a cobrança para o CNPJ e abrir ao público de verdade.

A regra de ouro: **só se gasta com PJ (contador, taxas, impostos) depois de provar que
existe gente disposta a pagar.** Segurança e validação vêm primeiro.

---

## PARTE 1 — Segurança (pré-lançamento) 🔒

O medo de "ter o site roubado" é legítimo, mas nesse stack (Supabase + Vercel) os riscos
reais são **poucos e conhecidos**. Se estes pontos estiverem certos, o grosso do risco
some. Ordem por criticidade:

### 1.1 Isolamento de dados entre usuários (RLS) — **o mais crítico**
O maior risco de um SaaS assim é um usuário conseguir **ler ou alterar dados de outro**.
No Supabase isso é controlado por **Row Level Security (RLS)**.
- [ ] Confirmar que **todas** as tabelas com dados de usuário têm RLS **ativado** e com
      policy `auth.uid() = user_id`: `books`, `reading_sessions`, `goals`, `notes`,
      `user_settings`, `profiles`, `subscriptions`.
- [ ] Confirmar que `subscriptions` **não** tem policy de escrita (só o servidor grava,
      via `service_role`). ✅ já foi feito assim.
- [ ] Rodar o **Security Advisor** do Supabase (Dashboard → Advisors) e zerar os alertas.
- [ ] **Teste prático:** logar com dois usuários e tentar, via API, ler o `user_id` do
      outro (ex.: `books?user_id=eq.<id-do-outro>`) — tem que voltar **vazio**.

### 1.2 Segredos e o que vai pro navegador
- [ ] Garantir que `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN`
      existem **só como env var de servidor** (sem prefixo `VITE_`) — nunca no bundle.
- [ ] **Auditar o bundle publicado:** baixar o JS de produção e procurar por `service_role`,
      `sk_`, `access_token`, a chave do Asaas — não pode aparecer nada.
- [ ] Confirmar que a chave pública do Supabase no frontend é a **anon/publishable**
      (essa pode ser pública — é protegida pela RLS).

### 1.3 Autenticação
- [x] Confirmação de e-mail obrigatória, CAPTCHA (Turnstile), senha mínima de 8.
- [ ] Revisar **rate limiting** do Supabase Auth (proteção contra força bruta).
- [ ] (Se um dia assinar o Supabase Pro) ligar **"leaked password protection"**.
- [ ] Testar: reset de senha, troca de e-mail e exclusão de conta de ponta a ponta.

### 1.4 Endpoints de servidor (`/api/*`)
- [ ] `subscribe` / `subscription` / `cancel`: exigem **token válido do Supabase** e só
      operam sobre o **próprio** usuário. ✅ conferir de novo.
- [ ] `asaas-webhook`: valida o **token do webhook** no header. ✅ conferir.
- [ ] Nenhum endpoint devolve dado sensível sem autenticação (o `/api/health` já foi
      revertido pra não expor nada). ✅
- [ ] Testar cada endpoint **sem token** e **com token inválido** → deve dar 401.

### 1.5 Cabeçalhos de segurança
- [ ] Adicionar headers no `vercel.json`: `X-Content-Type-Options: nosniff`,
      `X-Frame-Options: DENY` (ou CSP `frame-ancestors`), `Referrer-Policy`,
      `Strict-Transport-Security`. (Eu configuro.)
- [ ] Revisar a **CSP** da landing e do app.

### 1.6 Dependências e código
- [ ] `npm audit` — resolver vulnerabilidades altas/críticas.
- [ ] Rodar a revisão de segurança automática (skill `/security-review` e/ou
      `/code-review ultra`) sobre o branch antes do lançamento.
- [ ] Manter dependências atualizadas (Dependabot no GitHub, opcional).

### 1.7 LGPD — base técnica (a base legal vem na Parte 4)
- [x] **Exportar dados** (usuário leva os dados dele). ✅
- [x] **Excluir conta + todos os dados** (direito ao esquecimento). ✅
- [ ] Mapear quais dados pessoais são coletados e por quê (e-mail, nome, CPF no Asaas).
- [ ] Confirmar que o CPF **não** é salvo no Sapien (vai direto ao Asaas). ✅

### 1.8 Monitoramento
- [ ] Ligar um monitor de erros — **Sentry** (plano free) ou, no mínimo, acompanhar os
      **logs da Vercel**. Assim você descobre problema antes do usuário reclamar.

### Como testar (plano de "pentest leve")
1. Dois usuários de teste → tentar acessar dados um do outro (RLS).
2. Baixar o bundle e caçar segredos (`grep`).
3. Bater nos `/api/*` sem token / com token de outro usuário.
4. Rodar `npm audit`, Supabase Advisor e a `/security-review`.
5. (Opcional) passar o site no **OWASP ZAP** (scanner gratuito) e no
   **Mozilla Observatory** (nota dos headers de segurança).

> ✅ **Entregável desta parte:** um checklist 100% verde + relatório curto do que foi
> testado. Só depois disso o produto está "pronto pra dinheiro real".

---

## PARTE 2 — Beta como Pessoa Física 🧪

- [ ] Rodar o **teste de cobrança real** no fim do seu trial (sair do sandbox do Asaas
      exige conta Asaas verificada — como PF já dá pra receber via Pix).
- [ ] **Beta fechado (5–10 pessoas):** amigos/leitores de confiança. Coletar feedback de
      bugs, usabilidade e disposição a pagar.
- [ ] Cobrar como PF é possível no Asaas, **mas** tem limites: a receita entra no seu
      **IR de pessoa física** (carnê-leão) e você **não emite nota fiscal de empresa**.
      Serve pra **validar**, não pra escalar. 👤 confirmar com contador o limite saudável.
- [ ] Critério pra virar PJ: **receita recorrente previsível** (ex.: dezenas de
      assinantes) ou faturamento se aproximando do limite confortável como PF.

---

## PARTE 3 — Constituir a Pessoa Jurídica (Sapien) 🏢

> Esta parte inteira é **conversa com contador** 👤. O que segue é o mapa pra você chegar
> na reunião sabendo o que perguntar — não é decisão fechada.

### 3.1 Primeiro passo: contratar um contador
No Brasil, abrir e manter empresa **exige contador** na prática (obrigações mensais).
Procure um contador (presencial ou online — Contabilizei, Agilize, MEI Fácil etc.) e leve
este documento. Custo típico: **R$ 100–400/mês**.

### 3.2 MEI provavelmente **não** serve pra SaaS
O MEI é barato, mas a lista de ocupações permitidas **não inclui desenvolvimento/
licenciamento de software**. Um SaaS quase sempre precisa ser **ME (Microempresa)** no
**Simples Nacional**. 👤 confirmar com o contador.

### 3.3 CNAE (atividade)
Para SaaS por assinatura, o CNAE clássico é:
- **6203-1/00** — Desenvolvimento e licenciamento de programas de computador **não-customizáveis** (é o de SaaS/produto).
- (Complementar) **6201-5/01** — desenvolvimento sob encomenda; **6209-1/00** — suporte/TI.

### 3.4 Regime: Simples Nacional
- Provável enquadramento inicial: **Simples Nacional**, **Anexo III ou V** de serviços.
- O que decide entre III (mais barato) e V é o **Fator R** (folha/pró-labore ≥ 28% do
  faturamento cai no Anexo III). 👤 o contador calcula a estratégia de pró-labore.
- Alíquota inicial: ordem de **~6% (Anexo III)** a **~15,5% (Anexo V)** do faturamento,
  crescendo por faixa. Tudo unificado num **DAS mensal**.

### 3.5 Obrigações mensais depois de aberta
- [ ] **Nota fiscal de serviço (NFS-e)** a cada cobrança — o município exige; dá pra
      **automatizar** integrando a emissão ao Asaas (ele tem esse recurso).
- [ ] **DAS mensal** (o imposto unificado do Simples).
- [ ] Declarações do contador (mensal/anual).
- [ ] **Conta bancária PJ** (separar 100% das finanças pessoais das da empresa).

### 3.6 Custos de ter a PJ (ordem de grandeza — confirme 👤)
| Item | Estimativa |
| ---- | ---------- |
| Abertura (junta comercial + registros) | R$ 0–600 (varia por estado; contadores online às vezes zeram) |
| Contador mensal | R$ 100–400/mês |
| Impostos (Simples) | % do faturamento (só paga se faturar) |
| Certificado digital (e-CNPJ) | ~R$ 150–250/ano |

### 3.7 Migrar a cobrança pra PJ
- [ ] Trocar a conta do Asaas de **PF para PJ** (recebimento no CNPJ).
- [ ] Ligar a **emissão automática de nota fiscal** no Asaas.
- [ ] Atualizar `ASAAS_API_KEY` (chave de produção da conta PJ) na Vercel.

---

## PARTE 4 — Lançamento público 🚀

- [ ] **Termos de Uso + Política de Privacidade** com os dados da **PJ** (razão social,
      CNPJ, endereço). Já temos os rascunhos (no zip) — eu ajusto o texto; 👤 um advogado
      dá o aval final, principalmente na LGPD.
- [ ] Definir o **Controlador de dados (LGPD)** = a empresa; canal de contato do titular.
- [ ] **E-mail de suporte** `suporte@sapienapp.com.br` (Hostinger) — setup de DNS.
- [ ] **Sair do sandbox do Asaas** → cobrança real ligada.
- [ ] Reverter/limpar qualquer coisa de teste (ex.: `?lockpremium`, contas de teste).
- [ ] Monitoramento de erros ativo (Parte 1.8).
- [ ] Abrir ao público. 🎉

---

## Ordem recomendada

1. **Segurança (Parte 1)** — agora, comigo. É o que trava o lançamento.
2. **Beta como PF (Parte 2)** — validar produto e cobrança.
3. **Contador + PJ (Parte 3)** — quando a validação vier.
4. **Lançamento público (Parte 4)** — com a PJ e os termos prontos.

## Quem faz o quê
- **Eu (Claude):** toda a Parte 1 técnica, headers, revisão de código/segurança, ajustes
  de termos, integrações (nota fiscal/Asaas), setup de DNS guiado.
- **Você:** decisões de negócio, contratar contador, abrir a PJ, testes de segurança do
  seu lado, beta.
- **Profissionais 👤:** contador (empresa/impostos), advogado (termos/LGPD — opcional mas
  recomendado).
