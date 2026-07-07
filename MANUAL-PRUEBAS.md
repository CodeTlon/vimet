# Manual de pruebas — VIMET

Checklist de testing manual para flujos con riesgo real de bug que los tests automáticos no atrapan
(criterio humano de UI, timing/concurrencia, credenciales externas, auth). Se completa a medida que
se construyen o tocan estas features.

## Auth — registro, login, invite, recuperar contraseña
- [ ] Registro de paciente nuevo (`signUp`) → llega el mail de confirmación, el link confirma y redirige bien.
- [ ] Invite de paciente desde admin → el link de invite (`token_hash` o implicit flow) deja crear la contraseña en `nueva-contrasena` y loguea.
- [ ] Reset de contraseña (olvidé mi contraseña) → mismo flujo de `nueva-contrasena`, no se mezcla con el de invite.
- [ ] `hash-invite-handler` detecta el hash en distintos navegadores (Chrome, Safari) y no rompe si se recarga la página a mitad del flujo.
- [ ] Login con credenciales inválidas muestra error claro, no rompe la página.
- [ ] Logout limpia la sesión y un paciente no puede volver atrás con el botón del navegador a una página autenticada.

## Permisos — paciente vs admin
- [ ] Un paciente logueado no puede acceder a `/admin/*` (ni por URL directa).
- [ ] Un paciente solo ve sus propios turnos/ficha/planes/recursos, nunca los de otro paciente (probar cambiando el `id` en la URL).
- [ ] Un profesional inactivo (`toggleActivoAction`) no puede seguir operando con una sesión ya abierta.

## Wizard de turnos — concurrencia de horarios
- [ ] Dos pestañas reservando el mismo slot al mismo tiempo → solo una reserva queda, la otra ve el slot ya ocupado (no double-booking).
- [ ] Un horario bloqueado (`bloqueos_horario`) no aparece como disponible en `/api/slots`.
- [ ] Cancelar un turno desde `mis-turnos` libera el slot para que otro paciente lo pueda tomar.
- [ ] Cambiar el estado de un turno desde `admin/turno/[id]` se refleja al instante en el calendario admin.

## Uploads y archivos — planes y recursos
- [ ] Subir un PDF de plan desde admin → el paciente lo puede descargar desde `mis-planes/[id]` (URL firmada del bucket privado `planes`, no expira antes de tiempo razonable).
- [ ] Subir un recurso multimedia (imagen/video/link) → toggle de visibilidad funciona: si está oculto, no aparece en `mis-recursos` del paciente.
- [ ] Subir un archivo de tamaño grande no rompe el form ni deja un registro huérfano en la tabla si falla el upload al bucket `recursos`.

## Ficha clínica, antropometría, evaluación funcional
- [ ] Editar la ficha clínica de un paciente guarda y se refleja igual al recargar (no se pierde con un refresh a medio completar).
- [ ] Agregar una medición antropométrica nueva actualiza el gráfico de evolución sin recargar la página.
- [ ] El score de evaluación funcional se calcula igual al guardar que al volver a abrir el registro (no hay drift entre cálculo en cliente vs servidor).

## Feedback semanal y objetivos
- [ ] El form de feedback semanal no permite enviar dos respuestas para la misma semana (o el histórico no se duplica).
- [ ] Responder una duda del feedback desde admin se ve reflejado para el paciente en su próxima visita a la página.
- [ ] Cambiar el estado de un objetivo se refleja correctamente agrupado por categoría/estado en ambas vistas (admin y paciente, si aplica).

## Formulario de contacto (Resend)
- [ ] Envío exitoso muestra confirmación y llega el mail a `COMPANY_EMAIL`.
- [ ] Falla de Resend (API key inválida/caída) no rompe la página — muestra error legible al usuario.

## Configuración admin
- [ ] Cambiar contraseña propia desde `admin/configuracion` desloguea o mantiene sesión de forma consistente (verificar cuál es el comportamiento esperado).
- [ ] Configurar un profesional (rol + servicios + horarios) no pisa configuraciones de otros profesionales ya guardadas.
