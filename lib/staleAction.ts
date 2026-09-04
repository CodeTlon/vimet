// Tras cada deploy en Coolify cambia el hash de las Server Actions. Un tab
// abierto desde antes del deploy manda un Next-Action ID viejo → el server
// nuevo no lo encuentra y tira este error. No es bug de datos/auth: se
// resuelve solo con un reload (trae el bundle nuevo).
export function isStaleServerActionError(error: Error): boolean {
  return /Failed to find Server Action|Server Reference ID did not match/.test(error.message)
}
