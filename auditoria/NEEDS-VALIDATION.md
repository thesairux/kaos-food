# Pendientes de validar — Asian Sushi Ovalle

Hipótesis con base en el código cuyo dato decisivo no está en el repositorio ni se puede obtener en el aislamiento. **No tienen severidad.** Los planes son revisiones de configuración o pruebas locales con datos ficticios; ninguno pide probar contra el sitio publicado ni contra servicios reales.

## Despliegues anteriores a c63b1cd (sin mantenerDiseno y con editor de colores y textos) permitirían cambiar el diseño si siguen accesibles

- **Id:** `C-despliegues-antiguos`
- **Quién:** Personal del local con la contraseña vigente al momento de ese despliegue y su URL
- **Frontera:** Panel → diseño de la página pública a través de una versión del servidor sin el control

**Causa en el código:** El control se agregó en c63b1cd; api/admin.js de 7716b60 a 49af412 no lo tiene y el admin.html antiguo tenía editores de colores y textos. Cada despliegue de Vercel conserva su código y sus variables y escribe en la misma rama.

**Camino:** `api/admin.js@49af412:126-131`; `api/admin.js:64-69`

**Lo que se observó localmente:** Con api/admin.js@49af412 y GitHub simulado, un publish con tema/textos/nombre del atacante se publica íntegro.

**Dato que falta:** (a) Si existen despliegues anteriores a c63b1cd cuyas URLs *.vercel.app respondan sin autenticación de Vercel (Deployment Protection); (b) si su GITHUB_TOKEN sigue válido; (c) si producción ya corre c63b1cd o posterior.

**Cómo validarlo sin tocar producción:** En el panel de Vercel (solo mirar): Settings → Deployment Protection (si Vercel Authentication cubre todos los despliegues que no son de producción), Deployments (si quedan despliegues de commits anteriores a c63b1cd) y el commit del despliegue de producción. Si quedan despliegues viejos accesibles, borrarlos y revocar en GitHub el GITHUB_TOKEN anterior.

**Arreglo si se confirma (o como prevención):** Operativo: Deployment Protection para despliegues que no son de producción; borrar los despliegues anteriores a c63b1cd; revocar en GitHub el GITHUB_TOKEN anterior, crear uno nuevo y volver a desplegar (rotar en Vercel no afecta a despliegues viejos).

## Enlaces de Facebook y Mapa aceptan javascript: (sin validación de esquema); en Chromium no se ejecuta

- **Id:** `C-href-esquema`
- **Quién:** Usuario del panel (lo puede escribir en la interfaz)
- **Frontera:** Panel → JavaScript en los navegadores de los clientes

**Causa en el código:** negocio.facebook, negocio.mapa y sucursales[].mapa llegan sin validar el esquema a href (js/app.js:421-422, 1196, 1201); la única defensa es target=_blank rel=noopener, cuyo efecto depende del navegador.

**Camino:** `js/app.js:421-422`; `js/app.js:1196,1201`; `admin.html:935,939`

**Lo que se observó localmente:** Chromium 153: no se ejecuta (abre about:blank); un control sin target sí se ejecuta, así que el arnés detecta ejecución. El valor se publica sin validación.

**Dato que falta:** Si Safari iOS/WKWebView (navegador interno de Instagram/Facebook en iOS), Android System WebView en esas apps (con setSupportMultipleWindows(false)) o Firefox ejecutan una URL javascript: al tocar <a target="_blank" rel="noopener">.

**Cómo validarlo sin tocar producción:** Con el servidor de pruebas local (pruebas/servidor.js, contraseña de prueba) poner Facebook/Mapa = javascript:document.title='PRUEBA';void 0 (inocuo) y tocar los enlaces desde Safari en iPhone, el navegador interno de Instagram/Facebook (iOS y Android), Chrome Android y Firefox, apuntando al equipo local. Si cambia el título de la página, pasa a confirmado (severidad media).

**Arreglo si se confirma (o como prevención):** js/app.js: aceptar solo https: en 421, 422, 1196 y 1201 (ocultar el enlace si no); api/admin.js: descartar o rechazar facebook/mapa/sucursales[].mapa que no empiecen por https://.

## Saltos de línea en datos de OSM/Photon se copian sin limpiar a la dirección y agregan líneas aparentes al mensaje de pedido

- **Id:** `C-photon-saltos-linea`
- **Quién:** Cualquier editor de OpenStreetMap
- **Frontera:** Datos de terceros (OSM/Photon) → mensaje de pedido que llega al WhatsApp del local

**Causa en el código:** sugerenciaDe() concatena street/name/housenumber/city de Photon sin quitar caracteres de control; elegirSugerencia() y la geocodificación inversa lo copian a pedido.direccion; mensaje() lo pone en «Dirección:» y une con \n; wsp() lo codifica como %0A.

**Camino:** `js/app.js:1488-1499`; `js/app.js:1546-1555`; `js/app.js:1407-1413`; `js/app.js:1572`; `js/app.js:1608`; `js/app.js:41-44`

**Lo que se observó localmente:** Con Photon simulado (sugerencia y geocodificación inversa): aparecen 'Pago: Transferencia (YA PAGADO)' y 'Total referencial: $0' como líneas propias; las líneas reales siguen más abajo.

**Dato que falta:** Si el Photon real (OSM → Nominatim → Photon) entrega \n, \r, U+0085, U+2028 o U+2029 dentro de name/street/housenumber/district/locality/city/county.

**Cómo validarlo sin tocar producción:** Revisar el código de importación de Nominatim/Photon para ver si conserva saltos de línea en name/street/housenumber/city, o levantar Nominatim+Photon locales con un .osm mínimo que tenga name="A\nB". No editar OpenStreetMap.

**Arreglo si se confirma (o como prevención):** js/app.js: unaLinea() que reemplace [\u0000-\u001f\u007f-\u009f\u2028\u2029] por espacio, colapse espacios y recorte a 160; aplicarla a cada propiedad de Photon en sugerenciaDe() y a la dirección en mensaje() y al restaurar de localStorage.

## La espera de 1,2 s por intento fallido mantiene ocupada la función (costo/concurrencia)

- **Id:** `C-sleep-agotamiento`
- **Quién:** Visitante anónimo de internet
- **Frontera:** Anónimo → disponibilidad/costo de la función del panel

**Causa en el código:** Cada POST con credenciales inválidas espera 1,2 s antes de responder (api/admin.js:207-209).

**Camino:** `api/admin.js:207-209`

**Lo que se observó localmente:** Cada fallo tarda ~1200 ms; 200 en paralelo en ~1208 ms (la espera no bloquea).

**Dato que falta:** Límites reales de Vercel del proyecto: concurrencia de la función, facturación por duración y si hay rate limit/WAF sobre /api/admin.

**Cómo validarlo sin tocar producción:** En el panel de Vercel (solo mirar): plan, límite de concurrencia de funciones, modelo de facturación por duración y si hay reglas de Firewall/rate limit sobre /api/admin.

**Arreglo si se confirma (o como prevención):** Limitar en el borde (Vercel Firewall) o con contador compartido y rechazo inmediato (429), en vez de retener la invocación (coincide con el arreglo de la fuerza bruta).
