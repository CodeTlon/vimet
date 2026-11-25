# Fuentes

Las fuentes están **en el repo** (`app/fonts/`, archivos `woff2` del subset latin) y se cargan con `next/font/local`. El build no depende de Google Fonts: antes `next/font/google` bajaba las fuentes en cada build y fallaba de forma intermitente en el CI y en el build de la imagen Docker.

- **En uso:** Outfit y DM Sans (variables, `app/layout.tsx`).
- **Origen:** paquetes `@fontsource` / `@fontsource-variable` de npm (versión 5.3.0), que redistribuyen las fuentes de Google Fonts.
- **Licencia:** SIL Open Font License 1.1 (permite uso comercial y redistribución con el proyecto). Cada familia pertenece a sus autores; los textos de licencia están en los paquetes de origen.
- **Para agregar o cambiar una fuente:** bajar el `woff2` latin del paquete correspondiente, copiarlo a `app/fonts/`, declararlo con `localFont` (rango de pesos para las variables, un `path` por peso para las estáticas) y mantener el mismo `variable` CSS para no tocar Tailwind. No volver a `next/font/google`.
