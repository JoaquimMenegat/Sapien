// Traduz as respostas do onboarding em LINGUAGEM e AJUSTES do app.
// O onboarding pergunta o perfil, o objetivo e as barreiras; aqui essas respostas
// deixam de dormir no banco e viram frases e comportamentos concretos.
// Plano completo: COACH.md (tabela barreira → comportamento).

import type { Book } from '../../../shared/types'

export interface CoachAnswers {
  /** retomando | intermitente | frequente | iniciando */
  profile: string
  /** retomar | terminar | regularidade | evolucao | rotina */
  objective: string
  barriers: string[]
  /** days | flexible | suggest */
  organize: string
  loaded: boolean
}

export const EMPTY_COACH: CoachAnswers = {
  profile: '',
  objective: '',
  barriers: [],
  organize: '',
  loaded: false
}

/** Lê as respostas guardadas no onboarding. */
export async function loadCoachAnswers(): Promise<CoachAnswers> {
  const get = window.readdeck.getSetting
  const [profile, objective, barriers, organize] = await Promise.all([
    get('onboarding.profile'),
    get('onboarding.objective'),
    get('onboarding.barriers'),
    get('onboarding.organize')
  ])
  return {
    profile: profile ?? '',
    objective: objective ?? '',
    barriers: (barriers ?? '').split(',').filter(Boolean),
    organize: organize ?? '',
    loaded: true
  }
}

export interface CoachContext {
  books: Book[]
  /** Ritmo medido em páginas por hora (null se ainda não há sessões). */
  pace: number | null
  streak: number
  /** O usuário leu hoje? */
  readToday: boolean
}

/**
 * Frases personalizadas pelas respostas do onboarding.
 * Se o usuário marcou várias barreiras, entram no máximo duas — falar de tudo vira ruído.
 */
export function coachMessages(a: CoachAnswers, ctx: CoachContext): string[] {
  if (!a.loaded) return []
  const out: string[] = []
  const reading = ctx.books.find((b) => b.status === 'lendo')

  // --- Barreiras: o ajuste mais concreto (no máximo 2) ---
  for (const barrier of a.barriers.slice(0, 2)) {
    switch (barrier) {
      case 'tempo':
        if (ctx.pace && ctx.pace > 0) {
          out.push(`No seu ritmo, 10 minutos já são cerca de ${Math.max(1, Math.round(ctx.pace / 6))} páginas.`)
        } else {
          out.push('Dez minutos contam. O hábito importa mais que o tamanho da sessão.')
        }
        break
      case 'esqueco':
        out.push('Seus lembretes estão ligados — o Sapien te avisa no dia da leitura.')
        break
      case 'continuidade':
        if (reading) {
          out.push(`Você parou na página ${reading.current_page} de ${reading.title}. É só continuar dali.`)
        } else {
          out.push('Continuar é mais fácil que recomeçar — e você só precisa do próximo capítulo.')
        }
        break
      case 'cansaco':
        out.push('Cansaço acontece. Uma sessão curta hoje já mantém o fio da leitura.')
        break
      case 'metas':
        out.push('Sua meta é pequena de propósito. O Sapien nunca vai aumentá-la sozinho.')
        break
      case 'rotina':
        out.push('Sua rotina pode mudar. Sua meta semanal continua flexível.')
        break
      case 'horario':
        out.push('Ainda procurando seu horário? Vá testando — o Sapien registra quando você rende mais.')
        break
    }
  }

  // --- Objetivo: o que importa para esta pessoa ---
  if (a.objective === 'terminar' && reading?.total_pages) {
    const left = Math.max(0, reading.total_pages - reading.current_page)
    if (left > 0) out.push(`Faltam ${left} páginas para você terminar ${reading.title}.`)
  }
  if (a.objective === 'retomar' && ctx.streak > 0) {
    out.push(`Você está de volta — ${ctx.streak} ${ctx.streak > 1 ? 'dias' : 'dia'} de leitura já contam.`)
  }

  // --- Perfil: o tom ---
  if (a.profile === 'retomando' && !ctx.readToday) {
    out.push('Todo retorno começa com uma página. Sem cobrança.')
  }
  if (a.profile === 'iniciando' && ctx.streak <= 2) {
    out.push('Começar é a parte difícil — e você já começou.')
  }

  return out
}

/**
 * O app pode sugerir aumentar metas para esta pessoa?
 * Quem disse que as metas são difíceis, ou que a rotina muda, nunca recebe pressão
 * para subir sozinho. Usado quando houver sugestão automática de meta.
 */
export function mayIncreaseGoals(a: CoachAnswers): boolean {
  return !a.barriers.includes('metas') && !a.barriers.includes('rotina')
}
