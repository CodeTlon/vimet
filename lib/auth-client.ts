'use client'

import { createAuthClient } from 'better-auth/react'

// Cliente de Better Auth para el navegador (cerrar sesion). La sesion en si la resuelve el
// servidor y llega a los componentes como prop; no hay consulta de perfil desde el cliente.
export const authClient = createAuthClient()
