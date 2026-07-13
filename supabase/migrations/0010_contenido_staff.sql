-- El módulo de contenido del sitio (servicios, ubicación/metodología,
-- foto de perfil de profesional) estaba gateado a is_admin(), pero hoy el
-- único staff son Avril y Gero y ambos deben poder administrarlo igual que
-- un admin. Se relaja is_admin() -> is_staff() en las tres policies
-- involucradas. No se toca profiles.rol de nadie ni el trigger de
-- auto-escalación de rol (0006), que sigue exigiendo is_admin().

drop policy if exists "servicios admin write" on public.servicios;
create policy "servicios admin write"
  on public.servicios for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "contenido_sitio admin write" on public.contenido_sitio;
create policy "contenido_sitio admin write"
  on public.contenido_sitio for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "sitio storage admin write" on storage.objects;
create policy "sitio storage admin write"
  on storage.objects for all
  using (bucket_id = 'sitio' and public.is_staff())
  with check (bucket_id = 'sitio' and public.is_staff());
