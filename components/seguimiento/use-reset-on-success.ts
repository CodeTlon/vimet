'use client'

import { useEffect, useRef } from 'react'

/**
 * Devuelve un ref para el <form>; cada vez que el estado de la Server Action
 * pasa a `ok`, resetea el formulario (limpia los inputs no controlados).
 * Depende del objeto `state` completo —no del booleano— porque la action
 * devuelve un objeto nuevo en cada submit, así un segundo guardado exitoso
 * también dispara el reset.
 */
export function useResetOnSuccess(state: { ok?: boolean } | undefined) {
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok) ref.current?.reset()
  }, [state])
  return ref
}
