// Limpa mensagens de erro vindas do IPC do Electron, que chegam embrulhadas como
// "Error: Error invoking remote method 'x': Error: <mensagem real>".
export function cleanErrorMessage(err: unknown): string {
  let msg = err instanceof Error ? err.message : String(err)
  msg = msg.replace(/Error invoking remote method '[^']+':\s*/g, '')
  msg = msg.replace(/^(Error:\s*)+/, '')
  return msg.trim() || 'Algo deu errado.'
}
