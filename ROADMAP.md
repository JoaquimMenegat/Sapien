# Sapien — Roadmap para SaaS de Assinatura

**Objetivo:** lançar o Sapien como um **serviço de assinatura mensal**, hospedado em
Vercel (frontend) + Supabase (banco/auth) + Resend (e-mails) + Asaas (pagamentos).

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
| 5 | Asaas (gateway) | **R$ 0** de mensalidade; cobra **taxa por transação**, só quando você recebe |
| 6 | Termos/Privacidade | R$ 0 (eu redijo o rascunho) |
| 6 | **E-mail de suporte** (Zoho Mail grátis) | **R$ 0** (até 5 caixas no seu domínio) |

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
| A | `sapienapp.com.br` | `76.76.21.21` |
| CNAME | `www.sapienapp.com.br` | `cname.vercel-dns.com` |
| TXT | `resend._domainkey` | chave pública DKIM do Resend |
| MX | `send` | `10 feedback-smtp.sa-east-1.amazonses.com` |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

> 🐛 **Correção crítica (2026-07-23) — IP da Vercel resetava conexões.** A Vercel recomendou
> a faixa **nova** (`216.198.79.1` no A; `ee09846…vercel-dns-017.com` no CNAME), mas ela era
> **resetada por muitas redes** (faculdade, datacenters, até a infra da Anthropic) — TCP conectava
> e o TLS levava RST; `ERR_CONNECTION_RESET`. O `.vercel.app` funcionava (outra rota), o que
> mascarava o problema, e o painel da Vercel mostrava "Valid Configuration". **Solução:** trocar
> pelos registros **legados** e estáveis — **A → `76.76.21.21`** e **CNAME www → `cname.vercel-dns.com`**
> (`cname.vercel-dns.com` resolve para `76.76.21.241`/`66.33.60.193`). **Confirmado** carregando de
> fora e pelo usuário no **4G**. O único bloqueio que sobrou é o **filtro da rede da universidade**
> (domínio novo / não categorizado) — é local, tende a sumir com o tempo e **não afeta usuários reais**.
> **Lição:** se um domínio novo da Vercel der reset em algumas redes, use os IPs legados.

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

## Fase 4 — Paridade do app web ⏳ (quase — IA adiada)
- [x] **[Eu]** Upload de capas e avatar via Supabase Storage (bucket `media`,
      `{user_id}/{covers|avatars}/`, leitura pública + escrita restrita à própria pasta).
      ⚠️ **falta [Você] rodar `supabase/storage.sql`** pra criar o bucket
- [x] **[Eu]** **Bug da busca de livros corrigido**: sem chave, o Google Books dá 429 e a
      busca falhava em silêncio. Agora usa Google + **Open Library** em paralelo (validado)
- [x] **[Eu]** **Login com Google** na web (Supabase OAuth) — provedor habilitado e
      confirmado (`"google":true`); botão aparece só quando o provedor está ligado
- [x] **[Eu]** Responsividade revisada (foco é desktop/web; correções de celular ficam de bônus)
- [ ] **[decisão]** IA "Achar um livro" — **adiada de propósito**: vira recurso **premium**
      na Fase 5 (evita bancar API da Anthropic de graça para estranhos)

## Fase 5 — Assinatura (Asaas) 💰

**Gateway: Asaas** (brasileiro, aceita **CPF**, faz **Pix/boleto/cartão**, tem sandbox + webhooks).
**Preço:** R$ 19,90/mês · R$ 149,90/ano (≈ R$ 12,49/mês). **Trial:** 7 dias de Premium grátis,
começando **no cadastro** (sem cartão). **IA "Achar um livro": descartada por ora.**

**Grátis vs Premium** (o que cada plano acessa):

| Recurso | Grátis | Premium |
| ------- | :----: | :-----: |
| Biblioteca / acervo (livros ilimitados) | ✅ | ✅ |
| Sessão (Pomodoro) + ritmo | ✅ | ✅ |
| Notas e trechos | ✅ | ✅ |
| Temas e cores personalizadas | ✅ | ✅ |
| Gêneros · Autores · Metas · Estatísticas | 🔒 | ✅ |
| Exportar dados (**recurso novo, a construir**) | 🔒 | ✅ |

- [x] **[Eu]** Tabela `subscriptions` + RLS (`supabase/subscriptions.sql`) — usuário só LÊ o
      próprio status; escrita só via service_role (webhook). Trigger dá 7 dias de trial no cadastro.
- [x] **[Você]** Rodar `supabase/subscriptions.sql` no SQL Editor
- [x] **[Você]** Criar conta no Asaas + pegar chave de **sandbox** (secret na Vercel)
- [x] **[Você]** Webhook do Asaas configurado e **Ativado** (`/api/asaas-webhook` + token)
- [x] **[Eu]** Plumbing de estado: `billing.status()` + `isPremium` no app (web lê a tabela;
      desktop = sempre Premium, pois é o app pessoal)
- [x] **[Eu]** Backend (funções de servidor `/api/*`): criar assinatura no Asaas +
      receber webhooks + cancelar + detalhes/histórico. CPF/CNPJ coletado (o Asaas exige).
- [x] **[Eu]** Tela **"Assinar Premium"** (Pix/boleto/cartão via Asaas)
- [x] **[Eu]** Área **"Gerenciar assinatura"**: plano, status, renovação/fim do trial,
      valor, forma de pagamento, adesão, tempo restante, **cancelar** e **histórico de pagamentos**
- [x] **[Eu]** Construir o **Exportar dados** (JSON completo + CSV do acervo) — recurso Premium
      (em Personalização, gated pelo paywall)
- [x] **[Eu]** **Gating** das áreas pagas com **prévia borrada** + paywall (Gêneros, Autores,
      Metas, Estatísticas, Exportar). Livre durante o trial; teste do bloqueio via `?lockpremium=1`.
- [x] **[Eu]** Reverter o `/api/health` (não expõe mais presença das env vars)
- [ ] **[Você]** Testar cobrança no sandbox — **decidido: fazer no fim do trial, no fluxo real**

## Fase 6 — Lançamento
- [ ] **[Você/Eu]** **E-mail de suporte** `suporte@sapienapp.com.br` — decisão: **Zoho Mail
      plano grátis** (R$ 0, até 5 caixas, webmail + app; sem IMAP no grátis). Setup = verificar
      domínio (TXT) + registros MX no Registro.br. Convive com o Resend (ele usa o `send.`,
      o suporte usa o domínio raiz). Eu guio o DNS.
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
