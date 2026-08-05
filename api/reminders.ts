// GET /api/reminders — chamado por agendador (Vercel Cron ou externo).
// Envia o lembrete do dia para quem tem leitura marcada na agenda hoje.
//
// Proteção: header `Authorization: Bearer <CRON_SECRET>` ou `?secret=<CRON_SECRET>`.
// Regras: no máximo 1 e-mail por usuário por dia; sem agenda hoje = sem e-mail;
// quem desligou em Personalização (`reminders.email` = '0') nunca recebe.
import { admin, json } from './_asaas'
import { sendEmail, emailShell, authorizeCron } from './_email'

const TZ = 'America/Sao_Paulo'

/** Dia da semana (0=domingo) e data ISO no fuso do Brasil. */
function todayInBR(): { weekday: number; iso: string } {
  const now = new Date()
  const local = new Date(now.toLocaleString('en-US', { timeZone: TZ }))
  return { weekday: local.getDay(), iso: local.toISOString().slice(0, 10) }
}

function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}
function fmtDur(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export default async function handler(req: any, res: any): Promise<void> {
  if (!authorizeCron(req)) {
    // Diagnóstico seguro: diz apenas se as variáveis EXISTEM no servidor (nunca o valor).
    // Assim dá para separar "faltou redeploy" de "segredo diferente". Remover depois.
    return json(res, 401, {
      error: 'unauthorized',
      cronSecretConfigured: !!process.env.CRON_SECRET,
      resendKeyConfigured: !!process.env.RESEND_API_KEY
    })
  }

  const { weekday, iso } = todayInBR()
  const db = admin()
  const result = { day: iso, weekday, candidates: 0, sent: 0, skipped: 0, errors: [] as string[] }

  try {
    // 1) Quem tem leitura marcada para hoje.
    const { data: slots } = await db
      .from('schedule_slots')
      .select('user_id, start_min, duration_min, book_id, books(title)')
      .eq('weekday', weekday)
      .order('start_min')

    const byUser = new Map<string, any[]>()
    for (const s of (slots ?? []) as any[]) {
      const list = byUser.get(s.user_id) ?? []
      list.push(s)
      byUser.set(s.user_id, list)
    }
    result.candidates = byUser.size
    if (byUser.size === 0) return json(res, 200, result)

    // 2) Preferências (quem desligou os lembretes) e marca de envio de hoje.
    const ids = [...byUser.keys()]
    const { data: settings } = await db
      .from('user_settings')
      .select('user_id, key, value')
      .in('user_id', ids)
      .in('key', ['reminders.email', 'reminders.lastSent'])

    const pref = new Map<string, Record<string, string>>()
    for (const row of (settings ?? []) as any[]) {
      const cur = pref.get(row.user_id) ?? {}
      cur[row.key] = row.value
      pref.set(row.user_id, cur)
    }

    // 3) E-mails dos usuários.
    const { data: userList } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const emailById = new Map<string, string>()
    for (const u of userList?.users ?? []) if (u.email) emailById.set(u.id, u.email)

    // 4) Envio.
    for (const [userId, userSlots] of byUser) {
      const p = pref.get(userId) ?? {}
      const email = emailById.get(userId)
      // Desligado explicitamente, sem e-mail, ou já enviado hoje → pula.
      if (p['reminders.email'] === '0' || !email || p['reminders.lastSent'] === iso) {
        result.skipped++
        continue
      }

      const items = userSlots
        .map((s) => {
          const title = s.books?.title
          return `<li style="margin:0 0 8px"><b style="color:#F1F5F9">${hhmm(s.start_min)}</b> · ${fmtDur(
            s.duration_min
          )}${title ? ` — ${String(title).replace(/</g, '&lt;')}` : ''}</li>`
        })
        .join('')

      const total = userSlots.reduce((sum, s) => sum + s.duration_min, 0)
      const body = `
        <p style="margin:0 0 14px">Hoje tem leitura marcada na sua agenda:</p>
        <ul style="margin:0 0 16px;padding-left:18px;color:#9AA3B2">${items}</ul>
        <p style="margin:0;color:#64748B;font-size:14px">São ${fmtDur(
          total
        )} no total. Se o dia apertar, ler cinco minutos já conta.</p>`

      try {
        await sendEmail(email, 'Sua leitura de hoje ✦ Sapien', emailShell('Sua leitura de hoje', body, 'Iniciar sessão'))
        await db
          .from('user_settings')
          .upsert({ user_id: userId, key: 'reminders.lastSent', value: iso })
        result.sent++
      } catch (e: any) {
        result.errors.push(String(e?.message || e).slice(0, 120))
      }
    }

    return json(res, 200, result)
  } catch (e: any) {
    return json(res, 500, { error: 'Falha ao enviar lembretes.', detail: String(e?.message || e) })
  }
}
