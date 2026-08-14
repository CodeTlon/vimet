-- Alternativa al GIF propio: el staff puede cargar un ejercicio pegando un
-- link de YouTube en vez de subir/recortar un video. La miniatura se arma
-- en el cliente a partir del id del video (img.youtube.com), sin API de
-- YouTube ni Storage propio.
alter table public.ejercicios add column if not exists youtube_url text;

-- Un ejercicio subido por staff tiene exactamente un medio: GIF propio o
-- link de YouTube, nunca los dos ni ninguno. El catálogo seedeado
-- (origen='dataset') queda afuera del check (algunos vienen sin gif_url).
alter table public.ejercicios add constraint ejercicios_media_check
  check (
    origen <> 'staff'
    or ((gif_url is not null) <> (youtube_url is not null))
  );
