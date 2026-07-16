import type { Book, DailyStat, Goal } from '../../../shared/types'

export interface Msg {
  key: string
  text: string
}

export interface Encouragements {
  // Prioridade de exibição: evolução (mostra progresso) > estado (fato atual) > perene.
  evolution: Msg[]
  state: Msg[]
  evergreen: Msg[]
  gentle: Msg[]
  lowActivity: boolean
}

// Frases gentis (sem culpa) — usadas quando não houve leitura na semana.
const GENTLE: Msg[] = [
  { key: 'g-pausa', text: 'Uma pausa faz parte. Retome no seu ritmo.' },
  { key: 'g-pequenas', text: 'Pequenas leituras também contam.' },
  { key: 'g-recomeco', text: 'Seu progresso continua. Hoje pode ser um novo começo.' },
  { key: 'g-cinco', text: 'Sem culpa: cinco minutos de leitura já valem.' },
  { key: 'g-espera', text: 'O livro espera por você — no seu tempo.' },
  { key: 'g-devagar', text: 'Devagar também é avançar.' }
]

// Frases perenes (só entram se não houver nada guiado pelos dados).
const EVERGREEN: Msg[] = [
  { key: 'e-pouco', text: 'Ler um pouco todo dia vira muito ao longo do tempo.' },
  { key: 'e-conta', text: 'Cada página conta — e você virou várias.' },
  { key: 'e-futuro', text: 'Seu eu do futuro agradece cada página de hoje.' },
  { key: 'e-habito', text: 'Constância vence intensidade. Um capítulo de cada vez.' },
  { key: 'e-mundo', text: 'A cada livro, um mundo a mais dentro de você.' }
]

export interface EncInput {
  lidosAno: number
  annualGoal: number
  livrosMonth: number
  livrosLastMonth: number
  bestMonthByBooks: boolean
  totalPagesRead: number
  pagesThisMonth: number
  pagesLastMonth: number
  paceAccelerating: boolean
  streak: number
  readToday: boolean
  activeDaysLast7: number
  pace: number | null
  year: number
}

export function computeEncouragements(i: EncInput): Encouragements {
  const evolution: Msg[] = []
  const state: Msg[] = []

  // ── Evolução (comparações que mostram progresso) ──
  if (i.livrosMonth > i.livrosLastMonth && i.livrosMonth >= 1) {
    evolution.push({ key: 'books-up', text: 'Você leu mais livros este mês do que no mês passado. 📈' })
  }
  if (i.pagesLastMonth > 0 && i.pagesThisMonth > i.pagesLastMonth) {
    const pct = Math.round(((i.pagesThisMonth - i.pagesLastMonth) / i.pagesLastMonth) * 100)
    if (pct >= 5) evolution.push({ key: 'pages-up', text: `Você está lendo ${pct}% mais páginas do que no mês passado.` })
  }
  if (i.bestMonthByBooks && i.livrosMonth >= 1) {
    evolution.push({ key: 'best-month', text: 'Este é o seu melhor mês de leitura até agora.' })
  }
  if (i.paceAccelerating) {
    evolution.push({ key: 'pace-up', text: 'Seu ritmo de leitura está acelerando nas últimas semanas.' })
  }
  if (i.streak >= 7) evolution.push({ key: 'streak-week', text: 'Uma semana inteira de leitura — que constância!' })
  else if (i.streak >= 2) evolution.push({ key: 'streak', text: `Você está numa sequência de ${i.streak} dias. Continue assim!` })
  if (i.annualGoal > 0 && i.lidosAno >= i.annualGoal) {
    evolution.push({ key: 'goal-hit', text: 'Meta anual batida. Que jornada! 🎉' })
  } else if (i.annualGoal > 0 && i.lidosAno > 0) {
    evolution.push({ key: 'goal-near', text: 'Você está cada vez mais perto da sua meta.' })
  }

  // ── Estado (fatos atuais que reforçam o hábito) ──
  if (i.readToday) state.push({ key: 'today', text: 'Cada página de hoje mantém o seu hábito em movimento.' })
  if (i.activeDaysLast7 >= 4) state.push({ key: 'constant', text: 'Seu ritmo de leitura está mais constante nesta semana.' })
  if (i.pagesThisMonth >= 1) state.push({ key: 'pages-month', text: `Você já leu ${i.pagesThisMonth.toLocaleString('pt-BR')} páginas este mês.` })
  if (i.lidosAno >= 1) state.push({ key: 'year', text: `Você já concluiu ${i.lidosAno} livro${i.lidosAno > 1 ? 's' : ''} em ${i.year}.` })
  if (i.pace && i.pace > 0) state.push({ key: 'pace', text: `Seu ritmo medido é de ${i.pace} páginas por hora.` })
  if (i.totalPagesRead >= 100) state.push({ key: 'total', text: `Você já virou ${i.totalPagesRead.toLocaleString('pt-BR')} páginas no total.` })

  return { evolution, state, evergreen: EVERGREEN, gentle: GENTLE, lowActivity: i.activeDaysLast7 === 0 }
}

// Junção de todas as frases positivas (evolução + estado + perenes), em ordem.
export function allPositive(enc: Encouragements): Msg[] {
  return [...enc.evolution, ...enc.state, ...enc.evergreen]
}

// Melhor conjunto p/ mostrar UMA frase (a de evolução ganha; perene é o último recurso).
export function bestPool(enc: Encouragements): Msg[] {
  if (enc.lowActivity) return enc.gentle
  if (enc.evolution.length) return enc.evolution
  if (enc.state.length) return enc.state
  return enc.evergreen
}

// --- Helpers para montar o EncInput a partir dos dados brutos ---

export function computeStreak(daily: DailyStat[]): number {
  if (!daily.length) return 0
  const arr = [...daily].sort((a, b) => a.day.localeCompare(b.day))
  const active = (d: DailyStat): boolean => d.pages > 0 || d.sessions > 0
  let idx = arr.length - 1
  if (!active(arr[idx])) idx--
  let s = 0
  for (; idx >= 0; idx--) {
    if (active(arr[idx])) s++
    else break
  }
  return s
}

export function buildEncInput(
  books: Book[],
  daily: DailyStat[],
  goals: Goal[],
  pace: number | null
): EncInput {
  const now = new Date()
  const year = now.getFullYear()
  const ym = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prev = new Date(year, now.getMonth() - 1, 1)
  const ymPrev = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`

  const lido = books.filter((b) => b.status === 'lido' && b.finished_at)
  const lidosAno = lido.filter((b) => b.finished_at!.startsWith(String(year))).length

  const perMonth = new Map<string, number>()
  for (const b of lido) {
    const k = b.finished_at!.slice(0, 7)
    perMonth.set(k, (perMonth.get(k) ?? 0) + 1)
  }
  const livrosMonth = perMonth.get(ym) ?? 0
  const livrosLastMonth = perMonth.get(ymPrev) ?? 0
  const maxMonth = Math.max(0, ...perMonth.values())
  const bestMonthByBooks = livrosMonth > 0 && livrosMonth >= maxMonth

  const totalPagesRead = books
    .filter((b) => b.status === 'lido')
    .reduce((s, b) => s + (b.total_pages ?? 0), 0)

  const pagesThisMonth = daily.filter((d) => d.day.startsWith(ym)).reduce((s, d) => s + d.pages, 0)
  const pagesLastMonth = daily.filter((d) => d.day.startsWith(ymPrev)).reduce((s, d) => s + d.pages, 0)

  // Ritmo acelerando: pág/h dos últimos 7 dias vs. os 7 anteriores.
  const winPace = (arr: DailyStat[]): number | null => {
    const p = arr.reduce((s, d) => s + d.pages, 0)
    const m = arr.reduce((s, d) => s + d.minutes, 0)
    return m > 0 ? p / (m / 60) : null
  }
  const rP = winPace(daily.slice(-7))
  const pP = winPace(daily.slice(-14, -7))
  const paceAccelerating = rP != null && pP != null && pP > 0 && rP >= pP * 1.1

  const last7 = daily.slice(-7)
  const activeDaysLast7 = last7.filter((d) => d.pages > 0 || d.sessions > 0).length
  const readToday = daily.length > 0 && (daily[daily.length - 1].pages > 0 || daily[daily.length - 1].sessions > 0)

  const annualGoal = goals.find((g) => g.type === 'livros_ano')?.target ?? 0

  return {
    lidosAno,
    annualGoal,
    livrosMonth,
    livrosLastMonth,
    bestMonthByBooks,
    totalPagesRead,
    pagesThisMonth,
    pagesLastMonth,
    paceAccelerating,
    streak: computeStreak(daily),
    readToday,
    activeDaysLast7,
    pace,
    year
  }
}
