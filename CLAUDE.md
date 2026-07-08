# ReadDeck — Notas de Desenvolvimento

Gerenciador de leituras desktop (Windows/macOS/Linux). Especificação completa em
[`ReadDeck.txt`](./ReadDeck.txt). Inspirado na estante do Notion do usuário, mas com
preenchimento automático (Google Books) e foco em UI fluida estilo Notion.

## Stack

| Camada        | Tecnologia                                   |
| ------------- | -------------------------------------------- |
| Shell desktop | Electron 33                                  |
| Build         | electron-vite (Vite 5)                        |
| UI            | React 18 + TypeScript                         |
| Estilo        | Tailwind CSS 3 (`darkMode: 'class'`)          |
| Estado        | Zustand                                       |
| Banco         | **sql.js** (SQLite em WebAssembly)            |
| Ícones        | lucide-react                                  |
| Empacotamento | electron-builder (fases posteriores)          |

## Decisões de projeto

- **sql.js em vez de better-sqlite3.** A máquina de desenvolvimento não tem ferramentas
  de build C++ (Visual Studio), então módulos nativos não compilam. sql.js é WASM puro:
  zero compilação, mesmo binário em todos os SOs. O banco vive em memória e é serializado
  para `userData/readdeck.db` após escritas (debounced 400ms) e no `before-quit`.
- **Isolamento de processos.** O renderer nunca acessa Node/banco diretamente. Toda
  operação passa por IPC (`src/main/ipc.ts`) e é exposta ao renderer via `contextBridge`
  no preload (`window.readdeck.*`). `contextIsolation: true`, `nodeIntegration: false`.
- **Tipos compartilhados** ficam em `src/shared/types.ts` — fonte única de verdade do
  modelo de dados, importada por main, preload e renderer.
- **Design "Executivo Indigo" (padrão atual).** Reskin completo a partir de um handoff de
  design (grafite escuro `#15171C` + gradientes indigo→violeta `#4F46E5→#7C3AED`, sombras
  coloridas, orbes de luz ambiente e muita micro-animação). Tokens/gradientes/keyframes vivem
  em `assets/main.css`; utilitários: `.card`/`.lift`, `.btn-primary`(+`.pulse`), `.field`,
  `.nav-pill`, `.chip`, `.grad-text`, e keyframes `fadeUp/growBar/ringDraw/floatY/barRise/`
  `pulseGlow/blobA/blobB`.
- **Tipografia (revertida a pedido do usuário).** Corpo/UI na **fonte do sistema** (stack
  `Inter→Segoe UI`, como antes do redesign) e **títulos na serifada Lora** (`font-serif` no
  título de seção do `App` e no `Modal`). A Plus Jakarta Sans do redesign foi revertida — os
  woff2 dela seguem em `assets/fonts`, sem uso.
- **Marca "Sapien".** SVG em `components/Logo.tsx` (`LogoMark`/`LogoLockup`) na **forma "COR"**
  do manual (quadrado arredondado + arcadas brancas + sorrisos por cima), em **roxo**: o
  quadrado e os sorrisos usam o gradiente indigo→violeta (`#4F46E5→#7C3AED`).
- **Navegação por topbar** (`components/Topbar.tsx`, substituiu a sidebar): logo + seções em
  pílulas (sem "Achar"/"Lendo", removidas a pedido — o código das seções segue no `App`) +
  busca + "Adicionar livro" (pulsante, abre o modal via `app.addBookOpen`) + menu de perfil
  (Personalização/Sair). `App` centraliza o conteúdo em `max-w-1180`. Os **modais** usam
  portal p/ o `document.body` (senão o `backdrop-filter` da topbar recorta o `position:fixed`).
- **Sistema de temas por CSS variables.** As cores são tokens semânticos (`bg-canvas`,
  `text-ink`, `bg-accent`...) que leem CSS variables. Aparências redefinem as variáveis:
  `executivo` (padrão), `literary-light`/`literary-dark` e `moderndark` (aponta p/ o mesmo
  sistema Indigo). Trocável no painel Personalização (`SettingsModal`, lê `APPEARANCES`).
  Preferência persistida em settings.
- **Login local por e-mail (offline).** Uma conta por instalação, guardada na tabela
  `settings` (`account.email/name/hash/picture/provider`). Senha nunca em texto: hash com
  **scrypt** (crypto nativo do Node, sem dependência). Sessão vive em memória no main; por
  padrão reabrir o app exige login, mas a opção **"Manter conectado"** (checkbox na tela de
  login, passada a `login/signup/googleSignIn`) grava `session.remember=true` em settings e
  o `registerIpcHandlers` restaura `loggedIn` na abertura. Logout limpa o flag. A **tela de
  login é sempre escura** (o `App` aplica `loginAppearance()` enquanto deslogado) e **não tem
  seletor de aparência**. Ver `src/main/db/account.ts`. Também há **"Entrar com Google"**
  (OAuth desktop loopback+PKCE, `src/main/googleAuth.ts`) — feature online que usa as
  credenciais do próprio usuário (Client ID/Secret em settings) e cria conta sem senha; e
  **perfil** editável (foto local/Google + nome) no painel Personalização.
- **Nome do produto: "Sapien"** (era ReadDeck). `productName` = Sapien; `name` interno e a
  ponte `window.readdeck` continuam `readdeck`. **userData fixado** em `%APPDATA%\Sapien`
  via `app.setPath` no `main/index.ts` (productName mudava o `app.getName()` e movia a
  pasta — o pin garante que renomear nunca mais perca os dados). Repo/pasta ainda `ReadDeck`.

## Estrutura

```
src/
├─ main/            # processo principal (Node)
│  ├─ index.ts      # cria janela, inicializa banco, registra IPC
│  ├─ ipc.ts        # handlers IPC (app:health, settings:get/set)
│  └─ db/
│     ├─ index.ts   # camada sql.js: run/all/get/insert + persistência
│     ├─ schema.ts  # DDL das tabelas
│     └─ settings.ts# helpers de chave/valor (tema, ritmo, pomodoro)
├─ preload/
│  ├─ index.ts      # expõe window.readdeck via contextBridge
│  └─ index.d.ts
├─ renderer/        # app React
│  ├─ index.html
│  └─ src/
│     ├─ main.tsx, App.tsx
│     ├─ components/ (Sidebar, ThemeToggle)
│     ├─ store/app.ts (Zustand: navegação + tema)
│     └─ assets/main.css
└─ shared/types.ts  # modelo de dados compartilhado
```

## Modelo de dados (SQLite)

- **books** — acervo. status: `wishlist` → `fila` → `lendo` → `pausado` → `lido`.
  Progresso via `current_page`/`total_pages`. Metadados do Google Books.
- **reading_sessions** — sessões (do Pomodoro): páginas lidas + duração → alimentam
  progresso e ritmo (págs/hora).
- **goals** — metas de leitura (livros/mês, páginas/dia, etc.).
- **notes** — notas e trechos por livro (`nota` | `trecho` | `callout`).
- **settings** — chave/valor de preferências.

## Comandos

```bash
npm install      # instala dependências (sem compilação nativa)
npm run dev      # roda o app em modo desenvolvimento (HMR)
npm run build    # compila main + preload + renderer para out/
npm run dist:win # gera instalador Windows (electron-builder)
```

## Progresso por fase

- [x] **Fase 0 — Fundação.** Electron + React + Tailwind + sql.js rodando; janela abre,
  banco conecta e persiste, sidebar navegável e tema claro/escuro persistido.
- [x] **Extra (a pedido do usuário).** Sistema de temas com seletor ao vivo
  (Literary claro/escuro + Modern Dark) e **login por e-mail** local/offline (scrypt),
  com tela de login/cadastro e gating do app.
- [x] **Fase 1 — Biblioteca.** Cadastro via Google Books (busca no main process),
  6 status (wishlist/fila/lendo/pausado/lido/**abandonado**), visualizações
  grade/lista/tabela, abas por status com contadores. Progresso no card e no detalhe
  mostra **barra + % + páginas lidas/total** (ReadingProgress).
  **Registro editável**: busca mostra múltiplos resultados/edições; ao escolher (ou
  "adicionar manualmente"), cai num formulário onde todo campo é editável. Detalhe do
  livro permite editar/mudar status/excluir.
  - **Busca combinada:** consulta Google Books (timeout 5s) **e** Open Library em
    paralelo (`bookSearch.ts`), junta, dedup por ISBN e ordena priorizando edições em
    português e com dados completos (capa/páginas/sinopse). Mais edições p/ escolher e
    resiliente ao 429 do Google. Amazon não tem API pública gratuita (só PA-API com
    conta de afiliado) — fica como opção futura.
  - **Capa local:** botão "Escolher capa" copia a imagem para `userData/covers` e serve
    via protocolo `readdeck-cover://` (`covers.ts`).
  - **Mover de prateleira rápido:** `StatusPicker` (chips) no detalhe do livro salva o
    status na hora (e seta início/conclusão ao ir p/ Lendo/Lido).
- [x] **Fase 2 — Leitura ativa.** Seção "Lendo agora" (`ReadingView.tsx`): livros em
  leitura com barra + %/páginas, **quanto falta** em páginas e **tempo estimado** pelo
  ritmo (pág/h, editável, salvo em `reading.pace`). Atualização rápida da página atual e
  botão "Concluir" ao chegar no total. Ritmo vira medido automaticamente na Fase 3.
- [x] **Fase 3 — Pomodoro + sessões.** `PomodoroView`: timer circular configurável
  (foco/pausa, salvos em settings), seletor de livro, e ao encerrar o foco abre o
  registro (livro + páginas lidas + duração). A sessão (`reading_sessions`) **avança o
  progresso do livro** e alimenta o **ritmo medido** (pág/h) — que a "Lendo agora" passa a
  usar no lugar do manual. Cartões de hoje (sessões/páginas/minutos/ritmo) + sessões
  recentes. `src/main/db/sessions.ts`.
- [x] **Fase 4 — Estatísticas e Metas.**
  - **Estatísticas:** `StatsView` com **Recharts** — cartões de métrica coloridos
    (acervo, lidos, páginas lidas, nota média), barras "livros lidos por mês" (12 meses)
    e donuts **por status** e **por formato**, com legenda. As cores dos gráficos são
    lidas das CSS variables do tema (`useThemeColors`), então adaptam a cada aparência.
    Referência visual: dashboards enviados pelo usuário — base limpa, dados coloridos.
  - **Evolução (sessões):** bloco "Sua evolução (últimos 14 dias)" — cartões de ritmo
    médio/sessões/páginas/minutos + **área de páginas/dia** e barras de **minutos/dia** e
    **sessões/dia** (série diária das sessões, `sessions:daily` com CTE recursiva). Deixa
    o usuário comparar os dias e ver o progresso.
  - **Metas:** `MetasView` (reformada no estilo do handoff) — **anel anual grande**
    (lidos/meta + texto de ritmo), card **"Sequência de leitura"** (14 quadrados/dia com ✓,
    hoje destacado, streak) e **"Metas do mês"** (livros/mês, páginas/dia, minutos/dia com
    barras), mantendo o formulário de **registrar meta** (upsert por tipo). Progresso real de
    livros lidos + sessões. `src/main/db/goals.ts`.
  - **Cronograma** de leituras (planejar períodos) fica como melhoria futura opcional.
- [x] **Fase 5 — Notas e trechos.** `NotasView`: por livro, registra **nota**, **trecho**
  (citação, serifada em itálico com aspas) e **callout/destaque** (caixa âmbar), com
  página opcional. Editar/excluir inline. `src/main/db/notes.ts`.
- [ ] **Fase 6 — Acabamento e empacotamento.**

### Requisitos adicionais (feedback do usuário)

- [x] **Personalização avançada.** Painel "Personalização" (`SettingsModal`, aberto pelo
  rodapé da sidebar): escolher **aparência**, **cor de acento** (10 paletas vivas +
  "padrão do tema" — sobrescreve `--c-accent`/`--c-accent-hover` inline no `<html>`) e
  **estilo de animação** (sutil/rico/nenhuma, respeitando `prefers-reduced-motion`).
  Persistido em settings (`ui.accent`/`ui.animation`). Estilo dos gráficos fica como
  melhoria futura opcional.
- [x] **Agente "Achar um livro" (IA).** Seção na sidebar com chat que fala SÓ de livros
  (recomendações por gênero, sínteses, avaliações). Usa a **Claude API** via SDK oficial
  `@anthropic-ai/sdk` no processo main (`src/main/ai.ts`). Modelo padrão `claude-opus-4-8`,
  selecionável (Opus 4.8 / Sonnet 5 / Haiku 4.5). Chave e modelo guardados em settings
  (`ai.apiKey` / `ai.model`) — **feature online**, o usuário paga pelo uso. System prompt
  restringe ao tema de livros.
- [x] **Gêneros: seletor + criar próprios.** `GenrePicker` com ~30 gêneros sugeridos +
  criação livre; substitui o campo de texto. **Campo de sinopse removido** do formulário
  (a IA cobre "do que trata").
- [x] **Seção "Gêneros" (dashboard).** Item na sidebar com visualização estilo dashboard
  (ref. do usuário): por gênero, quantos livros — barras coloridas vivas + %, cartões de
  métrica coloridos, toggle Lidos/Todos. Agregação client-side a partir de `useBooks`
  (`GenresView.tsx`). Prévia do que a Fase 4 (Estatísticas) vai expandir.
- [x] **Seção "Autores" (dashboard + drill-down).** Item na sidebar (ícone Users, depois de
  Gêneros): por autor, quantos livros — barras coloridas + %, cartões de métrica, toggle
  Lidos/Todos, igual a Gêneros. **Clicar num autor** abre a grade só dos livros dele (com
  "← Todos os autores" para voltar) e clicar num livro abre o `BookDetailModal`. Autores
  com múltiplos nomes são separados por vírgula (`authorsOf`). Agregação client-side a
  partir de `useBooks` (`components/authors/AutoresView.tsx`).
- [x] **Autocomplete de autor/editora.** No formulário de registro (`BookForm`), os campos
  **autor** e **editora** sugerem valores já cadastrados via `<datalist>` nativo
  (`#dl-authors`/`#dl-publishers`), montados dos livros existentes (distinct, ordenado).
  Digitar "Peng" sugere "Penguin".
- [x] **Lidos por ano e mês.** Na aba **Lido** da Biblioteca aparece um seletor de período
  (chips): **Ano** (anos com livros concluídos, ex. 2026/2025/2024) e, ao escolher um ano,
  **Mês** (só os meses daquele ano com leituras). Filtra pela `finished_at`. Deixa o
  usuário separar "lidos em 2026", "lidos em março", etc. ao longo dos anos (`LibraryView`).
- [x] **Registro de sessão em horas + minutos.** No modal de registro do Pomodoro, a duração
  agora tem campos separados de **Horas** e **Minutos** (antes só minutos) — combinados em
  `duration_min` ao salvar. Útil para registrar manualmente sessões longas (`PomodoroView`).
- [x] **Pomodoro só mostra livros "lendo".** Os seletores de livro (timer e registro) usam
  `readingBooks = books.filter(status==='lendo')`, evitando poluir com o acervo inteiro.
- [x] **"Manter conectado" no login.** Checkbox (padrão marcado) que persiste a sessão
  (`session.remember`) — ver a decisão de projeto sobre login. Sem seletor de aparência na
  tela de entrada, que é sempre escura.
- [x] **Navegação mais fluída.** Animação de entrada suave ao trocar de seção (`.view-enter`,
  keyed por `section` em `App`) e nos modais (`.modal-in`/`.overlay-in` no `Modal`),
  com curva ease-out. Respeita `data-anim='nenhuma'` e `prefers-reduced-motion`.
- [x] **Redesign "Executivo Indigo" + rebrand** (ver Decisões de projeto). Reskin completo a
  partir de handoff do usuário, mantendo toda a funcionalidade. A **Biblioteca virou
  dashboard**: 4 KPIs (lidos/ano, páginas/mês, ritmo, sequência — dados reais de
  books+sessions+goals, com mini-barras), hero **"Lendo agora"** (gradiente navy→violeta,
  capa flutuante, progresso, tempo restante, "Iniciar sessão"→Sessão) e **anel de meta
  anual** (→Metas), acima da estante (chips de status + grade/lista/tabela + lidos por
  ano/mês). Nova logo SVG, topbar e Plus Jakarta Sans. `LibraryView.tsx`.
- [x] **Tempo mínimo de sessão.** Configuração em Personalização (`reading.minSessionMin`):
  sessões mais curtas que o mínimo não contam para a **sequência** nem para as **estatísticas
  do dia** (filtro `duration_min >= min` em `todayStats`/`sessionsDaily`). 0 = conta todas.
- [x] **Modais via portal.** `Modal` renderiza no `document.body` (`createPortal`) — evita que
  a topbar (com `backdrop-filter`) vire bloco de contenção e "clipe" o `position:fixed`.
