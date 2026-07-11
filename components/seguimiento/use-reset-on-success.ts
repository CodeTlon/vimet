'use client'

import { useEffect, useRef, useState } from 'react'

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

/**
 * Para forms de edición (no se resetean a vacío, muestran datos existentes
 * vía `defaultValue`): un input no controlado no relee `defaultValue` en un
 * re-render con props nuevas, solo al montar. Devuelve un número que sube
 * cada guardado exitoso — usalo como `key` del <form> para forzar un
 * remount y que los campos reflejen el dato recién guardado.
 */
export function useRemountKeyOnSuccess(state: { ok?: boolean } | undefined) {
  const [key, setKey] = useState(0)
  useEffect(() => {
    if (state?.ok) setKey((k) => k + 1)
  }, [state])
  return key
}
