-- VIMET — nuevo estado de turno para el flujo de reprogramación: el staff
-- pasa el turno a "pendiente_reprogramacion" (sin fijar día) y el paciente
-- elige el nuevo horario, que lo vuelve a "pendiente".
--
-- Separado en su propia migración porque un valor de enum recién agregado
-- con ALTER TYPE ... ADD VALUE no puede usarse dentro de la misma
-- transacción que lo crea (la función del trigger que lo referencia va en
-- 0025_turno_reprogramacion_trigger.sql).

alter type estado_turno add value 'pendiente_reprogramacion';
