import type { Book, DailyStat, Goal } from '../../../shared/types'

export interface Msg {
  key: string
  text: string
}

export interface Encouragements {
  positive: Msg[]
  gentle: Msg[]
  lowActivity: boolean
}

// Frases gentis (sem culpa) — mostradas sempre como "quando a semana aperta", e
// como principais quando não houve leitura recente.
const GENTLE: Msg[] = [
  { key: 'g-pausa', text: 'Uma pausa faz parte. Retome no seu ritmo.' },
  { key: 'g-pequenas', text: 'Pequenas leituras também contam.' },
  { key: 'g-recomeco', text: 'Seu progresso continua. Hoje pode ser um novo começo.' },
  { key: 'g-cinco', text: 'Sem culpa: cinco minutos de leitura já valem.' },
  { key: 'g-espera', text: 'O livro espera por você — no seu tempo.' },
  { key: 'g-devagar', text: 'Devagar também é avançar.' }
]

// Frases perenes (sempre válidas) — dão variedade ao conjunto.
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
  bestMonthByBooks: boolean
  totalPagesRead: number
  pagesThisMonth: number
  pagesLastMonth: number
  streak: number
  readToday: boolean
  activeDaysLast7: number
  pace: number | null
  year: number
}

export function computeEncouragements(i: EncInput): Encouragements {
  const positive: Msg[] = []
  const add = (key: string, text: string): number => positive.push({ key, text })

  if (i.pagesLastMonth > 0 && i.pagesThisMonth > i.pagesLastMonth) {
    const pct = Math.round(((i.pagesThisMonth - i.pagesLastMonth) / i.pagesLastMonth) * 100)
    if (pct >= 5) add('pages-up', `Você está lendo ${pct}% mais do que no mês passado.`)
  }
  if (i.bestMonthByBooks && i.livrosMonth >= 1) add('best-month', 'Este é o seu melhor mês de leitura até agora.')
  if (i.streak >= 7) add('streak-week', 'Uma semana inteira de leitura — que constância!')
  else if (i.streak >= 2) add('streak', `Você está numa sequência de ${i.streak} dias. Continue assim!`)
  if (i.readToday) add('today', 'Cada página de hoje mantém o seu hábito em movimento.')
  if (i.activeDaysLast7 >= 4) add('constant', 'Seu ritmo de leitura está mais constante nesta semana.')
  if (i.annualGoal > 0 && i.lidosAno >= i.annualGoal) add('goal-hit', 'Meta anual batida. Que jornada! 🎉')
  else if (i.annualGoal > 0 && i.lidosAno > 0) add('goal-near', 'Você está cada vez mais perto da sua meta.')
  if (i.lidosAno >= 1) add('year', `Você já concluiu ${i.lidosAno} livro${i.lidosAno > 1 ? 's' : ''} em ${i.year}.`)
  if (i.pace && i.pace > 0) add('pace', `Seu ritmo medido é de ${i.pace} páginas por hora.`)
  if (i.totalPagesRead >= 100) add('total', `Você já virou ${i.totalPagesRead.toLocaleString('pt-BR')} páginas no total.`)

  positive.push(...EVERGREEN)

  return { positive, gentle: GENTLE, lowActivity: i.activeDaysLast7 === 0 }
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

  // Contagem de livros concluídos por mês (para "melhor mês").
  const perMonth = new Map<string, number>()
  for (const b of lido) {
    const k = b.finished_at!.slice(0, 7)
    perMonth.set(k, (perMonth.get(k) ?? 0) + 1)
  }
  const livrosMonth = perMonth.get(ym) ?? 0
  const maxMonth = Math.max(0, ...perMonth.values())
  const bestMonthByBooks = livrosMonth > 0 && livrosMonth >= maxMonth

  const totalPagesRead = books
    .filter((b) => b.status === 'lido')
    .reduce((s, b) => s + (b.total_pages ?? 0), 0)

  const pagesThisMonth = daily.filter((d) => d.day.startsWith(ym)).reduce((s, d) => s + d.pages, 0)
  const pagesLastMonth = daily.filter((d) => d.day.startsWith(ymPrev)).reduce((s, d) => s + d.pages, 0)

  const last7 = daily.slice(-7)
  const activeDaysLast7 = last7.filter((d) => d.pages > 0 || d.sessions > 0).length
  const readToday = daily.length > 0 && (daily[daily.length - 1].pages > 0 || daily[daily.length - 1].sessions > 0)

  const annualGoal = goals.find((g) => g.type === 'livros_ano')?.target ?? 0

  return {
    lidosAno,
    annualGoal,
    livrosMonth,
    bestMonthByBooks,
    totalPagesRead,
    pagesThisMonth,
    pagesLastMonth,
    streak: computeStreak(daily),
    readToday,
    activeDaysLast7,
    pace,
    year
  }
}
