# Auditoría de seguridad — Asian Sushi Ovalle

**Estado de la corrida: incompleta en lo formal.** Las seis fases se hicieron, pero la skill venía sin sus archivos complementarios (`RECONNAISSANCE.md`, `HUNTING.md`, `ATTACK-CLASSES.md`, `VALIDATION-AND-REPORTING.md`, `report-schema.json`, `validate-findings.cjs`, `validate-coverage-ledger.cjs`). Por eso `findings.json` y `coverage-ledger.json` se revisaron con una revisión propia de las reglas de `SKILL.md` (sin errores), no con los validadores oficiales. Todos los candidatos se validaron; ninguno quedó sin revisar.

- Objetivo: `/home/user/asiansushi`, commit `c63b1cd` (árbol limpio). Perfil `standard`, alcance completo (`.`), sin corridas anteriores.
- Ejecución de código del proyecto solo dentro de un aislamiento propio: sin red, solo lectura salvo la carpeta del agente, entorno vacío, límites de memoria, procesos, CPU y tiempo. No se tocó ningún servicio real (Vercel, GitHub, Photon, WhatsApp).
- 2 olas de búsqueda (7 buscadores), 2 críticos de cobertura (el final, limpio), 7 verificadores independientes y 3 verificadores de registros.

## Resumen

| # | Hallazgo | Estado | Severidad | Quién lo explota |
|---|---|---|---|---|
| 1 | XSS almacenado en la ficha del producto por el campo `unidad` (js/app.js) | confirmado | media | usuario del panel → clientes |
| 2 | XSS almacenado en la ficha por `min`/`max` de un grupo de opciones (js/app.js) | confirmado | media | usuario del panel → clientes |
| 3 | XSS en el panel por el nombre de un grupo de «Opciones para elegir» (admin.html) | confirmado | media | ex-titular de la contraseña → sesión del panel |
| 4 | La protección del diseño falla abierta si `carta.js` no es JSON estricto o pesa > 1 MB (api/admin.js) | confirmado | media | usuario del panel → diseño |
| 5 | La espera de 1,2 s no limita la adivinación de la contraseña en paralelo (api/admin.js) | confirmado | media | anónimo → panel |
| 6 | `__proto__` en la carta cambia el nombre del local pese a la protección (api/admin.js) | confirmado | baja | usuario del panel → diseño |
| 7 | Inyección de CSS en la ficha con una foto `data:` (js/app.js) | confirmado | baja | usuario del panel → clientes |
| 8 | Otros sitios pueden probar contraseñas desde sus visitantes y ver el acierto por tiempo (api/admin.js) | confirmado | baja | sitio ajeno → panel |
| 9 | Servidor de pruebas: lee carpetas hermanas y escucha en toda la red (pruebas/servidor.js) | confirmado | baja | equipo de la red local → desarrollador |
| 10 | Enlaces de Facebook/Mapa aceptan `javascript:` | por validar | — | usuario del panel → clientes |
| 11 | Saltos de línea de OpenStreetMap/Photon meten líneas falsas en el mensaje de WhatsApp | por validar | — | editor de OSM → local |
| 12 | Despliegues anteriores a `c63b1cd` sin la protección del diseño | por validar | — | usuario del panel → diseño |
| 13 | La espera de 1,2 s retiene invocaciones (costo/concurrencia) | por validar | — | anónimo → disponibilidad |

No hay hallazgos críticos ni altos. El patrón principal es uno: **el servidor publica cualquier JSON del panel sin validar su forma, y la página o el panel pintan algunos campos sin escapar**. Por eso quien tenga la contraseña del panel —a quien el dueño quiso limitar a contenido— puede ejecutar código en el navegador de los clientes o cambiar el diseño. La adivinación de esa contraseña tampoco tiene un límite real.

## Prioridades de arreglo

1. **Escapar y validar la carta** (hallazgos 1, 2, 3, 7, 10): `esc()` en `unidad`, en la ayuda de `min`/`max` y en el resumen del panel; números enteros para `min`/`max`; solo `https:` en enlaces; escape CSS para la foto. En el servidor, validar `unidad`, `rolls`, `foto`, `min`/`max` y enlaces antes de publicar.
2. **Hacer que la protección del diseño falle cerrada** (4, 6): leer lo publicado o rechazar el cambio; quitar `__proto__`; limitar por bytes.
3. **Frenar la adivinación** (5, 8, 13): rechazar peticiones entre sitios, límite de intentos y contraseña larga; en Vercel, una regla de Firewall sobre `POST /api/admin`.
4. **Servidor de pruebas solo en 127.0.0.1** y con control de ruta correcto (9).
5. **Operación** (12): Deployment Protection, borrar despliegues anteriores a `c63b1cd`, revocar y renovar `GITHUB_TOKEN` en GitHub.

## Cobertura

15 unidades: 10 cubiertas con hallazgo o sin él, 3 con hallazgos por validar y 2 diferidas de prioridad baja: contraseña en la URL si se envía el login antes de que cargue el script, y envío del GPS y la dirección del cliente a Photon (tema de privacidad). Revisado: autenticación y API completa, todos los `innerHTML`/`href`/`style` de la página y del panel, mensajes entre ventanas, `localStorage`, datos de Photon, configuración, archivos estáticos expuestos, historial git (sin secretos), servidor de pruebas y despliegues antiguos.

**No cubierto:** la configuración real de Vercel y GitHub (cabeceras, Deployment Protection, Firewall, concurrencia, permisos del token, protección de rama), la fortaleza real de `ADMIN_PASSWORD`, navegadores distintos de Chromium (Safari iOS, WebView de Instagram/Facebook, Firefox) y las respuestas reales de Photon y de la API de contenidos de GitHub. Una corrida no agota el objetivo.

Detalle: `FINDINGS-DETAIL.md`. Pendientes de validar: `NEEDS-VALIDATION.md`. Datos: `findings.json`, `coverage-ledger.json`.
