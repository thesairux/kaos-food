# Auditoría de seguridad

Los informes de esta carpeta son de la auditoría hecha sobre la versión `c63b1cd`, antes de agregar el asistente,
las estadísticas, las cuentas y Cloudflare. Sus arreglos están aplicados en esta versión:

- `js/app.js`: unidad y min/max escapados y validados, foto de fondo escapada como CSS, enlaces solo `https://`,
  dirección del pedido en una sola línea.
- `admin.html`: resumen de grupos escapado, contraseña fuera del formulario tras entrar, login por POST.
- `functions/api/admin.js` (el servidor del panel en Vercel y Cloudflare): limpia la carta antes de publicar,
  quita `__proto__`, falla cerrado si `carta.js` no se puede leer, límite en bytes, solo la propia página y con
  JSON, límite de intentos por IP y contraseña principal de 12 caracteres o más.
- `functions/api/asistente.js` y `estadisticas.js`: solo pedidos de la propia página (`mismoSitio` en `lib/comun.js`).
- `pruebas/servidor.js`: solo 127.0.0.1, sin salir de `dist/` ni archivos con punto, sin stack en los errores.
- `pruebas/seguridad.js`: comprueba todo lo anterior.

Los informes citan archivos y líneas de esa versión (por ejemplo `api/admin.js`, que ahora es
`functions/api/admin.js`). El asistente, las estadísticas y las cuentas se revisaron solo para portar estos arreglos,
no con una auditoría completa. Lo que se configura fuera del código está en el README, sección «Seguridad».
