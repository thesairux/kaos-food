# Detalle de los hallazgos confirmados — Asian Sushi Ovalle

Commit `c63b1cd`. Cada hallazgo fue confirmado por un verificador independiente y su registro revisado por otro agente (fase 5). Las reproducciones se hicieron en un aislamiento sin red con datos y credenciales ficticias.

## 1. La espera de 1,2 s no impone ningún límite global: la adivinación en paralelo no se frena

- **Severidad:** media (probabilidad high, impacto medium)
- **Id:** `C-fuerza-bruta-paralela` · huella `api/admin.js|sleep-por-peticion-sin-limite-global|anonimo->contraseña`
- **Quién:** Visitante anónimo de internet
- **Frontera:** Anónimo → API del panel / control de contraseña
- **Afectados:** ADMIN_PASSWORD y, con ella, el panel (WhatsApp de pedidos, datos de transferencia, carta)

**Causa:** El único control es await sleep(1200) en el camino de fallo de cada petición (api/admin.js:208); sleep no bloquea (38) y no hay contador por IP/usuario, bloqueo ni límite de concurrencia.

**Camino en el código:**

- `api/admin.js:199-210` — `if (!checkCredentials(body.user, body.pass)) { await sleep(1200); return send(res, 401, { error: "acceso" }); }`
- `api/admin.js:38` — `const sleep = ms => new Promise(r => setTimeout(r, ms));`
- `api/admin.js:44-50` — `function checkCredentials(user, pass) { ... return userOk && passOk; }`

**Resultado:** Arnés propio con api/admin.js real: 200 intentos fallidos en paralelo → todos 401 en 1208 ms (≈166 intentos/s desde un solo cliente), sin bloqueo.

**Reproducción (sandboxed):** entrada: 200 POST concurrentes {user:'asiansushi', pass:'falsa-<i>'}; observado: todas 401, 1208 ms en total

**Por qué esta severidad:** El control explícito de freno no limita nada; la toma del panel depende de que la contraseña sea adivinable y de que Vercel no tenga su propio límite (fuera del código) → medium.

**Arreglo mínimo:** Límite real en almacén compartido (contador por IP+usuario con bloqueo temporal) y/o regla de Vercel Firewall sobre POST /api/admin; exigir ADMIN_PASSWORD larga.

**Prueba de regresión:** 100 intentos fallidos concurrentes con almacén simulado → a partir del umbral 429/bloqueo y llamadas a checkCredentials acotadas.

**Verificación del registro:** ok — Contador con componente por usuario y por IP; evitar bloqueo duro por usuario (dejaría fuera al dueño).

## 2. loadSite() devuelve null ante un carta.js que no es JSON estricto (o > 1 MB) y mantenerDiseno deja de proteger colores, textos y nombre

- **Severidad:** media (probabilidad low, impacto medium)
- **Id:** `C-loadsite-fail-open` · huella `api/admin.js|loadSite-null-fail-open|panel->diseño`
- **Quién:** Personal del local con credenciales (POST directo); la precondición la crea una edición a mano o el propio personal con una carta > 1 MB (depende de GitHub)
- **Frontera:** Panel → diseño de la página pública (control explícito del dueño)
- **Afectados:** Colores, textos fijos y nombre de la página pública

**Causa:** loadSite convierte SyntaxError en null (api/admin.js:99) y mantenerDiseno trata null como «nada publicado»: borra tema y textos y no restaura el nombre (falla abierto). carta.js se edita a mano como JS (README, encabezado); una coma final o un comentario son JS válido pero rompen JSON.parse. El límite de 400 000 se cuenta en caracteres, no en bytes.

**Camino en el código:**

- `api/admin.js:92-101` — `return JSON.parse(text.slice(start, text.lastIndexOf("}") + 1)); } catch (e) { if (e.status === 404 || e instanceof SyntaxError) return null;`
- `api/admin.js:128-135` — `if (actual && actual[k] !== undefined) site[k] = actual[k]; else delete site[k]; ...`
- `api/admin.js:142-144` — `mantenerDiseno(site, await loadSite()); const json = JSON.stringify(site, null, 2); if (json.length > MAX_SITE_CHARS) throw ...`
- `README.md:185-186` — `Al editar a mano, cuida las comillas y las comas`

**Resultado:** Con coma final o comentario en carta.js: la página funciona, login devuelve site null y un publish directo deja el nombre del atacante y borra tema/textos; con '__proto__' Chromium muestra --principal #00ff00 y el título de portada del atacante. Persistente. Variante > 1 MB: 400 241 caracteres = 1 125 201 bytes; si GitHub devuelve content vacío, mismo efecto; si devuelve 403, el panel queda inutilizable.

**Reproducción (sandboxed):** entrada: carta.js con '],' final o comentario //; publish con nombre del atacante y '__proto__' con tema/textos; observado: T2: nombre del atacante, tema/textos borrados; T2b: #00ff00 y TEXTO-T2b-PROTO en Chromium

**Por qué esta severidad:** Derrota completa y persistente del control explícito, con precondiciones poco comunes (edición a mano que deja el panel visiblemente roto, o comportamiento de GitHub no comprobado); solo estético y requiere credenciales.

**Arreglo mínimo:** api/admin.js: fallar cerrado (solo 404 devuelve null; SyntaxError, encoding distinto de base64 o content vacío lanzan error); en publish, rechazar si no se pudo leer lo publicado; limitar por bytes (Buffer.byteLength); sumar la limpieza de '__proto__'.

**Prueba de regresión:** GitHub simulado con carta.js con coma final → publish 4xx sin blob; content vacío/encoding none → 4xx; publish con 350 000 '—' → 400.

**Verificación del registro:** ok — mantenerDiseno ocupa api/admin.js:128-136; medium es el tope defendible.

## 3. XSS almacenado en el panel por el nombre de un grupo de «Opciones para elegir»: corre al iniciar sesión y sobrevive al cambio de contraseña

- **Severidad:** media (probabilidad low, impacto medium)
- **Id:** `C-panel-xss-nombre-grupo` · huella `admin.html|sub()-armado-sin-esc|carta->sesion-panel`
- **Quién:** Quien tuvo la contraseña compartida del panel y ya no debería (ex-empleado o filtración), después de que se cambió ADMIN_PASSWORD
- **Frontera:** Revocación de la credencial: la carga plantada antes del cambio queda en carta.js y se ejecuta en la sesión de quien entra con la contraseña nueva
- **Afectados:** Sesión del panel de quien entra tras la rotación, su credencial nueva en memoria (creds, let de nivel superior en script clásico) y la carta publicada (WhatsApp de pedidos, datos de transferencia, precios)

**Causa:** El resumen del grupo «armado» une g.nombre sin esc() (admin.html:922-925); group() lo inserta en <small>${sub}</small> (668-672) y renderEditor() lo asigna a innerHTML (960-964). Ni withDefaults, ni cleanSite, ni la API lo sanean.

**Camino en el código:**

- `admin.html:922-925` — `const n = state.personalizacion.map(g => g.nombre).filter(Boolean); return n.length ? n.slice(0, 4).join(", ") + ...`
- `admin.html:668-672 (sumidero en 670)` — `<summary>...<strong>${title}</strong><small>${sub}</small></span>${SVG.chev}</summary>`
- `admin.html:960-964` — `const html = g => group(g.id, g.title, g.sub(), g.icon, g.body()); ... $("#groups").innerHTML = ...`
- `admin.html:506-518` — `creds = { user: ..., pass: $("#pass").value }; const data = await api("login"); state = withDefaults(data.site); ... renderEditor();`
- `api/admin.js:138-148` — `mantenerDiseno(site, await loadSite()); const json = JSON.stringify(site, null, 2); ...`

**Resultado:** Copia aislada: tras el login, sin otra interacción, window.__marca=1 y el <img> queda en details[data-group=armado] summary small; con esc() en el resumen no se ejecuta. API real con GitHub simulado: la carga se guarda; tras rotar, la clave vieja da 401 y la nueva recibe la carga. La lectura de la contraseña se estableció por código, no se ejecutó.

**Reproducción (sandboxed):** entrada: personalizacion[0].nombre = 'Agregados<img src=x onerror="window.__marca=1;window.__alcanceLet=typeof state">'; observado: marca=1, alcanceLet=object, cajón cerrado; control sin marca; copia arreglada sin marca

**Por qué esta severidad:** XSS real al iniciar sesión, pero con una sola cuenta compartida solo cruza frontera para un titular revocado (precondición poco común); permite persistir tras la rotación; no escala por encima del panel.

**Arreglo mínimo:** admin.html group(): <strong>${esc(title)}</strong><small>${esc(sub)}</small> (como mínimo esc() en el sub de «armado»).

**Prueba de regresión:** pruebas/panel.js: login con personalizacion[0].nombre = 'G<img src=x onerror="window.__marca=1">' → window.__marca undefined, sin img en el summary, textContent contiene '<img'.

**Verificación del registro:** ok — El sumidero exacto es admin.html:670.

## 4. XSS almacenado en la ficha por min/max de un grupo de personalización

- **Severidad:** media (probabilidad low, impacto high)
- **Id:** `C-xss-min-max` · huella `js/app.js|limites()-min/max-sin-esc|panel->clientes`
- **Quién:** Usuario del panel (contraseña compartida; sin permiso del dueño para cambiar código ni diseño)
- **Frontera:** Datos de la carta (panel) → JavaScript en los navegadores de los clientes; y el origen del panel en «Ver como cliente»
- **Afectados:** Clientes que abren la ficha de cualquier producto con el grupo alterado (p. ej. 'salsa-incluida' está en 20 de 46 productos); personal del panel en «Ver como cliente»

**Causa:** limites() (js/app.js:119-126) suma g.min/g.max sin convertirlos a número; grupoHtml (864-868) concatena lim.min y max sin esc() en el <legend> que termina en innerHTML (1016). El servidor no valida; cleanSite solo normaliza grupos 'extra'.

**Camino en el código:**

- `js/app.js:119-126` — `function limites(g, conf) { var mas = 0; ... return { min: (g.min || 0) + mas, max: (g.max || 1) + mas }; }`
- `js/app.js:864-868` — `var ayuda = g.tipo === "extra" || !lim.min ? "Opcional" + (...) : (lim.min === max ? "Elige " + max : "Elige de " + lim.min + " a " + max); return '<fieldset class="grupo"><legend>' + esc(g.nombre) + " <small>" + ayuda +`
- `js/app.js:993, 1016` — `gruposProducto(ficha.id).forEach(function (g) { html += grupoHtml(g); }); ... cuerpoFicha.innerHTML = html;`
- `admin.html:1245` — `if (g.tipo === "extra") { g.min = 0; g.max = ... }  // los grupos 'elegir' no se normalizan (y es control de cliente)`

**Resultado:** Publish 200 con la carga intacta; Chromium aislado: legend 'Elige de <img src="x" onerror="window.__marca_min=1">0 a 1' y window.__marca_min=1; variante max (con min=1): window.__marca_max=1; control 'Elige 1' sin marcas. Panel (solo lectura de código): iframe de vista previa sin sandbox en el mismo origen (admin.html:338, 384, 519) y la contraseña queda en #pass tras el login (admin.html:506): en «Ver como cliente», abrir la ficha ejecuta el script en un contexto que puede leer parent.document #pass.

**Reproducción (sandboxed):** entrada: personalizacion[salsa-incluida].min = '<img src=x onerror="window.__marca_min=1">'; observado: __marca_min=1 / __marca_max=1 tras abrir la ficha; control sin marcas

**Por qué esta severidad:** Igual que C-xss-unidad; alcance mayor (un grupo compartido cubre muchos productos), persistencia algo menor (cambiar el modo del grupo en el panel reescribe min/max).

**Arreglo mínimo:** js/app.js limites(): convertir min/max (y o.suma) a enteros acotados; esc() de la ayuda en grupoHtml; api/admin.js: exigir enteros 0-50 en personalizacion[].min/max; admin.html cleanSite: normalizar todos los tipos.

**Prueba de regresión:** Playwright: grupo 'elegir' {min:'<img…>'} y otro {min:1, max:'<img…>'} → sin marcas ni img[onerror] y ayuda numérica; API: min no numérico → 400.

**Verificación del registro:** corrected — La llamada a grupoHtml está en js/app.js:993 (no 1006).

## 5. XSS almacenado en la ficha del producto por el campo 'unidad'

- **Severidad:** media (probabilidad low, impacto high)
- **Id:** `C-xss-unidad` · huella `js/app.js|unidad()-sin-esc|panel->clientes`
- **Quién:** Usuario del panel (contraseña compartida), que por decisión del dueño no debe poder cambiar código ni diseño
- **Frontera:** Datos de la carta (panel) → código que ejecuta el navegador de los clientes; y, en «Ver como cliente», el origen del panel
- **Afectados:** Clientes que tocan + en un producto con rolls o grupos porRoll (el atacante los pone); personal del panel que abra esa ficha en «Ver como cliente»

**Causa:** unidad() (js/app.js:136) devuelve p.unidad tal cual y tres plantillas (927, 944, 998) lo concatenan sin esc() en el HTML de la ficha asignado con innerHTML (1016). Ni cleanSite ni api/admin.js validan el campo (el panel no lo muestra pero lo conserva).

**Camino en el código:**

- `js/app.js:136` — `function unidad(id) { return PRODUCTOS[id].p.unidad || "Roll"; }`
- `js/app.js:926-927` — `'<p class="roll-titulo"><b>' + (total > 1 ? unidad(ficha.id) + " " + (i + 1) : "Tu " + minus(unidad(ficha.id))) + "</b> " + esc(texto) + "</p>"`
- `js/app.js:944` — `'Repetir ' + (unidad(ficha.id) === "Roll" ? "este roll" : "esta " + minus(unidad(ficha.id))) + ...`
- `js/app.js:998` — `html += '<div class="rolls"><h3>' + (... minus(unidad(ficha.id)) ...) + "</h3>"`
- `js/app.js:1016` — `cuerpoFicha.innerHTML = html;`
- `api/admin.js:138-148` — `mantenerDiseno(site, await loadSite()); const json = JSON.stringify(site, null, 2); ... (sin validación de esquema)`

**Resultado:** API real + GitHub simulado: publish 200 con la carga intacta en carta.js; Chromium aislado: al tocar + de nigiris (rolls=2) window.__marca_unidad=1 (2 img inyectadas); variante porRoll: 3 img (alcanza la línea 998); control sin marcas. Panel (solo lectura de código): iframe de vista previa sin sandbox en el mismo origen (admin.html:338, 384, 519) y la contraseña queda en #pass tras el login (admin.html:506): en «Ver como cliente», abrir la ficha ejecuta el script en un contexto que puede leer parent.document #pass.

**Reproducción (sandboxed):** entrada: productos[nigiris] = {..., rolls: 2, unidad: '<img src=x onerror="window.__marca_unidad=1">'}; observado: antes del clic []; tras + ficha con 2 img[onerror] y __marca_unidad=1; control 0 img

**Por qué esta severidad:** XSS almacenado que afecta a clientes y rompe el control explícito «el panel no cambia código ni diseño»; requiere la contraseña del panel y un POST hecho a mano (probabilidad baja); persiste invisible en el panel.

**Arreglo mínimo:** js/app.js: esc() en los tres usos de unidad() (927, 944, 998) o normalizar unidad() a texto corto de letras; api/admin.js: validar el esquema de productos (unidad, rolls) o conservar unidad de lo publicado; admin.html:506: vaciar #pass tras leerlo.

**Prueba de regresión:** Playwright: producto {rolls:2, unidad:'<img src=x onerror="window.__x=1">'} → tras + window.__x undefined y sin img[onerror] en la ficha; API: publish con unidad '<img…>' → 400 o sin ese valor.

**Verificación del registro:** ok — Líneas y fragmentos correctos; hoy 0 de 46 productos tienen rolls/porRoll (el atacante los agrega).

## 6. Otros sitios pueden probar contraseñas desde el navegador de sus visitantes y distinguir el acierto por tiempo

- **Severidad:** baja (probabilidad low, impacto low)
- **Id:** `C-cross-origin-oraculo` · huella `api/admin.js|sin-control-de-origen+oraculo-de-tiempo|sitio-ajeno->contraseña`
- **Quién:** Operador de cualquier sitio web de terceros (los intentos corren en el navegador de sus visitantes)
- **Frontera:** Sitio ajeno → navegador del visitante → /api/admin
- **Afectados:** ADMIN_PASSWORD (se aprende si una candidata es correcta) y, encadenado con la fuerza bruta, el panel

**Causa:** El manejador no mira Origin, Sec-Fetch-Site ni Content-Type (readBody parsea cualquier cuerpo, api/admin.js:51-57); un POST text/plain entre sitios llega sin preflight, y el acierto responde al instante mientras el fallo espera 1,2 s (207-209): oráculo de tiempo legible aunque la respuesta sea opaca.

**Camino en el código:**

- `api/admin.js:51-57` — `async function readBody(req) { ... return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }`
- `api/admin.js:199-210` — `if (!checkCredentials(body.user, body.pass)) { await sleep(1200); return send(res, 401, ...); }  // sin control de Origin`
- `api/admin.js:211-217` — `con la contraseña correcta y sin action responde 400 'accion' sin espera (lado rápido del oráculo)`

**Resultado:** Manejador real: contraseña correcta ~1 ms, incorrecta ~1200 ms; cuerpo text/plain procesado igual. La ola 2 lo vio también en Chromium aislado con fetch no-cors desde otro origen (acierto ~4 ms, fallo ~1209 ms).

**Reproducción (sandboxed):** entrada: POST text/plain con 8 contraseñas candidatas en paralelo; observado: correcta 400 en ~1 ms; incorrectas 401 en ~1200 ms

**Por qué esta severidad:** Frente al código, el sitio ajeno obtiene lo mismo que cualquier anónimo ya puede hacer directo (C-fuerza-bruta-paralela, con estado legible): solo agrega anonimato y reparto de intentos entre IPs de visitantes, que importa ante límites por IP fuera del código o un arreglo futuro solo por IP. Corregido de medium a low en la verificación de registros.

**Arreglo mínimo:** Al inicio del POST: 403 si Sec-Fetch-Site no es same-origin/none o si Origin no es el propio sitio; igualar el tiempo de respuesta entre acierto y fallo (o quitar la espera y limitar con contador); opcional exigir application/json. No rechazar peticiones sin Sec-Fetch-Site/Origin (las pruebas en Node las mandan sin ellas).

**Prueba de regresión:** |t_ok - t_fail| < umbral pequeño; Sec-Fetch-Site: cross-site → 403 antes de evaluar credenciales.

**Verificación del registro:** corrected — Severidad medium → low: frente al código, solo agrega anonimato y reparto de intentos por IP a lo que cualquier anónimo ya puede hacer directo; se agrega api/admin.js:211-217 (lado rápido).

## 7. Inyección de CSS en el estilo de la ficha mediante una foto con data: URL

- **Severidad:** baja (probabilidad low, impacto low)
- **Id:** `C-css-foto-data-url` · huella `js/app.js|style-url-con-esc|panel->clientes`
- **Quién:** Usuario del panel (contraseña compartida); el diseño lo controla la agencia
- **Frontera:** Panel → estilos de la página pública (burla parcial de la regla «el panel no cambia lo estético»)
- **Afectados:** Clientes que abren la ficha de ese producto

**Causa:** js/app.js:976 arma background-image:url("<currentSrc>") con esc(), que escapa para HTML y no para CSS: &quot; se decodifica a comilla antes del parseo CSS. Con data: (ruta opaca) Chromium deja la comilla en currentSrc; api/admin.js no valida p.foto.

**Camino en el código:**

- `js/app.js:561-564` — `function fotoLista(img) { img.classList.add("lista"); if (img.currentSrc) fotoVista[img.getAttribute("src")] = img.currentSrc; }`
- `js/app.js:975-977` — `var fondo = fotoVista[p.foto] ? ' style="background-image:url(&quot;' + esc(fotoVista[p.foto]) + '&quot;)"' : "";`
- `api/admin.js:128-148` — `publish/mantenerDiseno: p.foto no se valida`

**Resultado:** API real: publish 200 con la data: URL intacta (y el tema revertido). Chromium aislado: .ficha-foto con position:fixed, 100vw x 100vh, z-index máximo; cubre toda la ventana. Sin JS ni lectura de datos.

**Reproducción (sandboxed):** entrada: foto = data:image/svg+xml,<svg .../><!--");position:fixed;...;z:"-->; observado: estilo calculado fixed, z-index 2147483647, rect = ventana; elementFromPoint → .ficha-foto

**Por qué esta severidad:** Burla parcial del control estético con efecto en clientes; requiere la contraseña del panel y un POST a mano; solo CSS en línea de un elemento.

**Arreglo mínimo:** js/app.js:563: guardar en fotoVista solo currentSrc http(s) (o escapar para cadena CSS); api/admin.js publish(): rechazar p.foto que no sea fotos/<slug>.jpg o img/carta/<archivo>.webp. Permitir también blob: (fotos sin publicar en la vista previa del panel) o escapar como cadena CSS.

**Prueba de regresión:** Playwright: foto data: con comilla y position:fixed → .ficha-foto no fixed; API: foto 'data:...' → 400, 'fotos/abcd.jpg' → 200.

**Verificación del registro:** ok — Arreglo: permitir también blob: (vista previa del panel) o escapar como cadena CSS.

## 8. Con una clave '__proto__' en la carta, el usuario del panel cambia el nombre del local pese a mantenerDiseno

- **Severidad:** baja (probabilidad low, impacto low)
- **Id:** `C-proto-nombre` · huella `api/admin.js|__proto__-json-vs-js-literal|panel->nombre-del-local`
- **Quién:** Personal del local con credenciales del panel (POST directo)
- **Frontera:** Panel → página pública, cruzando la regla explícita del dueño y del README (el nombre no se cambia desde el panel aunque se manden peticiones directas)
- **Afectados:** Nombre del local en la página que ven todos los clientes

**Causa:** El servidor trata la carta como JSON (JSON.parse deja '__proto__' como propiedad propia; mantenerDiseno no la ve; JSON.stringify la escribe), pero el navegador evalúa carta.js como literal JS, donde "__proto__": {...} fija el prototipo de window.CARTA. Sin negocio propio, el servidor no restaura el nombre y el navegador lo toma del prototipo.

**Camino en el código:**

- `api/admin.js:51-57` — `if (typeof req.body === "string") return JSON.parse(req.body); ... return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");`
- `api/admin.js:133-135` — `if (site.negocio && typeof site.negocio === "object" && actual && actual.negocio && actual.negocio.nombre !== undefined) { site.negocio.nombre = actual.negocio.nombre; }`
- `api/admin.js:143,148` — `const json = JSON.stringify(site, null, 2); ... const content = HEADER + "window.CARTA = " + json + ";\n";`
- `js/app.js:71-73` — `function usarCarta(datos) { C = datos; N = C.negocio || {}; ...`

**Resultado:** Un POST publish deja 'Sushi Pirata (T1)' visible en Chromium (negocio propio ausente). Persiste: lo publicado ya no tiene negocio propio y cualquier publish posterior cambia el nombre. tema y textos siguen protegidos en el estado actual.

**Reproducción (sandboxed):** entrada: site sin 'negocio' propio y con "__proto__": {"negocio": {..., "nombre": "Sushi Pirata (T1)"}}; observado: 200; Chromium nombreVisible='Sushi Pirata (T1)', negocioPropio=false, principal #d73b37; publish normal posterior cambia el nombre

**Por qué esta severidad:** Derrota real y persistente de un control explícito con una sola petición, pero solo del nombre (cosmético) y por personal autenticado que ya publica texto libre y el WhatsApp.

**Arreglo mínimo:** api/admin.js publish(): quitar '__proto__' recursivamente (JSON.parse(JSON.stringify(site), (k, v) => k === "__proto__" ? undefined : v)); forzar site.negocio a objeto propio y restaurar siempre el nombre publicado. Aplicar el mismo reviver al leer lo publicado en loadSite (api/admin.js:97).

**Prueba de regresión:** publish con {"__proto__":{"negocio":{"nombre":"X"}},"secciones":[]} → evaluar carta.js en vm: nombre original y sin clave "__proto__" en el texto; repetir con text/plain.

**Verificación del registro:** ok — Arreglo: aplicar también el reviver en loadSite (api/admin.js:97); una carta ya envenenada requiere reparación manual.

## 9. Servidor de pruebas: el control de ruta compara prefijos sin separador y escucha en todas las interfaces

- **Severidad:** baja (probabilidad low, impacto low)
- **Id:** `C-servidor-pruebas-traversal` · huella `pruebas/servidor.js|path-prefix-check+listen-all-interfaces|lan->dev-files`
- **Quién:** Equipo de la misma red local mientras corre node pruebas/servidor.js
- **Frontera:** Red local → archivos del desarrollador fuera de la carpeta del proyecto
- **Afectados:** Carpetas/archivos hermanos cuyo nombre empieza con el de la carpeta del proyecto; además todo el proyecto (incluidos .git y archivos locales con punto) queda servido a la red

**Causa:** decodeURIComponent tras la normalización de new URL convierte '..%2f' en '../'; path.join sale de RAIZ y f.startsWith(RAIZ) sin separador acepta hermanos 'asiansushi*'; listen(PUERTO) sin host escucha en 0.0.0.0/::; el 500 devuelve el stack.

**Camino en el código:**

- `pruebas/servidor.js:40` — `const u = new URL(req.url, BASE);`
- `pruebas/servidor.js:44` — `let f = path.join(RAIZ, decodeURIComponent(u.pathname));`
- `pruebas/servidor.js:47` — `if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end("no"); }`
- `pruebas/servidor.js:50` — `} catch (e) { console.error(e); res.statusCode = 500; res.end(String(e.stack)); }`
- `pruebas/servidor.js:51` — `}).listen(PUERTO, () => console.log("listo " + BASE));`

**Resultado:** Copia idéntica (sha256 igual a c63b1cd) en aislamiento: GET /..%2fasiansushi-x%2farchivo-ficticio.txt → 200 con el archivo ficticio (también con el parser HTTP real por socket Unix); hermanos sin prefijo y /etc → 404; listen → 0.0.0.0; /%E0%A4%A → 500 con stack y ruta absoluta.

**Reproducción (sandboxed):** entrada: /..%2fasiansushi-x%2farchivo-ficticio.txt, /..%2fotro%2fsecreto.txt, /%E0%A4%A; observado: 200 FICTICIO_HERMANO_PREFIJO=bandera-123; 404; 500 con URIError y ruta absoluta; address 0.0.0.0

**Por qué esta severidad:** Herramienta de desarrollo local, no desplegada como servidor; requiere servidor corriendo, atacante en la misma red sin cortafuegos y hermanos con el prefijo; solo lectura y sin lectura arbitraria.

**Arreglo mínimo:** pruebas/servidor.js: listen(PUERTO, '127.0.0.1'); confinar con path.relative (rechazar '..', absolutos y segmentos con punto); 400 si decodeURIComponent falla; no devolver el stack.

**Prueba de regresión:** GET /..%2fasiansushi-x%2ff.txt → 404; /.env.local y /.git/config → 404; /%E0%A4%A → 400 sin stack; /index.html → 200; address 127.0.0.1

**Verificación del registro:** ok — .env.local no existe en el commit; depende de la copia local.
