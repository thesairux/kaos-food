/* Prueba del pedido por WhatsApp (necesita Playwright): con «node pruebas/servidor.js» corriendo, «node pruebas/pedido.js». */
const { chromium } = require('playwright');
const BASE = 'http://localhost:8790';
const ok = (c, m) => { if (!c) throw new Error('FALLÓ: ' + m); console.log('  ✓ ' + m); };

(async () => {
  const b = await chromium.launch(); const errores = [], llamadas = [];
  // el local atiende de 09:30 a 00:30 todos los días; se fija la hora de Chile para que no dependa del equipo
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/Santiago' });
  await ctx.clock.setFixedTime(new Date('2026-11-05T18:00:00Z'));   // jueves 15:00 en Chile: abierto
  await ctx.route('https://wa.me/**', r => r.fulfill({ contentType: 'text/html', body: '<p>WhatsApp</p>' }));
  const vigilar = (p, n) => {
    p.on('pageerror', e => errores.push(n + ': ' + e.message));
    // el 503 es de /api/asistente sin clave de IA: el chat responde igual con la carta
    p.on('console', m => { if (m.type() === 'error' && !/favicon|404|503/.test(m.text())) errores.push(n + ': ' + m.text()); });
    // el pedido se envía por WhatsApp: la página no habla con ningún servidor para pedir
    // (la analítica y el chat del asistente sí tienen el suyo)
    p.on('request', r => { if (r.url().startsWith(BASE + '/api/') && !/\/api\/(estadisticas|asistente)/.test(r.url())) llamadas.push(r.url()); });
  };
  const p = await ctx.newPage(); vigilar(p, 'cliente');
  const sec = async n => { await p.click('[data-seccion="' + (await p.$$eval('[data-secciones] .pildora', (x, n) => x.findIndex(y => y.textContent === n), n)) + '"]'); await p.waitForTimeout(250); };
  const abrirProd = async n => { await p.locator('.tarjeta, .fila', { has: p.locator('.fila-nombre', { hasText: new RegExp('^' + n.replace(/[()&+]/g, '\\$&') + '$') }) }).first().locator('button').last().click(); await p.waitForTimeout(250); };
  const botonFicha = async () => (await p.locator('[data-confirmar]').innerText()).trim().replace(/\s+/g, ' ');
  const confirmar = async () => { await p.click('[data-confirmar]'); await p.waitForTimeout(250); ok(!(await p.locator('[data-ficha][open]').count()), 'se agrega al pedido'); };
  const abrirPedido = async () => { await p.locator('.boton-pedido').click(); await p.waitForTimeout(400); };
  const pie = async () => (await p.locator('[data-pedido-pie] .boton').innerText()).trim().replace(/\s+/g, ' ');
  const pagos = () => p.$$eval('input[name="pago"]', x => x.map(i => i.value).join(', '));
  const enlace = async () => {
    const u = new URL(await p.locator('[data-pedido-pie] a[data-enviar]').getAttribute('href'));
    return { numero: u.pathname.slice(1), texto: u.searchParams.get('text') };
  };

  console.log('1) La página');
  await p.goto(BASE + '/'); await p.waitForTimeout(800);
  ok((await p.title()).includes('Kaos Food'), 'el título dice Kaos Food');
  ok(await p.locator('.destacado').count() === 1, 'la portada muestra las promos destacadas');
  const secciones = await p.$$eval('[data-secciones] .pildora', x => x.map(y => y.textContent));
  ok(secciones.join(' | ') === 'Combos | Colaciones | Sandwiches | Completos y As | Arma tu... | Papas fritas | Chorrillanas | Para picar | Promos con lata | Bebidas | Jugos y batidos | Waffles y postres', 'secciones: ' + secciones.join(' | '));
  const cuerpo = await p.locator('body').innerText();
  ok(!/sushi|roll premium|tabla de \d|gohan|nigiri/i.test(cuerpo), 'no queda nada de la carta de sushi de la plantilla');
  ok(!/asian|ovalle|sergio peralta/i.test(cuerpo), 'ni del local anterior');
  ok(await p.locator('[data-lista] .agregar').count() > 0, 'en horario se puede agregar');
  await p.click('.portada-acciones a[href="#pedir"]'); await p.waitForTimeout(1500);
  const alto = async () => [await p.$eval('.cabecera', e => Math.round(e.getBoundingClientRect().bottom)), await p.$eval('.secciones', e => Math.round(e.getBoundingClientRect().top))];
  let [cab, nav] = await alto();
  ok(Math.abs(cab - nav) <= 2, '«Ver la carta» deja las secciones justo bajo la cabecera (' + cab + ' y ' + nav + ')');
  const fotos = await p.$$eval('.tarjeta-foto img', x => x.filter(i => i.complete && i.naturalWidth > 0).length);
  ok(fotos > 0, 'las fotos cargan (' + fotos + ' en la primera sección)');

  console.log('2) Se arma el pedido');
  await sec('Combos');
  await abrirProd('Combo 1');                       // sin opciones: se agrega directo
  ok(!(await p.locator('[data-ficha][open]').count()), 'un producto sin opciones se agrega de una');
  await abrirProd('Combo 8');                       // «Pan con hamburguesa o churrasco»
  const opciones = await p.$$eval('[data-ficha] input[name="opcion"]', x => x.map(i => i.value));
  ok(opciones.join(', ') === 'Hamburguesa, Churrasco', 'el Combo 8 deja elegir: ' + opciones.join(', '));
  await p.locator('[data-ficha] input[name="opcion"][value="Churrasco"]').check({ force: true }); await p.waitForTimeout(120);
  ok(await botonFicha() === 'Agregar por $8.500', 'la opción no cambia el precio: ' + await botonFicha());
  await confirmar();
  await sec('Sandwiches');
  await abrirProd('Churrasco italiano');
  if (await p.locator('[data-ficha][open]').count()) await confirmar();
  await sec('Bebidas');
  const bebidas = await p.$$eval('[data-lista] .fila-nombre, [data-lista] .tarjeta-nombre', x => x.map(y => y.textContent));
  ok(bebidas.length > 0, 'las bebidas se listan (' + bebidas.length + ')');

  console.log('3) Retiro en el local');
  await abrirPedido();
  ok(!(await p.locator('[data-ayuda="nombre"].falta').count()), 'al abrir el carrito no sale en rojo «Escribe tu nombre…»');
  await p.click('[data-pedido-pie] [data-falta]', { force: true }); await p.waitForTimeout(200);
  ok(/escribe tu nombre/i.test(await p.locator('[data-ayuda="nombre"].falta').innerText().catch(() => '')), 'sale solo si intenta enviar sin nombre');
  ok(await p.locator('input[name="sucursal"]').count() === 0, 'no pide elegir sucursal (hay un solo local)');
  await p.fill('[data-campo="nombre"]', 'Ana');
  ok((await p.locator('.retiro-info').innerText()).includes('José Joaquín Latorre'), 'el retiro muestra José Joaquín Latorre');
  ok(await pagos() === 'Efectivo, Transferencia', 'pagos: ' + await pagos());
  await p.locator('input[name="pago"][value="Efectivo"]').check({ force: true }); await p.waitForTimeout(150);
  ok(/Subtotal referencial\s*\$19\.500/.test(await p.locator('[data-pedido-pie]').innerText()), 'subtotal referencial $19.500 (4.500 + 8.500 + 6.500)');
  const e = await enlace();
  ok(e.numero === '56934829829', 'el enlace va al WhatsApp del local (+56 9 3482 9829)');
  ok(e.texto.includes('Nombre: Ana') && e.texto.includes('Modalidad: Retiro en el local (José Joaquín Latorre, frente a pasaje Verona)') && e.texto.includes('Pago: Efectivo al retirar'),
    'el mensaje trae nombre, retiro y pago');
  ok(e.texto.includes('1 × Combo 1') && e.texto.includes('Combo 8') && e.texto.includes('Opción: Churrasco') && e.texto.includes('Churrasco italiano'),
    'el mensaje trae cada producto y la opción elegida');
  await p.screenshot({ path: require('path').join(require('os').tmpdir(), 'kaos-pedido.png') });

  console.log('4) Solo retiro: la página no ofrece delivery');
  ok(await p.locator('input[name="modo"]').count() === 0, 'no se pregunta retiro o delivery: todos los pedidos son para retirar');
  ok(await p.locator('[data-campo="direccion"], input[name="sector"]').count() === 0, 'no pide dirección de entrega ni sector');
  ok(!/delivery|despacho a domicilio/i.test(await p.locator('[data-pedido]').innerText()), 'el carrito no habla de delivery');
  ok(await pie() === 'Enviar pedido por WhatsApp', 'queda listo para enviar: ' + await pie());

  console.log('5) Fuera de horario');
  const c2 = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/Santiago' });
  await c2.clock.setFixedTime(new Date('2026-11-09T10:00:00Z'));   // lunes 07:00 en Chile: cerrado (abre 09:30)
  const q = await c2.newPage(); vigilar(q, 'cerrado');
  await q.goto(BASE + '/'); await q.waitForTimeout(800);
  ok(!(await q.locator('[data-estado]').count()) && !/abierto|abrimos/i.test(await q.locator('.portada').innerText()), 'a las 07:00 no sale el aviso arriba');
  ok(await q.locator('[data-lista] .estado-pill', { hasText: /cerrado/i }).count() > 0 && !(await q.locator('[data-lista] .agregar').count()), 'y los productos dicen «Cerrado»');
  await c2.close();

  console.log('6) Celular');
  const m = await ctx.newPage(); vigilar(m, 'celular');
  await m.setViewportSize({ width: 390, height: 844 });
  await m.goto(BASE + '/'); await m.waitForTimeout(800);
  ok(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, 'la página no se sale de la pantalla');
  await m.click('.portada-acciones a[href="#pedir"]'); await m.waitForTimeout(1500);
  const [cab2, nav2] = [await m.$eval('.cabecera', e => Math.round(e.getBoundingClientRect().bottom)), await m.$eval('.secciones', e => Math.round(e.getBoundingClientRect().top))];
  ok(Math.abs(cab2 - nav2) <= 2, 'en el celular también (' + cab2 + ' y ' + nav2 + ')');
  await m.screenshot({ path: require('path').join(require('os').tmpdir(), 'kaos-celular.png') });

  console.log('7) El asistente no habla de sushi');
  await m.locator('[data-asis-abrir]').first().click(); await m.waitForTimeout(600);
  ok(await m.locator('[data-asis-saludo]').count() === 0, 'no hay burbuja de saludo: solo el botón «¿Te ayudo?»');
  const chat = await m.locator('[data-asis-cuerpo]').innerText();
  ok(!/sushi|roll|tabla|piezas/i.test(chat), 'la bienvenida no habla de sushi: ' + chat.split('\n')[0]);
  await m.fill('[data-asis-texto]', 'vegetariano'); await m.press('[data-asis-texto]', 'Enter'); await m.waitForTimeout(900);
  const veg = await m.$$eval('[data-asis-cuerpo] .asis-prod', x => x.map(y => y.innerText.split('\n')[0].trim()));
  ok(veg.length > 0 && !veg.some(n => /carne|churrasco|mechada|lomit|pollo|hamburgues|vienesa|tocino|chorrillana/i.test(n)),
    'lo que ofrece como vegetariano no trae carne: ' + veg.join(', '));

  ok(!llamadas.length, 'la página no llama a ningún servidor de pedidos' + (llamadas.length ? ': ' + llamadas.join(', ') : ''));
  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
  await b.close();
  console.log('Todo bien.');
})().catch(e => { console.error(e.message); process.exit(1); });
