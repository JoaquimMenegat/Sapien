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
- **Sistema de temas por CSS variables.** As cores são tokens semânticos (`bg-canvas`,
  `text-ink`, `bg-accent`...) que leem CSS variables. Cada "aparência" só redefine as
  variáveis: `literary-light`, `literary-dark` (papel quente, estética Claude) e
  `moderndark` (estética "Linear": quase-preto + índigo, com iluminação ambiente). O
  usuário troca ao vivo pelo `AppearancePicker`. Preferência persistida em settings.
- **Login local por e-mail (offline).** Uma conta por instalação, guardada na tabela
  `settings` (`account.email/name/hash`). Senha nunca em texto: hash com **scrypt**
  (crypto nativo do Node, sem dependência). Sessão vive em memória no main — reabrir o
  app exige login. Sem nuvem; sync entre dispositivos ficaria para uma fase futura com
  backend. Ver `src/main/db/account.ts`.

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
  5 status, visualizações grade/lista/tabela, abas por status com contadores.
  **Registro editável**: busca mostra múltiplos resultados/edições; ao escolher (ou
  "adicionar manualmente"), cai num formulário onde todo campo é editável. Detalhe do
  livro permite editar/mudar status/excluir.
  - **Busca com fallback:** tenta Google Books (timeout 5s) e cai na **Open Library**
    (`bookSearch.ts`) — resolve o 429/limite por IP do Google sem depender de chave.
  - **Capa local:** botão "Escolher capa" copia a imagem para `userData/covers` e serve
    via protocolo `readdeck-cover://` (`covers.ts`).
  - **Mover de prateleira rápido:** `StatusPicker` (chips) no detalhe do livro salva o
    status na hora (e seta início/conclusão ao ir p/ Lendo/Lido).
- [ ] **Fase 2 — Leitura ativa.** Progresso página/%, quanto falta em páginas e tempo.
- [ ] **Fase 3 — Pomodoro + sessões.**
- [ ] **Fase 4 — Metas, cronograma, estatísticas.** Gráficos **vivos e coloridos**
  (donuts, barras empilhadas, linha+barra) — referência visual nas telas de dashboard
  enviadas pelo usuário. Base continua limpa (Notion); os dados é que ganham cor.
- [ ] **Fase 5 — Notas e trechos.**
- [ ] **Fase 6 — Acabamento e empacotamento.**

### Requisitos adicionais (feedback do usuário)

- [ ] **Personalização avançada.** Expandir o sistema de temas: escolher **cor de
  acento** (paletas vivas), **estilo de animação** (ex.: sem/sutil/rico, respeitando
  `prefers-reduced-motion`) e **estilo dos gráficos**. Vira um painel de Configurações.
- [ ] **Busca com IA.** Seção de descoberta onde o usuário faz perguntas em linguagem
  natural: recomendações ("ideias de distopia + avaliações do mercado") e sínteses
  ("o que 1984 fala em síntese"). **Feature online** (a primeira do app) — requer chave
  de API de um provedor de IA. Preferência: **Claude API (Anthropic)**; consultar a
  skill `claude-api` na implementação. Chave guardada localmente em settings.
