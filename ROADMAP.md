# Sapien — Roadmap para SaaS de Assinatura

**Objetivo:** lançar o Sapien como um **serviço de assinatura mensal**, hospedado em
Vercel (frontend) + Supabase (banco/auth) + Resend (e-mails) + Stripe (pagamentos).

**Legenda de execução:**
- **[Você]** = cliques em painéis que só você pode fazer (eu te guio passo a passo)
- **[Eu]** = código/configuração que eu faço
- **[Juntos]** = eu faço e você testa

---

## 💰 Custos (resumo)

| Fase | Item | Custo |
| ---- | ---- | ----- |
| 1 | **Domínio próprio** | **~R$ 40–110/ano** (único gasto obrigatório antes do Stripe) |
| 2–4 | Supabase / Vercel / Resend | **R$ 0** — planos grátis dão conta do lançamento |
| 5 | Stripe | **R$ 0** de mensalidade; cobra **~% por transação**, só quando você recebe |
| 6 | Termos/Privacidade | R$ 0 (eu redijo o rascunho) |

Detalhe do domínio (Fase 1):
- `.com.br` no **Registro.br** → **~R$ 40/ano** (mais barato, ideal p/ produto BR)
- `.com` (Cloudflare/Namecheap) → ~R$ 50–80/ano
- `.app` (cara mais "tech", exige HTTPS — que a Vercel já dá) → ~R$ 80–110/ano
- Vercel domínio custom, verificação no Resend, DNS e SSL: **R$ 0**

---

## Fase 0 — Destravar o site ✅ CONCLUÍDA (2026-07-21)

- [x] Variáveis de ambiente corrigidas na Vercel
- [x] Redeploy sem build cache
- [x] "Vercel Authentication" desligado (site público)
- [x] Site público + chave do Supabase funcionando (verificado ao vivo)
- [x] **RLS provada**: com a chave pública e sem login, leitura volta vazia e insert é
      bloqueado (`new row violates row-level security policy`)

**URL atual:** `https://sapien-git-main-joaquimmenegat-2410s-projects.vercel.app`

## Fase 1 — Domínio próprio ✅ CONCLUÍDA (2026-07-23)

**Domínio: `sapienapp.com.br`** — Registro.br, R$ 40/ano, expira 22/07/2027.
**Site no ar:** https://sapienapp.com.br (apex faz 308 → `www.sapienapp.com.br`), HTTPS OK.
**Resend:** domínio **Verified** (região São Paulo / `sa-east-1`) — acabou a limitação do
modo teste; agora envia e-mail para **qualquer destinatário**.

- [x] **[Você]** Registrar o domínio → `sapienapp.com.br`
- [x] **[Você]** Conectar na Vercel + DNS no Registro.br → **Valid Configuration**
- [x] **[Você]** Verificar o domínio no Resend (DKIM + SPF + DMARC)

DNS no Registro.br (modo avançado — **não aceita `@`**; no formulário digita-se só o
prefixo, que ele completa com `.sapienapp.com.br`):

| Tipo | Nome | Dados |
| ---- | ---- | ----- |
| A | `sapienapp.com.br` | `216.198.79.1` |
| CNAME | `www.sapienapp.com.br` | `ee09846eed954f80.vercel-dns-017.com` |
| TXT | `resend._domainkey` | chave pública DKIM do Resend |
| MX | `send` | `10 feedback-smtp.sa-east-1.amazonses.com` |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

> ⚠️ **Aprendizados do Registro.br:** (1) ele desloga durante a edição e **descarta** o save —
> se pedir login ao salvar, refaça tudo; (2) a publicação nos servidores autoritativos leva
> alguns minutos depois de salvar (o painel mostra antes do DNS responder).

> Sem domínio, o Resend só entrega e-mail pra você mesmo — nenhum usuário real confirma
> cadastro. O domínio destrava e-mail, marca e Stripe de uma vez.

## Fase 2 — Autenticação nível produção ✅ CONCLUÍDA (2026-07-23)

- [x] **[Você]** SMTP do Resend no Supabase + remetente **`no-reply@sapienapp.com.br`**
- [x] **[Você]** Site URL / Redirect URLs apontando para `https://sapienapp.com.br`
- [x] **[Juntos]** **Teste ponta a ponta OK** (2026-07-23): cadastro → e-mail do Sapien
      chega → "Confirmar e-mail" → cai no site **já logado** ✅
- [x] **[Você]** Templates de e-mail com a marca Sapien colados no Supabase (confirmação
      de cadastro + redefinição de senha) — fontes em `supabase/emails/`
- [x] **[Eu]** Fluxo **"Esqueci minha senha"**: link no login → tela de pedir o e-mail →
      e-mail do Sapien → tela "Criar nova senha" → entra logado.
      **Testado em produção e funcionando** ✅ (2026-07-23)
- [x] **[Eu]** **CAPTCHA (Cloudflare Turnstile)** no cadastro/login/reset — o widget só
      aparece quando `VITE_TURNSTILE_SITE_KEY` existe, então o código é seguro de publicar
      antes de ligar no Supabase. Site key na Vercel (widget "Sapien", 2 hostnames).
      *Correção necessária: a CSP herdada do Electron (`script-src 'self'`) bloqueava o
      script do Turnstile — liberado `challenges.cloudflare.com` em `script-src`/`frame-src`.*
- [x] **[Você]** CAPTCHA ligado no Supabase (Attack Protection + secret key do Turnstile).
      **Validado em produção:** login com o token responde `invalid_credentials` (ou seja,
      o captcha foi *aceito* e só então as credenciais foram checadas) ✅
- [x] **[Você]** Senha mínima de 8 caracteres
      *(⚠️ "prevent use of leaked passwords" (HaveIBeenPwned) **exige plano Pro** do
      Supabase — indisponível no Free. Fica como melhoria se um dia assinar o Pro.)*
- [x] **[Você]** Usuários de teste apagados

## Fase 3 — Site completo: landing + app
- [ ] **[Você]** Fornecer o HTML da landing (do chatgpt.site) OU decidir usar a do repo
- [ ] **[Eu]** Landing na raiz do domínio + app em rota própria + CTA "Criar conta grátis"
- [ ] **[Eu]** SEO básico (título, descrição, preview em redes/WhatsApp)

## Fase 4 — Paridade do app web
- [ ] **[Eu]** Upload de capas e avatar via Supabase Storage (hoje são stubs na web)
- [ ] **[Eu]** IA "Achar um livro" via Edge Function *(decidir: incluir no v1?)*
- [ ] **[Eu]** Revisão de responsividade (telas menores)
- [ ] **[Juntos]** Teste geral das 9 seções na web

## Fase 5 — Assinatura (Stripe) 💰
- [ ] **[Você]** Definir modelo: preço mensal, plano grátis?, trial?, o que é pago?
- [ ] **[Você]** Criar conta no Stripe (CPF/CNPJ + conta bancária)
- [ ] **[Eu]** Tabela `subscriptions` + webhook do Stripe (Edge Function) mantendo o status
- [ ] **[Eu]** Checkout + portal do cliente (trocar cartão, cancelar)
- [ ] **[Eu]** Gating: recursos pagos só para assinantes ativos
- [ ] **[Juntos]** Testar no modo teste do Stripe antes da cobrança real

## Fase 6 — Lançamento
- [ ] **[Eu]** Rascunho de Termos de Uso + Política de Privacidade (LGPD)
- [ ] **[Eu]** Checklist final de segurança + monitoramento de erros
- [ ] **[Você]** Beta fechado (5–10 pessoas)
- [ ] **[Juntos]** Corrigir o que o beta revelar → abrir ao público 🚀

---

## 🔑 Decisões que só você pode tomar

| Decisão | Quando | Custo |
| ------- | ------ | ----- |
| Nome/registro do domínio | Fase 1 (bloqueia tudo) | ~R$ 40–110/ano |
| Qual landing (chatgpt.site ou repo) | Fase 3 | — |
| Preço e o que é grátis vs. pago | Fase 5 | — |
| IA no v1? (custo de API por uso) | Fase 4 | variável |
