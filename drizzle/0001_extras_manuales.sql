-- Objetos que Drizzle no modela: exclusion constraints, funciones y triggers.
-- Reemplaza lo que hoy viven en supabase/migrations/{0001,0008,0022,0039}.
-- Lo que dependia de auth.uid()/is_staff() (RLS, triggers anti-escalacion, handle_new_user) NO esta aca:
-- pasa a guards en el servidor (docs/migracion/inventario.md, Fase 4) y a un hook de Better Auth (Fase 3).

CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint

-- Un profesional no puede tener dos turnos activos solapados (ex 0008).
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_no_solapado"
  EXCLUDE USING gist (
    "profesional_id" WITH =,
    tsrange(("fecha" + "hora_inicio"), ("fecha" + "hora_fin")) WITH &&
  ) WHERE ("estado" IN ('pendiente', 'confirmado'));
--> statement-breakpoint

-- Un profesional no puede tener dos franjas activas solapadas el mismo dia (ex 0022).
ALTER TABLE "horarios_disponibles" ADD CONSTRAINT "horarios_disponibles_no_solapado"
  EXCLUDE USING gist (
    "profesional_id" WITH =,
    "dia_semana" WITH =,
    tsrange(('2000-01-01'::date + "hora_inicio"), ('2000-01-01'::date + "hora_fin")) WITH &&
  ) WHERE ("activo");
--> statement-breakpoint

CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;
--> statement-breakpoint
CREATE TRIGGER fichas_set_updated_at BEFORE UPDATE ON "fichas_paciente" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER objetivos_set_updated_at BEFORE UPDATE ON "objetivos" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER plan_secciones_set_updated_at BEFORE UPDATE ON "plan_secciones" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER planes_set_updated_at BEFORE UPDATE ON "planes" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON "profiles" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER turnos_set_updated_at BEFORE UPDATE ON "turnos" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

-- Audit log de escrituras clinicas (ex 0039). El actor ya no sale de auth.uid(): la capa de datos lo fija con
--   select set_config('app.user_id', '<uuid>', true)
-- dentro de la transaccion. Si no se fija, queda null (acciones de sistema).
CREATE FUNCTION log_audit_change() RETURNS trigger LANGUAGE plpgsql AS $$
declare
  v_paciente_id uuid;
  v_registro_id text;
  v_metadata jsonb;
begin
  if TG_TABLE_NAME = 'fichas_paciente' then
    v_paciente_id := coalesce(new.paciente_id, old.paciente_id);
    v_registro_id := coalesce(new.paciente_id, old.paciente_id)::text;
  else
    v_paciente_id := coalesce(new.paciente_id, old.paciente_id);
    v_registro_id := coalesce(new.id, old.id)::text;
  end if;

  -- En UPDATE solo los NOMBRES de columna que cambiaron, no los valores (no duplica datos clinicos).
  if TG_OP = 'UPDATE' then
    select coalesce(jsonb_agg(n.key), '[]'::jsonb)
    into v_metadata
    from jsonb_each(to_jsonb(new)) as n
    join jsonb_each(to_jsonb(old)) as o on n.key = o.key
    where n.value is distinct from o.value;
    v_metadata := jsonb_build_object('campos_modificados', v_metadata);
  else
    v_metadata := null;
  end if;

  insert into audit_log (paciente_id, actor_id, accion, tabla, registro_id, metadata)
  values (
    v_paciente_id,
    nullif(current_setting('app.user_id', true), '')::uuid,
    lower(TG_OP), TG_TABLE_NAME, v_registro_id, v_metadata
  );

  return coalesce(new, old);
end;
$$;
--> statement-breakpoint
CREATE TRIGGER fichas_paciente_audit AFTER INSERT OR UPDATE OR DELETE ON "fichas_paciente" FOR EACH ROW EXECUTE FUNCTION log_audit_change();
--> statement-breakpoint
CREATE TRIGGER planes_audit AFTER INSERT OR UPDATE OR DELETE ON "planes" FOR EACH ROW EXECUTE FUNCTION log_audit_change();
--> statement-breakpoint
CREATE TRIGGER evolucion_entradas_audit AFTER INSERT OR UPDATE OR DELETE ON "evolucion_entradas" FOR EACH ROW EXECUTE FUNCTION log_audit_change();
--> statement-breakpoint
CREATE TRIGGER mediciones_antropometricas_audit AFTER INSERT OR UPDATE OR DELETE ON "mediciones_antropometricas" FOR EACH ROW EXECUTE FUNCTION log_audit_change();
--> statement-breakpoint
CREATE TRIGGER evaluaciones_funcionales_audit AFTER INSERT OR UPDATE OR DELETE ON "evaluaciones_funcionales" FOR EACH ROW EXECUTE FUNCTION log_audit_change();
