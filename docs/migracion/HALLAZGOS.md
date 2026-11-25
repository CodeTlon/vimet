# Hallazgos encontrados durante la migracion

Cosas que estaban mal o eran fragiles y se corrigieron (o se anotan) al reescribir.

## Seguridad / integridad
1. `activarPerfilConfirmado(userId)` estaba exportada desde un archivo `'use server'`: era invocable sin sesion con un uuid. Ahora vive en `lib/auth/perfil.ts` (sin Server Action).
2. Reglas de negocio con `userId` exportadas desde `'use server'` (`crearTurno`, `cancelarTurno`, ...) serian invocables desde el cliente: se movieron a `lib/services/*` sin `'use server'`.
3. `toggleActivoAction` (cualquier staff) usaba el cliente de servicio: un nutricionista podia desactivar al admin. Ahora solo sobre pacientes salvo admin.
4. La app mobile escribia ficha y evolucion en texto plano (saltaba el cifrado) y con una columna inexistente (`autor_id`); ahora pasan por el servidor.
5. `/api/slots` y `/api/ejercicios` eran accesibles sin sesion (o con datos parciales por RLS); exigen sesion.
6. El feedback semanal aceptaba cualquier `semana_inicio` del cliente; ahora la fija el servidor.
7. `plan_secciones` y la ruta de recursos mobile confiaban en `paciente_id` del form para armar paths de storage; ahora salen del plan / son uuid validados.
8. El borrado de un paciente con ficha **fallaba** por la FK de `audit_log` (el trigger de borrado en cascada insertaba una fila que apuntaba al perfil que se estaba eliminando). `audit_log` ya no tiene FK a `profiles`.

## Esquema
- `drizzle-kit pull` 0.31.11 genero 5 cosas incorrectas (defaults `''`, `MAXVALUE` no representable en JS, opclasses cruzadas, orden de un `unique` compuesto, defaults de arrays `{""}`); corregidas y cubiertas por `npm run db:paridad`.
- La primera version del script de paridad no comparaba los defaults (colision de columnas `coalesce` en el objeto resultado); la corrigio el test de borrado.
- Prod no tenia las tablas de `0037` (`plan_secciones*`): drift de migraciones aplicadas a mano.

## App mobile
- Usaba el tipo de seccion `recomendaciones`, que no existe en el enum de la base (revertido el 03/09 en la web): se mapea a `pautas_generales`.
- La pantalla de plan del paciente sigue listando columnas nutricionales eliminadas por `0037` (no muestran nada).
