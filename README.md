# Kaos Food: página web

Página de pedidos de **Kaos Food** (José Joaquín Latorre, frente a pasaje Verona, La Serena · +56 9 3482 9829 ·
kaosfood.ls@gmail.com), hecha con la plantilla de páginas de pedidos de altiroweb.cl: portada con promos
destacadas, carta con buscador y fotos, asistente que responde con la carta, y envío del pedido ordenado por
WhatsApp para retirar en el local.

La carta es la del menú online del local en PDF (58 páginas): 165 productos en 12 secciones — combos, colaciones,
sándwiches (ave, carne mechada, churrasco, hamburguesa y lomito), completos y as, «arma tu…» (con sus
proteínas, ingredientes y salsas a elección), papas fritas,
chorrillanas, para picar (hand roll, empanadas, ensaladas y agregados), promos con lata, bebidas, jugos y
batidos, y waffles y postres. Las 44 fotos salen del mismo PDF.

El pedido va **solo por WhatsApp**: no hay cuentas, correo ni pago online. El total es referencial: el local
confirma disponibilidad y total al responder.

El local no reparte desde la página: el delivery va por **Uber Eats** y **PedidosYa**, con sus botones en
Ubicación y dentro del pedido.

La página funciona sin servidor (también abriendo `index.html` directo en el navegador). Se puede publicar en
**Vercel** o en **Cloudflare** con los mismos archivos: los servidores (panel, asistente y estadísticas) están en
`functions/api/`; en Vercel los atiende `api/` (un adaptador corto) y en Cloudflare se usan directo.

## Publicar en Vercel

1. Sube este repositorio a GitHub (puede ser privado).
2. En Vercel: **Add New… → Project** → importa el repositorio → **Deploy**. No hay que tocar nada: `vercel.json` ya
   dice cómo armarla (`sh herramientas/construir.sh`, carpeta `dist`).
3. Activa el panel: **Settings → Environment Variables**, agrega `GITHUB_TOKEN` y `ADMIN_PASSWORD` (Vercel ya sabe
   cuál es el repositorio) y vuelve a publicar (**Deployments → … → Redeploy**).
4. Opcional: el asistente con IA (`ANTHROPIC_API_KEY`) y las estadísticas: **Storage → Create Database → Upstash for
   Redis** (plan gratuito), conéctala al proyecto y **Redeploy** (Vercel agrega solas `KV_REST_API_URL` y
   `KV_REST_API_TOKEN`).
5. Para revisar, abre **tu-pagina.vercel.app/api/admin**: dice qué está configurado (nunca muestra las claves).

Al tocar **Publicar** en el panel, Vercel vuelve a publicar la página sola en uno o dos minutos. `.vercelignore`
deja fuera las cuentas (`privado/`) y las pruebas; y como solo se publica `dist/`, los servidores no quedan a la vista.

## Publicar en Cloudflare Pages

1. Sube este repositorio a GitHub (puede ser privado).
2. En Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** y elige el repositorio.
3. En la configuración de la compilación:
   - **Framework preset**: *None*
   - **Build command**: `sh herramientas/construir.sh`
   - **Build output directory**: `dist`
4. **Save and Deploy**. La página queda en `tu-proyecto.pages.dev` (después puedes conectar tu dominio en
   *Custom domains*).
5. Activa el panel: en el proyecto, **Settings → Variables and Secrets**, agrega `GITHUB_TOKEN`, `ADMIN_PASSWORD` y
   `GITHUB_REPO` (ver «Configuración» más abajo) y vuelve a publicar (**Deployments → … → Retry deployment**).
6. Opcional: el asistente con IA (`ANTHROPIC_API_KEY`) y las estadísticas (base D1, ver «Estadísticas»).

### Si Cloudflare lo creó como Worker (dirección `.workers.dev`)

Cloudflare a veces crea el proyecto como **Worker** en vez de Pages. También funciona: `wrangler.jsonc` y `worker.js`
lo dejan listo con el nombre `kaos-food`.
- En el Worker, **Settings → Build**: *Build command* `sh herramientas/construir.sh` y *Deploy command*
  `npx wrangler deploy` (lo normal). Cada cambio en GitHub (también los del panel) vuelve a publicar solo.
- Las variables van igual en **Settings → Variables and Secrets** del Worker. `keep_vars` evita que se borren al publicar.
- Estadísticas: crea la base D1, copia su *Database ID* y pégalo en `wrangler.jsonc` (las líneas de `d1_databases`
  están comentadas, con instrucciones). En un Worker la base se conecta ahí, no en el panel de Cloudflare.
- Si el nombre de tu Worker no es `kaos-food`, cámbialo en `"name"` de `wrangler.jsonc`.

`herramientas/construir.sh` arma `dist/` solo con los archivos de la página: los servidores (`functions/`, `lib/`),
las cuentas (`privado/`), las pruebas, las herramientas y este README no se publican. `_headers` pone las cabeceras
(la carta sin caché y el panel fuera de Google). Cloudflare sirve `/admin` desde `admin.html` solo.

Antes de publicar, revisa en `carta.js` → `negocio` el WhatsApp, la dirección, el mapa, las redes y los datos de
transferencia. El logo (`img/logo-kaos.webp`), `favicon.ico`, `img/icono-192.png` e `img/icono-180.png` salen del
logo redondo del local.

## Pendiente de confirmar con el local

- **Redes**: Instagram (@kaos_food) y Facebook salen como botones en el pie, junto al de WhatsApp. Se
  cambian en el panel, en «Local y WhatsApp».
- **Formas de pago**: el menú no las dice. Quedaron Efectivo y Transferencia (`negocio.pagosRetiro`). Si acepta
  tarjeta, se agrega ahí o en el panel, en «Local y WhatsApp».
- **Dirección**: el menú dice «José Joaquín Latorre (frente a pasaje verona)», sin número ni ciudad. La ciudad
  (La Serena) la confirmó el local. Si hay número de calle, agrégalo en `negocio.direccion` para que el mapa
  apunte justo.
- **Solo retiro**: el reparto a domicilio va por apps, así que la página no ofrece delivery
  (`"soloRetiro": true` en `negocio`). Para quien quiera delivery están los botones de **Uber Eats** y
  **PedidosYa** (`appsDelivery`), que salen en Ubicación, dentro del pedido y en el asistente. Se editan en el
  panel, en «Local y WhatsApp → Apps de delivery»; el enlace tiene que empezar con `https://`. Si algún día
  reparten directo, saca `soloRetiro` y carga los `sectoresDelivery` con su valor.
- **Horario**: 09:30 a 00:30 todos los días, como dice el menú. Está confirmado (`"horarioConfirmado": true`):
  fuera de horario los productos dicen «Cerrado» y no se pueden agregar. Si algún día cierran, se marca en
  `diasCerrados` o se cambia ese día a `"cerrado"`.
- **Descripciones cortadas**: 13 productos tenían la descripción cortada por el «…» del menú online (los combos
  1, 2 y 5 al 9, el pollo a la plancha, los cuatro «mojojojo» y la ensalada césar). Se completaron con lo que se
  alcanzaba a leer; conviene que el local las revise.
- **«Limón Soda 2 L»**: en el menú su descripción decía «bebida de 600 ml», que contradice el nombre. Se quitó.
- **«Mini empanadas gyozas»**: en el menú decía «giosas». Se escribió «gyozas» por lo que dice la descripción
  (rellenas de verduras, con salsa de soya o teriyaki).
- **Sushi**: el menú tiene una sección «Sushi» con los títulos «Rolls premium» y «Promoción 30 cortes», pero sin
  ningún producto. No se cargó. Los dos hand rolls sí están, en «Para picar».
- **Fotos**: 45 de los 165 productos tienen foto (son las que traía el menú). Los demás se muestran en lista o
  con el logo. Las chorrillanas de 2 y 6 personas comparten foto, porque en el menú es la misma.
- **«Arma tu…»**: cargados con sus opciones, de los cuatro PDF del flujo de pedido del local. El cliente
  elige en la ficha del producto y todo va en el mensaje de WhatsApp. Ninguna opción cuesta extra:
  - **Proteína** (elige 1): carne mechada, pollo, churrasco, hamburguesa y lomito. El *as* solo lleva carne
    mechada o churrasco; el *completo* no lleva este paso.
  - **Ingredientes** (de 1 a 4): lechuga, palta, tocino, cebolla, queso, champiñón, huevo, tomate, pepinillo,
    porotos verdes, chucrut, salsa americana, choclo y queso cheddar.
  - **Salsas** (hasta 2, opcional): BBQ, cheddar, de aceituna, de ajo, de ciboulette, verde, ketchup, mostaza,
    ají, mayo casera, de merkén y mayo normal.

  El **arma tu waffle** usa sus propios grupos, los tres obligatorios: una **salsa** (chocolate, frutilla,
  manjar, leche condensada, frambuesa o Nutella), un **topping** (Chubi, Oreo, marshmallows, Costa Rama, coco
  rallado, Roll's o cubanito) y una **fruta** (frutilla o plátano).

  Se editan en el panel, en «Opciones para elegir», y desde ahí también se puede marcar un ingrediente como
  agotado sin tocar el resto de la carta.

## Dirección y pruebas

**Dirección**: todos los pedidos son para retirar en el local, así que la página no pide dirección de entrega.

**Pruebas** (necesitan Playwright): `node pruebas/servidor.js` levanta la página y el panel con GitHub simulado
(«Publicar» no guarda nada). Con eso corriendo, `node pruebas/pedido.js` arma un pedido y revisa el enlace y el
mensaje de WhatsApp, que la página no ofrezca delivery y que el asistente no hable de sushi; `node pruebas/panel.js`
revisa Stock, Promos y Publicar, y `node pruebas/cuentas.js` las cuentas, la recuperación y la analítica. El servidor de prueba arma `dist/` y ejecuta `functions/api/` como Cloudflare, con GitHub y la base D1
simulados (la D1 con SQLite de Node; necesita Node 22 o más nuevo). `node pruebas/seguridad.js` revisa los arreglos
de la auditoría de seguridad (carta con HTML, enlaces `javascript:`, `__proto__`, carta ilegible, otros sitios,
límite de intentos, contraseña corta). El servidor de prueba solo escucha en este equipo (127.0.0.1) y usa la
contraseña de prueba `clave-de-prueba-larga`.

## Asistente (chat de abajo a la derecha)

Abajo a la derecha aparece el **asistente**: un botón con el logo que dice «¿Te ayudo?». Al tocarlo se abre un chat
que contesta sobre la carta, precios, horario, formas de pago y dirección, recomienda según cuántas personas son y
muestra los productos con su botón **Agregar** (respeta el stock, los días y el horario igual que la carta). No toma
pedidos: el cliente igual envía su pedido por WhatsApp.

Opciones del chat (botones bajo cada respuesta, y el botón ☰ junto al cuadro de texto para verlas todas):
- **Ayúdame a pedir**: en 3 pasos (¿para cuántos?, ¿qué les gusta? —pollo, carne, completos o papas—, recomendación)
  y después sumar para picar y bebidas.
- **Ver la carta** por sección, **Lo más pedido**, **Arma lo tuyo**, **Papas fritas**, **Algo económico** (con tope
  de precio), **Para picar** y **Bebidas**.
- **Mi pedido**: lo que lleva el cliente con el total y el botón para abrirlo y enviarlo.
- **Horario**, **Formas de pago**, **Ubicación**, **Cupones**, **¿Cómo pido?**, **¿Cuánto demora?**,
  **Hablar con alguien** (WhatsApp) y **Empezar de nuevo**.
- Escribiendo también entiende: el nombre de una sección («para picar», «bebidas»), qué lleva un producto
  («¿qué lleva el combo 6?»), cambios de ingredientes, picante, vegetariano, boleta o factura, reservas, alergias,
  reclamos, «somos 4», «algo de 10 lucas» y la búsqueda por producto o ingrediente.
- Como el local es solo retiro, si preguntan por delivery el chat responde que los pedidos son para retirar.

Todos esos botones responden con la carta, sin gastar IA. Con IA, además sugiere respuestas según la conversación.

- **Con IA** (recomendado): en Cloudflare, tu proyecto de Pages → *Settings → Variables and Secrets*, agrega
  `ANTHROPIC_API_KEY` (tipo *Secret*) con una clave de la API de Claude (console.anthropic.com → *API Keys*) y vuelve
  a publicar. El asistente lee `carta.js` en cada
  publicación, así que lo que cambies en el panel (precios, stock, promos, horario) lo sabe solo. Usa
  `claude-haiku-5-5` (rápido y económico); se cambia con `ASISTENTE_MODELO`. Cada persona puede mandar hasta 25
  mensajes cada 10 minutos. Para revisar, abre **tu-pagina.pages.dev/api/asistente**: dice si la clave está puesta.
- **Sin clave** (o abriendo `index.html` directo): el chat igual funciona en *modo básico*: responde con la carta
  (horario, pagos, dirección, recomendaciones, «algo barato», búsqueda por producto o ingrediente)
  y lo que no sabe lo manda al WhatsApp.

Archivos: `js/asistente.js` (el chat y el modo básico), `functions/api/asistente.js` (el servidor de la IA; la clave nunca llega
al navegador) y los estilos al final de `css/estilos.css`. En el panel `/admin` el chat no aparece.

## Panel de administración

Entra a **tu-pagina.pages.dev/admin**. La **cuenta principal** es el usuario `kaosfood` (se cambia con `ADMIN_USER`)
con la contraseña que pongas en `ADMIN_PASSWORD`: es la llave maestra del panel. El panel no aparece en ningún menú
de la página ni en Google.

### Cuentas y recuperar el acceso

- **Cuenta** (arriba en el panel): con la cuenta principal creas, quitas o cambias la contraseña de las cuentas de
  tus trabajadores (usuario de 3 a 30 letras o números; contraseña de 12 caracteres o más). Solo la cuenta principal
  crea cuentas: en la pantalla de ingreso no hay «Crear cuenta».
- Cada cuenta, en **Cuenta**, cambia su contraseña y crea su **código de recuperación** (XXXX-XXXX-XXXX-XXXX-XXXX).
  Se muestra una sola vez; crear uno nuevo anula el anterior. Al entrar sin código, el panel le recuerda crearlo.
- **¿Olvidaste tu contraseña?** (en el ingreso) abre «Recuperar el acceso»: usuario, código y contraseña nueva. Cada
  código sirve una vez y hay un máximo de 6 intentos cada 15 minutos.
- La contraseña de la cuenta principal se cambia en Cloudflare (`ADMIN_PASSWORD` y volver a publicar); si alguien pierde su
  contraseña y su código, la cuenta principal le pone una nueva.
- Las cuentas se guardan en `privado/cuentas.json` del repositorio, con contraseñas y códigos cifrados (PBKDF2-SHA256
  con sal propia, y SHA-256), nunca en texto. Esa carpeta no se copia a `dist/`, así que no se publica: el servidor la
  lee por GitHub.

### Estadísticas

En **Estadísticas** (arriba en el panel) eliges Hoy, 7, 30 o 90 días:
- **Analítica básica**: visitas, clics a WhatsApp, personas que usaron el asistente, visitas por día y los productos
  más vistos (fichas abiertas) y más agregados al pedido.
- **Analítica de conversión**: el embudo (visitas → agregaron algo → abrieron su pedido → lo enviaron por WhatsApp),
  la conversión, el abandono (armaron pedido y no lo enviaron), los pedidos enviados, el total referencial y el ticket
  promedio, con los pedidos por día y una tabla con los números de cada día.

Los pedidos llegan por WhatsApp, así que «enviados» son los que el cliente mandó y el total es referencial: el local
los confirma. Ventas pagadas online necesitarían una integración con un medio de pago.

**Activarla en Vercel (una vez):** **Storage → Create Database → Upstash for Redis** (plan gratuito), conéctala al
proyecto y **Redeploy**.

**Activarla en Cloudflare (una vez):** **Storage & Databases → D1 → Create** (plan gratuito; por ejemplo
«kaosfood-estadisticas»). Luego, en tu proyecto de Pages, **Settings → Bindings → Add → D1 database**, con el nombre
de variable **`DB`** y esa base, y vuelve a publicar. La tabla se crea sola. Sin eso, la página funciona igual y el
panel explica cómo activarla. No se guarda nada de las personas (ni IP, ni nombre, ni
dirección): solo cuentas por día, que duran unos 13 meses. Las visitas del panel no se cuentan.

Ahí ves la página tal cual, y arriba tienes:
- **Stock**: un interruptor por producto y por ingrediente (salmón, camarón, palta…). Lo apagas y en la página sale
  **Agotado** y no se puede pedir; lo prendes cuando llega. Arriba dice qué está agotado y hay un buscador.
- **Cupones**: crear, cambiar, pausar o borrar códigos de descuento (porcentaje o monto, pedido mínimo, fechas, días,
  retiro o delivery, y si se muestran en la página). El cliente escribe el código en «Mi pedido», en **¿Tienes un
  cupón?**, debajo de «¿Cómo pagas?». El campo está siempre; si el código no existe o está pausado, no se aplica.
- **Promos**: como «Agregar servicio» en el panel de SanFelect. Cada promo tiene nombre, precio, qué trae, nota,
  foto, los días que se puede pedir (sin marcar, todos) y si sale en la portada. **Agregar promo** suma una nueva;
  con las flechas se ordenan y con el tacho se borran. También se pueden crear grupos de promos.
- **Todas las opciones**: lo anterior más **Carta y precios** (los demás productos: agregar, quitar, precios y
  fotos), **Local y WhatsApp** (WhatsApp, dirección, datos para transferencia y sectores de delivery) y **Horario**.
  Abajo, en *Más opciones*, queda **Opciones para elegir** (proteínas, rellenos, agregados).

**Lo estético no se cambia desde el panel**: los colores, los textos de cada parte de la página (portada, cómo
pedir, ubicación…) y el nombre del local. El panel no los muestra, la página no deja escribir encima y, aunque
alguien mande otros al servidor, `functions/api/admin.js` guarda siempre los que ya estaban publicados (`tema`, `textos` y
`negocio.nombre`). Esos se cambian solo editando `carta.js` en el repositorio.

Además:
- Los botones amarillos **Editar** de cada parte, o el **+** de cada producto, abren lo suyo (el **+** de una promo
  abre Promos). Lo que se usa poco de cada producto (variantes, lo que elige el cliente) está en *Más opciones*.
- **Ver como cliente** muestra la página sin marcas de edición; **Celular** la muestra en tamaño de teléfono.
- Al tocar **Publicar**, los cambios se guardan en el repositorio y Cloudflare vuelve a publicar la página sola
  en uno o dos minutos.

### Configuración (una sola vez)

En **Vercel**: *Settings → Environment Variables*. En **Cloudflare**: tu proyecto, *Settings → Variables and Secrets*
(para *Production*; las claves van como **Secret**).

| Nombre | Para qué sirve |
| --- | --- |
| `GITHUB_TOKEN` | Obligatoria (*Secret*). Clave de GitHub (*fine-grained token*) con permiso *Contents: Read and write* solo sobre este repositorio. Solo la usa el servidor; nunca llega al navegador. |
| `ADMIN_PASSWORD` | Obligatoria (*Secret*). Contraseña de la cuenta principal del panel, **de 12 caracteres o más** (mejor 16 al azar); con menos, el panel no funciona. No hay contraseña de fábrica. |
| `GITHUB_REPO` | `usuario/repositorio` de la página en GitHub. Obligatoria en Cloudflare (no lo informa solo); en Vercel solo si no lo detecta. |
| `ADMIN_USER` | Opcional. Usuario de la cuenta principal (si no está: `kaosfood`). |
| `ANTHROPIC_API_KEY` | Opcional (*Secret*). Clave de la API de Claude para que el asistente responda con IA. Sin ella responde en modo básico. |
| `GITHUB_BRANCH` | Opcional. Rama donde guarda el panel (si no está: la rama que publicó Cloudflare, o `main`). |
| Enlace **`DB`** (Cloudflare, en *Bindings*) | Opcional. La base D1 de las estadísticas en Cloudflare. |
| `KV_REST_API_URL` y `KV_REST_API_TOKEN` (Vercel) | Opcional. Las agrega Vercel al conectar Upstash for Redis: las estadísticas en Vercel. |

Después de agregar o cambiar una variable o un enlace, hay que volver a publicar (**Deployments → … → Retry
deployment**). Para revisar la configuración, abre **tu-pagina.pages.dev/api/admin**: dice si la clave de GitHub, la
contraseña, el repositorio y la base D1 están puestos (nunca muestra las claves).

### Seguridad

El panel valida todo lo que publica: la carta no puede traer HTML que se ejecute, enlaces que no sean `https://`,
fotos que no sean del sitio ni valores que cambien el diseño (colores, textos, nombre; tampoco con `__proto__`).
Si `carta.js` del repositorio no se puede leer (por ejemplo, tras editarlo a mano quedó una coma de más), el panel
**no publica** y avisa. Los servidores (`/api/admin`, `/api/asistente`, `/api/estadisticas`) solo aceptan pedidos
de la propia página, y el panel frena a quien prueba muchas contraseñas desde una misma IP. Además:

1. **Contraseña principal larga** en `ADMIN_PASSWORD` (12 caracteres o más); las cuentas del panel ya exigen 12.
2. **Límite de intentos real** en el hosting (el del código vive en cada instancia y es solo un freno parcial):
   en Vercel → Firewall, una regla *Rate Limit* para `POST /api/admin`; en Cloudflare → Security → WAF →
   *Rate limiting rules*, lo mismo para `/api/admin` (p. ej. 10 por minuto por IP).
3. **Vercel: Deployment Protection** activa para los despliegues que no son de producción. En Cloudflare, las
   direcciones de vista previa (`*.pages.dev` de cada despliegue) se protegen con *Access* si se quiere.
4. **Despliegues viejos**: los anteriores a esta versión no tienen estas protecciones y guardan su copia de las
   variables. Bórralos y, después de publicar esta versión, revoca en GitHub el `GITHUB_TOKEN` anterior y crea uno
   nuevo. Cambiar la variable en el hosting no basta.
5. El repositorio conviene que sea **privado**: `privado/cuentas.json` guarda las contraseñas cifradas (PBKDF2), pero
   no conviene dejarlas a la vista.

**Plan gratis de Cloudflare:** cada pedido a un servidor tiene unos 10 ms de procesador. Por eso las contraseñas de
las cuentas usan 30.000 vueltas de PBKDF2 (~4 ms). Con el plan pagado de Workers se puede subir `VUELTAS` en
`functions/api/admin.js` (hasta 100.000); las cuentas ya creadas siguen funcionando.

## Cómo está armada la carta (`carta.js`)

```
secciones            → botones grandes de la carta: Combos, Sandwiches, Bebidas…
  categorias         → si una sección tiene más de una, aparecen como botones chicos (Bebidas, Jugos…)
    productos        → cada producto con su precio
personalizacion      → grupos que el cliente elige: punto de la carne, agregados, proteína de cada roll…
```

La sección con `"promos": true` (o con «promo» en el nombre) es la que el panel muestra en **Promos**.

**Productos**
- **Precio**: `"precio": 14500`, sin punto ni signo.
- **Variantes con otro precio** (simple/doble, mediana/grande): `"opciones": ["Simple", "Doble"]` y
  `"preciosOpciones": { "Simple": 6490, "Doble": 8490 }`. Sin `preciosOpciones`, todas cuestan lo mismo (sabores).
- **Qué incluye** (combos y promos): en `"detalle"`, una cosa por línea separada con `\n`:
  `"1 hamburguesa a elección\n1 papas fritas\n1 bebida en lata"`. Si todas las líneas son piezas o cortes
  (`"25 piezas frías\n25 piezas calientes"`), además suma las piezas.
- **Nota destacada**: `"nota": "Válido por tiempo limitado."`
- **Agotado**: `"disponible": false`.
- **Promo en la portada**: `"destacado": true` y una `"foto"`.
- **Fotos**: en `img/carta/`, con `"foto": "img/carta/mi-foto.webp"`. Si una categoría tiene al menos un producto
  con foto, se muestra en tarjetas; si no, en lista. Se ven mejor en formato horizontal (1000 × 725).
  Con `"tarjetas": true` en la categoría, va en tarjetas aunque no tenga fotos: queda el espacio de la imagen
  con el logo hasta que se suba la foto.
  Al agregar o cambiar una foto en `img/carta/`, corre `python3 herramientas/miniaturas.py`: crea la copia liviana
  de 600 px (`img/carta/600/`) que usan las tarjetas para cargar rápido. Si falta, la tarjeta usa la foto original.
- **Producto nuevo**: copia uno parecido y cambia `id` (no se puede repetir), `nombre`, `detalle` y `precio`.

**Opciones para elegir** (`personalizacion`)
- `"tipo": "elegir"`, `"min": 1`, `"max": 1` → el cliente elige una sí o sí (punto de la carne, salsa).
  Con `"porDefecto": true` en una opción, queda marcada de entrada.
- `"tipo": "extra"`, `"max": 10` → agregados opcionales, cada uno con su `"precio"` (tocino +$1.000).
- `"suma": { "gohan-agregados": 1 }` en una opción → al elegirla, el cliente elige uno más en ese otro grupo
  (la proteína «Vegetariano (2 agregados)» del gohan, el sushiburger, la sushi arepa y el sushipleto).
- `"porRoll": true` → se elige en cada roll; el producto dice cuántos rolls arma el cliente con `"rolls": 2`.
  Con `"gratis": 1` en una opción, la primera no se cobra y cada repetida sí (envoltura en palta o en queso).
- Para usar un grupo: `"personalizar": ["punto", "agregados"]` en la categoría (vale para todos sus productos)
  o en un producto (reemplaza al de la categoría; por ejemplo el pollo crispy solo lleva `["agregados"]`).
- La sección **Arma tu pedido** de la página aparece sola si hay una categoría con grupos `porRoll`;
  en esta carta no hay ninguna, así que está oculta junto con su enlace del menú.

**Cupones** (`cupones`)
- Cada cupón tiene un `"codigo"` (lo que escribe el cliente), un `"nombre"` (cómo se muestra), un `"tipo"`
  (`"porcentaje"` o `"monto"`) y un `"valor"` (`10` = 10%, o `2000` = $2.000).
- Condiciones opcionales: `"minimo"` (pedido mínimo), `"tope"` (descuento máximo de un porcentaje),
  `"desde"` y `"hasta"` (`"2026-12-31"`), `"dias"` (`["martes"]`), `"modo"` (`"retiro"` o `"delivery"`) y
  `"aplica"` (ids de categorías, por ejemplo `["hamburguesas"]`: el descuento se calcula solo sobre esos productos).
- `"activo": false` lo apaga sin borrarlo; `"visible": false` lo saca de la página, pero el código sigue funcionando
  (para redes, volantes o clientes frecuentes).
- Un cupón por pedido. Si el pedido no cumple una condición, el cliente ve por qué (por ejemplo «te faltan $2.300») y el
  descuento se aplica solo cuando la cumple. El mensaje de WhatsApp lleva el cupón, el descuento y el total.
- La página no tiene servidor de pedidos: los códigos se pueden ver en `carta.js` y no se puede limitar a «un uso por persona».
  Por eso cada cupón llega escrito en el pedido, para que el local lo confirme al responder.
- Si no hay cupones activos y visibles, la sección **Cupones** y su enlace del menú no aparecen.

**Local, horario y delivery**
- **Sucursales**: en `negocio`, `"sucursales": [{ "nombre": "Villa El Portal", "whatsapp": "56946324426",
  "whatsappVisible": "+56 9 4632 4426", "direccion": "…" }]`. Con dos o más, el cliente elige la sucursal al
  pedir y el pedido llega al WhatsApp de esa sucursal; en la portada y el pie aparecen todos los números.
  Se editan en el panel, en «Local y WhatsApp».
- **Formas de pago**: `"pagosDelivery": ["Efectivo", "Transferencia", "Edenred"]` (al recibir) y
  `"pagosRetiro": ["Efectivo", "Transferencia", "Tarjeta", "Edenred"]` (al retirar).
- **Solo retiro**: `"soloRetiro": true` en `negocio` saca el delivery de la página; todos los pedidos son
  para retirar. Se acompaña de `"appsDelivery": [{ "nombre": "Uber Eats", "url": "https://…" }, …]`, que salen
  como botones en Ubicación y en el pedido (solo direcciones `https://`).
- **Delivery por sectores**: `"sectoresDelivery": [{ "nombre": "Centro", "detalle": "…", "precio": 2500 }, …]`. Al
  pedir delivery el cliente elige su sector; el valor se suma al total y va en el mensaje.
- **Productos de un día**: `"dias": ["lunes"]` en un producto: solo se puede pedir ese día (los otros días dice
  «Solo los lunes») y en la portada aparece solo ese día. `"unidad": "Sushiburger"` cambia «Roll 1, Roll 2…» por
  «Sushiburger 1, 2…» en los productos que se arman de a varios.
- **Horario**: `"lunes": "12:30-23:00"`, `"domingo": "cerrado"` o dos turnos `"12:00-15:30, 19:00-23:00"`.
  Con `"horarioConfirmado": false` se muestra como *horario referencial, por confirmar* y no bloquea pedidos;
  con `true` aparece *Abierto ahora / Cerrado ahora* y fuera de horario no se puede agregar.
- **Días sin atención** (feriados): `"diasCerrados": ["2026-12-25", "2027-01-01"]`.
- Lo que quede vacío no se muestra: sin `"direccion"` no aparece la sección de ubicación; sin `"instagram"`, no hay enlace.
- **Mapa**: `"mapa"` es el enlace del local en Google Maps y `"mapaBusqueda"` lo que se busca para mostrar el mapa.
- **Transferencia**: `"datosTransferencia": "Banco …\nCuenta …\nRUT …"` se muestra cuando el cliente elige ese pago.

Al editar a mano, cuida las comillas y las comas: cada elemento de una lista va separado por una coma.
`carta.js` tiene que quedar como JSON estricto (sin coma al final de una lista ni comentarios `//`): si no, el panel
no publica hasta que se corrija. Los enlaces (`facebook`, `mapa`) tienen que empezar con `https://`.
Si la carta deja de aparecer, lo más probable es que falte o sobre una coma en el último cambio.

## Archivos

- `index.html`: estructura de la página y textos fijos (portada, arma tu pedido, cómo pedir, ubicación).
- `carta.js`: datos del local, colores, horario, productos, precios y opciones para elegir.
- `css/estilos.css`: diseño (computador y celular). Los colores se cambian desde `carta.js` → `tema`.
- `js/app.js`: carta, buscador, pedido, horario de apertura y mensaje de WhatsApp.
- `js/tema.js`: aplica los colores de la marca.
- `img/`: logo e íconos; en `img/carta/` las imágenes de los productos y en `img/carta/600/` sus copias livianas.
- `herramientas/miniaturas.py`: crea esas copias livianas.
- `admin.html`: el panel de administración.
- `functions/api/admin.js`: el servidor del panel (revisa la contraseña, maneja las cuentas, lee las estadísticas y guarda los cambios en GitHub).
- `functions/api/estadisticas.js` y `lib/estadisticas-db.js`: reciben y guardan la analítica de la página en D1.
- `lib/comun.js`: herramientas que comparten los servidores.
- `privado/cuentas.json`: las cuentas del panel, cifradas (lo crea el panel; no se publica).
- `js/asistente.js` y `functions/api/asistente.js`: el asistente (chat) y su servidor de IA.
- `pruebas/`: el servidor de prueba y las pruebas del pedido, del panel, de las cuentas y de seguridad.
- `herramientas/construir.sh`: arma `dist/`, lo que publica Cloudflare.
- `fotos/`: las fotos que se suben desde el panel (se crea sola).
- `worker.js` y `wrangler.jsonc`: para publicarlo como Worker (`.workers.dev`) en vez de Pages.
- `api/`, `lib/vercel.js`, `vercel.json` y `.vercelignore`: para publicarlo en Vercel.
- `_headers` y `robots.txt`: cabeceras de Cloudflare (la carta sin caché) y que el panel no aparezca en Google.

## Cómo funciona el pedido

El cliente arma el pedido, escribe su nombre, elige la sucursal, retiro o delivery (con su sector y la dirección
escrita) y cómo paga. Al tocar **Enviar pedido por WhatsApp** se abre el WhatsApp de esa sucursal con un
mensaje ordenado: sucursal, modalidad, sector y dirección, forma de pago, productos con todo lo elegido, notas,
cupón y subtotal. El local responde confirmando disponibilidad y total. El pedido queda guardado en el navegador
del cliente aunque cierre la página.
