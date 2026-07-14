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

/**
 * Devuelve un ref para el contenedor de los carteles de éxito/error: al
 * guardar, si el form es largo y el submit quedó fuera de vista, el cartel
 * arriba del todo pasaba desapercibido. Este hook lo trae a la vista solo.
 */
export function useScrollToMessage(state: { ok?: boolean; error?: string } | undefined) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (state?.ok || state?.error) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [state])
  return ref
}

/**
 * Los carteles de éxito/error de state.ok/state.error quedaban visibles para
 * siempre (hasta el próximo submit). Devuelve `true` apenas hay un state
 * nuevo con ok/error, y vuelve a `false` solo con un setTimeout — usalo para
 * condicionar el render del cartel junto a state.ok/state.error.
 */
export function useAutoHideMessage(
  state: { ok?: boolean; error?: string } | undefined,
  ms = 4000,
) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!state?.ok && !state?.error) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), ms)
    return () => clearTimeout(t)
  }, [state, ms])
  return visible
}
