// Destino post-login: solo paths internos ("/algo"). Nunca una URL absoluta ni protocol-relative
// ("//evil.com", "/\\evil.com"): eso seria un open redirect.
export function safeNextPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return null
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null
  if (/[\u0000-\u001f]/.test(raw)) return null
  // /login como destino generaria un loop.
  if (raw === '/login' || raw.startsWith('/login?')) return null
  return raw
}
