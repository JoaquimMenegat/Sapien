// Diagnóstico de leitura: lê as sessões já registradas e responde perguntas que o
// usuário não consegue responder sozinho — em que horário ele rende mais, em que dia
// da semana lê melhor, e como foi o mês comparado ao anterior.
// Tudo calculado no cliente a partir de `sessions.recent()` — sem tabela nova.

import type { SessionWithBook } from '../../../shared/types'

/** Datas vêm em formatos diferentes (ISO no Supabase, 'YYYY-MM-DD HH:MM:SS' no desktop). */
export function parseSessionDate(raw: string): Date | null {
  if (!raw) return null
  // Sem fuso explícito: o desktop grava em UTC, então acrescentamos o 'Z'.
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

export interface Totals {
  sessions: number
  minutes: number
  pages: number
  /** Dias distintos com leitura. */
  days: number
  /** Páginas por hora do período (null se não houver tempo registrado). */
  pace: number | null
}

export interface MonthDiagnosis {
  /** 'AAAA-MM' */
  month: string
  totals: Totals
  previous: Totals
  /** Hora do dia (0–23) em que mais leu, e quanto leu nela. */
  bestHour: { hour: number; minutes: number; pages: number } | null
  /** Dia da semana (0=domingo) em que mais leu. */
  bestWeekday: { weekday: number; minutes: number; pages: number } | null
  /** Minutos por hora do dia — para o gráfico. */
  byHour: number[]
  /** Minutos por dia da semana. */
  byWeekday: number[]
}

const emptyTotals = (): Totals => ({ sessions: 0, minutes: 0, pages: 0, days: 0, pace: null })

function totalsOf(list: SessionWithBook[]): Totals {
  const days = new Set<string>()
  let minutes = 0
  let pages = 0
  for (const s of list) {
    const d = parseSessionDate(s.started_at)
    if (d) days.add(d.toISOString().slice(0, 10))
    minutes += s.duration_min || 0
    pages += s.pages_read || 0
  }
  return {
    sessions: list.length,
    minutes,
    pages,
    days: days.size,
    pace: minutes > 0 && pages > 0 ? Math.round(pages / (minutes / 60)) : null
  }
}

/** 'AAAA-MM' do mês anterior. */
export function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Meses (mais recente primeiro) que têm alguma sessão registrada. */
export function monthsWithSessions(sessions: SessionWithBook[]): string[] {
  const set = new Set<string>()
  for (const s of sessions) {
    const d = parseSessionDate(s.started_at)
    if (d) set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return [...set].sort().reverse()
}

export function diagnoseMonth(sessions: SessionWithBook[], month: string): MonthDiagnosis {
  const inMonth = (m: string): SessionWithBook[] =>
    sessions.filter((s) => {
      const d = parseSessionDate(s.started_at)
      if (!d) return false
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === m
    })

  const list = inMonth(month)
  const byHour = new Array(24).fill(0) as number[]
  const pagesByHour = new Array(24).fill(0) as number[]
  const byWeekday = new Array(7).fill(0) as number[]
  const pagesByWeekday = new Array(7).fill(0) as number[]

  for (const s of list) {
    const d = parseSessionDate(s.started_at)
    if (!d) continue
    byHour[d.getHours()] += s.duration_min || 0
    pagesByHour[d.getHours()] += s.pages_read || 0
    byWeekday[d.getDay()] += s.duration_min || 0
    pagesByWeekday[d.getDay()] += s.pages_read || 0
  }

  const topHour = byHour.reduce((best, v, i) => (v > byHour[best] ? i : best), 0)
  const topWeekday = byWeekday.reduce((best, v, i) => (v > byWeekday[best] ? i : best), 0)

  return {
    month,
    totals: list.length ? totalsOf(list) : emptyTotals(),
    previous: totalsOf(inMonth(previousMonth(month))),
    bestHour: byHour[topHour] > 0 ? { hour: topHour, minutes: byHour[topHour], pages: pagesByHour[topHour] } : null,
    bestWeekday:
      byWeekday[topWeekday] > 0
        ? { weekday: topWeekday, minutes: byWeekday[topWeekday], pages: pagesByWeekday[topWeekday] }
        : null,
    byHour,
    byWeekday
  }
}

/**
 * Uma frase de leitura do mês — sempre sem culpa. Compara com o mês anterior quando
 * há com o que comparar; nunca cobra quem leu menos.
 */
export function monthNarrative(d: MonthDiagnosis): string {
  const { totals: t, previous: p } = d
  if (t.sessions === 0) return 'Nenhuma sessão registrada neste mês. Um recomeço cabe em dez minutos.'
  if (p.sessions === 0) return `Você registrou ${t.sessions} ${t.sessions > 1 ? 'sessões' : 'sessão'} e ${t.pages} páginas. É a sua base — daqui pra frente dá pra comparar.`

  if (t.pages > p.pages) {
    const diff = t.pages - p.pages
    return `Você leu ${diff} ${diff > 1 ? 'páginas' : 'página'} a mais que no mês passado. O hábito está pegando.`
  }
  if (t.days >= p.days && t.days > 0) {
    return `Você leu em ${t.days} dias — constância igual ou melhor que a do mês passado, que é o que sustenta o hábito.`
  }
  return `Mês mais curto que o anterior, e tudo bem: ${t.sessions} ${t.sessions > 1 ? 'sessões' : 'sessão'} e ${t.pages} páginas continuam sendo leitura feita.`
}
