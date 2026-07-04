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
- [ ] **Fase 1 — Biblioteca.** Cadastro via Google Books, 5 status, visualizações
  grade/lista/tabela, abas por status.
- [ ] **Fase 2 — Leitura ativa.** Progresso página/%, quanto falta em páginas e tempo.
- [ ] **Fase 3 — Pomodoro + sessões.**
- [ ] **Fase 4 — Metas, cronograma, estatísticas.**
- [ ] **Fase 5 — Notas e trechos.**
- [ ] **Fase 6 — Acabamento e empacotamento.**
