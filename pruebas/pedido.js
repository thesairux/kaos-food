/* Prueba del pedido por WhatsApp (necesita Playwright): con «node pruebas/servidor.js» corriendo, «node pruebas/pedido.js». */
const { chromium } = require('playwright');
const BASE = 'http://localhost:8790';
const ok = (c, m) => { if (!c) throw new Error('FALLÓ: ' + m); console.log('  ✓ ' + m); };
// Photon simulado: una calle dentro del sector urbano y otra fuera
const PHOTON = { features: [
  { geometry: { coordinates: [-71.2003, -30.6021] }, properties: { name: 'Avenida La Paz', type: 'street', osm_key: 'highway', city: 'Ovalle', district: 'Centro' } },
  { geometry: { coordinates: [-71.3300, -30.4500] }, properties: { name: 'Camino La Paz', type: 'street', osm_key: 'highway', city: 'Sotaquí' } } ] };

(async () => {
  const b = await chromium.launch(); const errores = [], llamadas = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  // jueves a las 15:00 en Ovalle: abierto (lunes a jueves 13:30-22:30)
  await ctx.clock.setFixedTime(new Date('2026-11-05T18:00:00Z'));
  await ctx.route('https://photon.komoot.io/**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(PHOTON) }));
  await ctx.route('https://wa.me/**', r => r.fulfill({ contentType: 'text/html', body: '<p>WhatsApp</p>' }));
  const vigilar = (p, n) => {
    p.on('pageerror', e => errores.push(n + ': ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errores.push(n + ': ' + m.text()); });
    p.on('request', r => { if (r.url().startsWith(BASE + '/api/') && !r.url().includes('/api/estadisticas')) llamadas.push(r.url()); });
  };
  const p = await ctx.newPage(); vigilar(p, 'cliente');
  const sec = async n => { await p.click('[data-seccion="' + (await p.$$eval('[data-secciones] .pildora', (x, n) => x.findIndex(y => y.textContent === n), n)) + '"]'); await p.waitForTimeout(250); };
  const abrirProd = async n => { await p.locator('.tarjeta, .fila', { has: p.locator('.fila-nombre', { hasText: new RegExp('^' + n.replace(/[()&]/g, '\\$&') + '$') }) }).first().locator('button').last().click(); await p.waitForTimeout(250); };
  const marcar = async (g, v) => { await p.locator(`[data-ficha] [data-grupo="${g}"][value="${v}"]`).check({ force: true }); await p.waitForTimeout(80); };
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
  ok((await p.title()).includes('Asian Sushi Ovalle'), 'el título dice Asian Sushi Ovalle');
  ok(await p.locator('.destacado').count() === 1, 'la portada muestra las promos destacadas');
  const secciones = await p.$$eval('[data-secciones] .pildora', x => x.map(y => y.textContent));
  ok(secciones.join(' | ') === 'Tablas | Entrantes | Creación de la casa | Rolls premium | Gohan y sushiburger | Arma tu roll | Extras', 'secciones: ' + secciones.join(' | '));
  ok(!/rinc[oó]n|naranjos|portal/i.test(await p.locator('body').innerText()), 'no queda nada del Rincón del Sushi');
  ok(!(await p.locator('[data-estado]').count()) && !/abierto|cerrado|cerramos/i.test(await p.locator('.portada').innerText()), 'arriba ya no sale «Abierto ahora»');
  ok(await p.locator('[data-lista] .agregar').count() > 0, 'en horario se puede agregar');
  ok(!/picante/i.test(await p.locator('body').innerText()), 'los rolls ya no dicen «Picante»');
  await p.click('.portada-acciones a[href="#pedir"]'); await p.waitForTimeout(1500);
  const alto = async () => [await p.$eval('.cabecera', e => Math.round(e.getBoundingClientRect().bottom)), await p.$eval('.secciones', e => Math.round(e.getBoundingClientRect().top))];
  let [cab, nav] = await alto();
  ok(Math.abs(cab - nav) <= 2, '«Ver la carta» deja las secciones justo bajo la cabecera (' + cab + ' y ' + nav + ')');
  const fotos = await p.$$eval('.tarjeta-foto img', x => x.filter(i => i.complete && i.naturalWidth > 0).length);
  ok(fotos > 0, 'las fotos cargan');

  console.log('2) Se arma el pedido');
  await sec('Tablas'); await abrirProd('Tabla 20 piezas');
  if (await p.locator('[data-ficha][open]').count()) await confirmar();
  await sec('Rolls premium'); await abrirProd('Asian Rolls');
  ok(await botonFicha() === 'Elige salsa incluida', 'en los rolls se elige la salsa incluida');
  await marcar('salsa-incluida', 'teriyaki'); await marcar('ingrediente-extra', 'palta');
  ok(await botonFicha() === 'Agregar por $10.980', 'el ingrediente extra se elige dentro del roll y suma $990: ' + await botonFicha());
  await confirmar();
  await sec('Arma tu roll'); await abrirProd('Arma tu roll con arroz');
  await marcar('ar-envoltura', 'masago'); await marcar('ar-base', 'pulpo');
  await marcar('ar-secundarios-2', 'queso-crema'); await marcar('ar-secundarios-2', 'palta');
  ok(await p.locator('[data-ficha] [data-grupo="ar-secundarios-2"][value="pepino"]').isDisabled(), 'no deja elegir un tercer ingrediente secundario');
  await marcar('rebosar', 'panko'); await marcar('sin-nori', 'sin-nori'); await marcar('salsa-incluida', 'soya');
  ok(await botonFicha() === 'Agregar por $12.270', 'masago +$1.500, pulpo +$3.290, rebosar +$990 y sin nori +$1.000 se suman: ' + await botonFicha());
  await confirmar();
  await sec('Gohan y sushiburger'); await abrirProd('Gohan');
  await marcar('base-2', 'camaron'); await marcar('base-2', 'salmon'); await marcar('preparacion-base', 'rebosado');
  for (const s of ['palta', 'pepino', 'albahaca']) await marcar('secundarios-3', s);
  ok(await p.locator('[data-ficha] [data-grupo="ingrediente-extra"]').count() === 12, 'el gohan también ofrece ingrediente extra');
  await marcar('salsa-incluida', 'soya');
  ok(await botonFicha() === 'Agregar por $7.990', 'el gohan queda en $7.990');
  await confirmar();
  await sec('Extras');
  const extras = await p.$$eval('[data-lista] .fila-nombre', x => x.map(y => y.textContent));
  ok(extras.length && !extras.some(n => /ingrediente extra|rebosar/i.test(n)), 'en Extras ya no salen sueltos «Ingrediente extra» ni «Rebosar ingrediente»');

  console.log('3) Retiro en el local');
  await abrirPedido();
  ok(!(await p.locator('[data-ayuda="nombre"].falta').count()), 'al abrir el carrito no sale en rojo «Escribe tu nombre…»');
  await p.click('[data-pedido-pie] [data-falta]', { force: true }); await p.waitForTimeout(200);
  ok(/escribe tu nombre/i.test(await p.locator('[data-ayuda="nombre"].falta').innerText().catch(() => '')), 'sale solo si intenta enviar sin nombre');
  ok(await p.locator('input[name="sucursal"]').count() === 0, 'no pide elegir sucursal (hay un solo local)');
  await p.fill('[data-campo="nombre"]', 'Ana');
  ok((await p.locator('.retiro-info').innerText()).includes('Sergio Peralta 758'), 'el retiro muestra Sergio Peralta 758');
  ok(await pagos() === 'Efectivo, Transferencia', 'pagos: ' + await pagos());
  await p.locator('input[name="pago"][value="Efectivo"]').check({ force: true }); await p.waitForTimeout(150);
  ok(/Subtotal referencial\s*\$41\.230/.test(await p.locator('[data-pedido-pie]').innerText()), 'subtotal referencial $41.230');
  let e = await enlace();
  ok(e.numero === '56958836237', 'el enlace va al WhatsApp del local (+56 9 5883 6237)');
  ok(e.texto.includes('Nombre: Ana') && e.texto.includes('Modalidad: Retiro en el local (Sergio Peralta 758)') && e.texto.includes('1 × Tabla 20 piezas') && e.texto.includes('Pago: Efectivo al retirar'), 'el mensaje trae nombre, retiro y pago');
  ok(e.texto.includes('Arma tu roll con arroz') && /Masago/.test(e.texto) && /Pulpo/.test(e.texto) && /sin nori/i.test(e.texto) && /Teriyaki/.test(e.texto) && e.texto.includes('Ingrediente extra: Palta +$990') && e.texto.includes('Rebosar el ingrediente base: Rebosado en panko +$990'), 'el mensaje trae lo que se eligió en cada producto');
  await p.screenshot({ path: require('path').join(require('os').tmpdir(), 'asian-pedido.png') });

  console.log('4) Delivery');
  ok((await p.locator('label:has(input[name="modo"][value="delivery"])').innerText()).trim() === 'Delivery · desde $2.500', 'la opción dice «Delivery · desde $2.500»');
  await p.locator('input[name="modo"][value="delivery"]').check({ force: true }); await p.waitForTimeout(200);
  const sectores = await p.$$eval('input[name="sector"]', x => x.map(i => i.closest('label').innerText.replace(/\s+/g, ' ').trim()));
  ok(sectores.length === 3 && /Ovalle.*\$2\.500/.test(sectores[0]) && /Extremo norte.*\$3\.000/.test(sectores[1]) && /Extremo sur.*\$4\.000/.test(sectores[2]), 'sectores del afiche: ' + sectores.join(' | '));
  ok(await pie() === 'Elige tu sector', 'pide el sector antes de enviar');
  await p.locator('input[name="sector"][value="Extremo norte"]').check({ force: true }); await p.waitForTimeout(200);
  ok(!/escribe tu calle/i.test(await p.locator('[data-pedido]').innerText().catch(() => p.locator('body').innerText())), 'ya no dice «Escribe tu calle y elígela en la lista…»');
  ok(await p.locator('[data-ubicacion], [data-marcar-mapa], [data-sugerencias]').count() === 0, 'la dirección se escribe a mano: sin GPS, mapa ni sugerencias');
  await p.locator('[data-campo="direccion"]').pressSequentially('Avenida La Paz 585, Ovalle', { delay: 10 }); await p.waitForTimeout(300);
  const tot = (await p.locator('.totales').innerText()).replace(/\s+/g, ' ');
  ok(tot.includes('Delivery Extremo norte $3.000') && tot.includes('Total referencial $44.230'), 'el delivery se suma al total: ' + tot);
  ok(await pagos() === 'Efectivo, Transferencia', 'pagos en delivery: ' + await pagos());
  e = await enlace();
  ok(e.texto.includes('Modalidad: Delivery') && e.texto.includes('Dirección: Avenida La Paz 585, Ovalle') && e.texto.includes('Pago: Efectivo al recibir') && e.texto.includes('Sector: Extremo norte') && e.texto.includes('Delivery Extremo norte: $3.000') && e.texto.includes('Total referencial: $44.230') && !e.texto.includes('Ubicación:'), 'el mensaje trae la dirección, el sector, el delivery y el total');

  console.log('5) Fuera de horario');
  const c2 = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await c2.clock.setFixedTime(new Date('2026-11-09T13:00:00Z'));   // lunes 10:00: cerrado
  const q = await c2.newPage(); vigilar(q, 'cerrado');
  await q.goto(BASE + '/'); await q.waitForTimeout(800);
  ok(!(await q.locator('[data-estado]').count()) && !/abierto|abrimos/i.test(await q.locator('.portada').innerText()), 'el lunes a las 10:00 tampoco sale el aviso arriba');
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
  await m.screenshot({ path: require('path').join(require('os').tmpdir(), 'asian-celular.png') });

  ok(!llamadas.length, 'la página no llama a ningún servidor de pedidos' + (llamadas.length ? ': ' + llamadas.join(', ') : ''));
  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
  await b.close();
  console.log('Todo bien.');
})().catch(e => { console.error(e.message); process.exit(1); });
