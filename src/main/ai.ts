// Agente "Achar um livro" — fala SOMENTE sobre livros (recomendações por gênero,
// sínteses/resumos, do que um livro trata, avaliações gerais). Usa a Claude API
// (SDK oficial @anthropic-ai/sdk) no processo main, com a chave do usuário guardada
// localmente em settings.

import Anthropic from '@anthropic-ai/sdk'
import { getSetting } from './db/settings'
import type { ChatMessage, AiResult } from '../shared/types'

export const DEFAULT_MODEL = 'claude-opus-4-8'

const SYSTEM_PROMPT = `Você é o assistente literário do Sapien. Fale SOMENTE sobre livros e leitura:
- Recomendações por gênero, tema, autor ou "parecido com X".
- Do que um livro trata (síntese/resumo, sem spoilers de reviravoltas, salvo se pedirem).
- Avaliações e recepção geral do mercado (bem/mal recebido, prêmios, clássico ou não).
- Comparações entre livros e orientação sobre por onde começar numa série/autor.

Regras:
- Responda em português do Brasil, de forma direta e útil. Nada de "pensando em voz alta".
- Ao recomendar, liste alguns títulos com autor e uma frase curta de por que vale a pena.
- Se não souber um dado específico com certeza, diga isso em vez de inventar.
- Se perguntarem algo que NÃO é sobre livros/leitura, recuse educadamente em uma frase e
  reconduza para livros.`

function getModel(): string {
  return getSetting('ai.model') ?? DEFAULT_MODEL
}

export function aiStatus(): { hasKey: boolean; model: string } {
  return { hasKey: !!getSetting('ai.apiKey'), model: getModel() }
}

export async function chatAboutBooks(messages: ChatMessage[]): Promise<AiResult> {
  const apiKey = getSetting('ai.apiKey')
  if (!apiKey) {
    return { ok: false, error: 'Nenhuma chave de API configurada.' }
  }

  const client = new Anthropic({ apiKey })
  try {
    const res = await client.messages.create({
      model: getModel(),
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content }))
    })
    const text = res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim()
    return { ok: true, text: text || '(sem resposta)' }
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: 'Chave de API inválida. Confira em Configurações.' }
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, error: 'Limite de uso atingido. Tente novamente em instantes.' }
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return { ok: false, error: 'Sem conexão com a internet para falar com a IA.' }
    }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, error: `Erro da IA (${err.status ?? '?'}): ${err.message}` }
    }
    return { ok: false, error: String(err) }
  }
}
