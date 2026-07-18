# Sapien — do desktop ao SaaS (Vercel + Supabase)

Plano de conversão do app Electron para um site (SaaS multiusuário), reaproveitando
ao máximo a UI React atual.

## Arquitetura

```
  Navegador
     │
     ▼
  Sapien Web  (o mesmo React/Vite de hoje, publicado como SPA na Vercel)
     │  (troca window.readdeck.*  ➜  client do Supabase)
     ▼
  Supabase   ──  Auth (e-mail/senha, Google)
             ──  Postgres (dados por usuário, protegidos por RLS)
             ──  Storage (capas de livro)
```

**Ideia-chave:** o app já roteia TODO acesso a dados por uma única ponte
(`window.readdeck.*`, hoje via IPC do Electron). No web, essa ponte é
reimplementada com o Supabase — então stores, telas e design vêm quase de graça.

## O que muda vs. reaproveita

| Camada | Hoje (desktop) | No SaaS |
| --- | --- | --- |
| UI / design / stores | React + Zustand | **Reaproveita 100%** |
| Ponte de dados | `window.readdeck` via IPC | Reimplementada com Supabase |
| Banco | sql.js local | Supabase Postgres (RLS por usuário) |
| Login | scrypt local (1 conta) | Supabase Auth (multiusuário) |
| Capas locais | protocolo `readdeck-cover://` | Supabase Storage |
| Busca (Google/OpenLibrary) | processo main | client (CORS) ou Edge Function |
| IA "Achar um livro" | chave do usuário no main | Edge Function (chave no servidor) |

## Setup (o que VOCÊ faz uma vez)

1. Crie um projeto no [supabase.com](https://supabase.com) (plano grátis serve).
2. **SQL Editor → New query** → cole e rode o `supabase/schema.sql` (cria as tabelas + RLS).
3. **Authentication → Providers**: deixe "Email" ligado (Google a gente ativa depois).
4. **Project Settings → API**: copie a `Project URL` e a `anon public key`.
5. Crie um `.env.local` na raiz a partir do `.env.example` e cole os dois valores.
   (A `anon key` é pública/segura para o front; a `service_role` NÃO vai pro front.)
6. Storage: crie um bucket **`covers`** (público) para as capas — faremos depois.

Me mande a **Project URL** e a **anon key** (são públicas) que eu ligo o app nelas.

## Roadmap (o que EU construo, incremental)

- [x] **Fase 0 — Banco.** `supabase/schema.sql` (tabelas + RLS + triggers) e `.env.example`.
- [ ] **Fase 1 — Ponte Supabase.** Client (`@supabase/supabase-js`) + reimplementar a
      API (`books/sessions/goals/notes/settings`) com a mesma "cara" de `window.readdeck`.
- [ ] **Fase 2 — Login.** Trocar a tela de login para Supabase Auth (e-mail/senha; "manter
      conectado" vira sessão persistente). Perfil (nome/foto) na tabela `profiles`.
- [ ] **Fase 3 — Build web.** Config Vite standalone (sem Electron) + rota única SPA.
- [ ] **Fase 4 — Deploy.** Vercel (build do SPA) apontando pro Supabase; domínio.
- [ ] **Fase 5 — Extras.** Capas no Storage; busca/IA em Edge Functions.
- [ ] **Fase 6 — Assinatura.** Stripe (checkout + webhook marcando `is_pro` no perfil) e
      "portão" de acesso — sobre esta base.

O app **desktop continua funcionando** — o código web fica em paralelo (mesma UI).
