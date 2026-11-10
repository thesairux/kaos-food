/* Prueba del panel /admin (necesita Playwright): con «node pruebas/servidor.js» corriendo, «node pruebas/panel.js».
   Revisa Stock y Promos, y que «Publicar» guarde lo que se cambió (el servidor de prueba no toca carta.js). */
const { chromium } = require('playwright');
const BASE = 'http://localhost:8790';
const ok = (c, m) => { if (!c) throw new Error('FALLÓ: ' + m); console.log('  ✓ ' + m); };

(async () => {
  const b = await chromium.launch(); const errores = [];
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.clock.setFixedTime(new Date('2026-11-05T18:00:00Z'));   // jueves 15:00: abierto
  const p = await ctx.newPage();
  p.on('pageerror', e => errores.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errores.push(m.text()); });
  p.on('dialog', d => d.accept());
  const pagina = () => p.frameLocator('#frame');

  console.log('1) Entrar');
  await p.goto(BASE + '/admin');
  await p.fill('#user', 'kaosfood'); await p.fill('#pass', 'clave-de-prueba-larga'); await p.click('#login-btn');
  await p.waitForSelector('#editor:not([hidden])'); await p.waitForSelector('#loading[hidden]', { state: 'attached' }); await p.waitForTimeout(800);
  ok(await p.locator('#btn-stock').isVisible() && await p.locator('#btn-promos').isVisible(), 'la barra tiene «Stock» y «Promos»');
  ok(await p.locator('#btn-pedidos, #pedidos').count() === 0, 'ya no está la sección de pedidos');

  console.log('2) Todas las opciones');
  await p.click('#btn-options'); await p.waitForTimeout(300);
  const grupos = await p.$$eval('#groups > .group > summary strong', x => x.map(y => y.textContent));
  ok(grupos.join(' | ') === 'Stock | Promos | Cupones | Carta y precios | Local y WhatsApp | Horario | Opciones para elegir', 'orden: ' + grupos.join(' | '));
  ok(await p.locator('#groups [data-path^="textos."], #groups [data-path^="tema."], #groups input[type="color"], #groups [data-path="negocio.nombre"]').count() === 0,
    'no se pueden cambiar textos de la página, colores ni el nombre del local');
  ok(await p.locator('#groups .avanzado').innerText() === 'MÁS OPCIONES' || /más opciones/i.test(await p.locator('#groups .avanzado').innerText()), 'lo avanzado queda abajo, en «Más opciones»');
  ok(await p.locator('#groups [data-group="negocio"] [data-path^="negocio.sectoresDelivery."][data-path$=".precio"]').count() === 0
    && await p.locator('#groups [data-group="negocio"] [data-action="add-sector"]').count() === 1,
    'el local es solo retiro: no hay sectores de delivery cargados y se puede agregar uno');
  ok(await p.locator('#groups [data-group="promos"] [data-producto]').count() === 7, 'el panel toma «Promos con lata» como la sección de promos, con sus 7 promos');
  await p.click('#drawer-close'); await p.waitForTimeout(300);

  console.log('3) Stock');
  await p.click('#btn-stock'); await p.waitForTimeout(300);
  ok(await p.locator('#drawer-title').textContent() === 'Stock', 'el botón abre «Stock»');
  ok((await p.locator('[data-stock-resumen]').innerText()).includes('Todo disponible'), 'arriba dice si hay algo agotado');
  await p.fill('[data-stock-buscar]', 'empanada'); await p.waitForTimeout(150);
  const visibles = await p.$$eval('.stock-row:not([hidden]) .n', x => x.map(y => y.textContent));
  ok(visibles.length > 0 && visibles.every(n => /empanada/i.test(n)), 'el buscador filtra: ' + visibles.join(', '));
  const fila = p.locator('.stock-row:not([hidden])').first();
  const nombre = await fila.locator('.n').innerText();
  await fila.click(); await p.waitForTimeout(400);
  ok(await fila.evaluate(x => x.classList.contains('agotado')) && (await fila.innerText()).includes('Agotado'), `«${nombre}» queda agotado`);
  ok((await p.locator('[data-stock-resumen]').innerText()).includes(nombre), 'el resumen lo muestra como agotado');
  // agotar un ingrediente solo aplica si la carta usa grupos de personalización (esta no)
  await p.fill('[data-stock-buscar]', ''); await p.waitForTimeout(150);
  const grupos2 = await p.locator('.stock-cat:not([hidden]) h4').allInnerTexts();
  ok(grupos2.length > 0, 'el stock lista las categorías de la carta: ' + grupos2.slice(0, 3).join(', ') + '…');
  await p.click('#drawer-close'); await p.waitForTimeout(500);
  const fr = pagina();
  await fr.locator('.pildora', { hasText: /^para picar$/i }).first().click(); await p.waitForTimeout(400);
  const enPagina = fr.locator('.tarjeta, .fila', { has: fr.locator('.fila-nombre', { hasText: nombre }) }).first();
  ok(/agotado/i.test(await enPagina.innerText()), 'en la página se ve «Agotado» al tiro');

  console.log('4) Promos');
  await p.click('#btn-promos'); await p.waitForTimeout(300);
  ok(await p.locator('#drawer-title').textContent() === 'Promos', 'el botón abre «Promos»');
  const promosAntes = await p.locator('#groups [data-producto]').count();
  ok(promosAntes === 7, 'parte con las 7 promos del local');
  await p.locator('[data-action="add-promo"]').first().click(); await p.waitForTimeout(300);
  ok(await p.locator('#groups [data-producto]').count() === promosAntes + 1, '«Agregar promo» suma una promo nueva');
  const nuevaId = await p.locator('#groups [data-producto]').filter({ has: p.locator('strong', { hasText: 'Promo nueva' }) }).first().getAttribute('data-producto');
  const nueva = p.locator(`#groups [data-producto="${nuevaId}"]`);
  await nueva.locator('[data-path$=".nombre"]').fill('Promo viernes: completo + papas');
  await nueva.locator('[data-path$=".precio"]').fill('5.990');
  await nueva.locator('[data-path$=".detalle"]').fill('Un completo, papas medianas y bebida en lata.');
  // un día que no sea hoy, para que la página la muestre como «Solo los …»
  const hoy = new Intl.DateTimeFormat('es-CL', { weekday: 'long', timeZone: 'America/Santiago' }).format(new Date()).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const dia = hoy === 'lunes' ? 'martes' : 'lunes';
  await nueva.locator(`[data-dias][value="${dia}"]`).check(); await p.waitForTimeout(400);
  ok(await nueva.locator('strong').innerText() === 'Promo viernes: completo + papas', 'el título de la promo cambia al escribir');
  ok(await nueva.locator('details.mas').evaluate(d => !d.open), 'lo que se usa poco queda en «Más opciones», cerrado');
  // un precio de la carta
  await p.click('#btn-options'); await p.waitForTimeout(300);
  await p.click('#groups [data-group="carta"] > summary'); await p.waitForTimeout(300);
  const primera = p.locator('#groups [data-group="carta"] [data-producto="combo-1"]');
  const precioAntes = await primera.locator('[data-path$=".precio"]').inputValue();
  await primera.locator('[data-path$=".precio"]').fill('5990'); await p.waitForTimeout(400);
  await p.click('#drawer-close'); await p.waitForTimeout(500);
  await fr.locator('.pildora', { hasText: /^promos con lata$/i }).first().click(); await p.waitForTimeout(400);
  const textoPromos = await fr.locator('[data-lista]').innerText().catch(async () => await fr.locator('body').innerText());
  ok(/promo viernes: completo \+ papas/i.test(textoPromos) && textoPromos.includes('$5.990'), 'la promo nueva aparece en la página con su precio');
  ok(new RegExp('solo los ' + dia, 'i').test(textoPromos), 'y dice que es solo los ' + dia);

  console.log('5) Desde la página');
  ok(await fr.locator('[contenteditable]').count() === 0, 'los textos de la página no se pueden escribir encima');
  const chips = await fr.locator('.editar-chip').allInnerTexts();
  ok(chips.length && !chips.some(t => /portada|pasos|textos|pie de/i.test(t)), 'los botones «Editar» son solo de carta, promos y datos del local: ' + chips.join(', '));
  await fr.locator('.pildora', { hasText: /^combos$/i }).first().click(); await p.waitForTimeout(400);
  await fr.locator('.tarjeta .agregar, .fila .agregar').first().click({ force: true }).catch(() => {});
  await p.waitForTimeout(500);
  ok(await p.locator('#drawer-title').textContent() === 'Carta y precios', 'el + de un producto en la página abre «Carta y precios»');
  await p.click('#drawer-close'); await p.waitForTimeout(300);

  console.log('6) Publicar');
  await p.click('#btn-publish'); await p.waitForTimeout(1500);
  ok((await p.locator('#status').innerText()).includes('Publicado'), 'se publica');
  const js = await (await fetch(BASE + '/__publicado')).text();
  global.window = {}; eval(js); const C = window.CARTA;
  const todos = C.secciones.flatMap(s => s.categorias.flatMap(c => c.productos));
  const pv = todos.find(x => x.nombre === 'Promo viernes: completo + papas');
  ok(pv && pv.precio === 5990 && JSON.stringify(pv.dias) === JSON.stringify([dia]) && pv.destacado === true, 'la promo nueva queda guardada con precio, día y portada');
  ok(todos.find(x => x.id === 'combo-1').precio === 5990, `el precio cambiado queda guardado (antes ${precioAntes})`);
  ok(todos.find(x => x.nombre === nombre).disponible === false, `«${nombre}» queda guardado como agotado`);
  ok(C.secciones.find(x => x.nombre === 'Promos con lata').promos === true, 'la sección de promos queda marcada');
  ok(C.negocio.sectoresDelivery === undefined && C.negocio.soloRetiro === true, 'sigue siendo solo retiro, sin sectores de delivery');
  ok(C.negocio.nombre === 'Kaos Food' && C.negocio.whatsapp === '56934829829', 'los datos del local quedan iguales');
  global.window = {}; eval(require('fs').readFileSync(require('path').join(__dirname, '..', 'carta.js'), 'utf8')); const O = window.CARTA;
  ok(JSON.stringify(C.textos) === JSON.stringify(O.textos) && JSON.stringify(C.tema) === JSON.stringify(O.tema), 'los textos y colores de la página quedan como estaban');
  // aunque alguien mande otro diseño directo al servidor, se mantiene el publicado
  const trucho = JSON.parse(JSON.stringify(C));
  trucho.tema = { color: '#0000ff', colorDestacado: '#00ffff' }; trucho.textos.portada.titulo = 'Otro título'; trucho.negocio.nombre = 'Otro local';
  trucho.secciones[1].categorias[0].productos[0].precio = 11990;
  const r = await fetch(BASE + '/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: 'kaosfood', pass: 'clave-de-prueba-larga', action: 'publish', site: trucho, photos: [] }) });
  global.window = {}; eval(await (await fetch(BASE + '/__publicado')).text()); const T = window.CARTA;
  ok(r.ok && JSON.stringify(T.tema) === JSON.stringify(O.tema) && T.textos.portada.titulo === O.textos.portada.titulo && T.negocio.nombre === O.negocio.nombre,
    'el servidor no deja cambiar colores, textos ni nombre aunque se lo manden directo');
  ok(T.secciones[1].categorias[0].productos[0].precio === 11990, 'pero sí guarda los cambios de la carta');

  console.log('7) Celular');
  const m = await ctx.newPage(); m.on('pageerror', e => errores.push('celular: ' + e.message));
  await m.setViewportSize({ width: 390, height: 844 });
  await m.goto(BASE + '/admin');
  await m.fill('#user', 'kaosfood'); await m.fill('#pass', 'clave-de-prueba-larga'); await m.click('#login-btn');
  await m.waitForSelector('#editor:not([hidden])'); await m.waitForTimeout(800);
  ok(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, 'la barra cabe en el celular');
  await m.click('#btn-stock'); await m.waitForTimeout(500);
  ok(await m.evaluate(() => { const d = document.querySelector('#drawer-body'); return d.scrollWidth <= d.clientWidth; }), 'el stock cabe en el celular');
  await m.screenshot({ path: require('path').join(require('os').tmpdir(), 'panel-stock-celular.png') });
  await m.click('#drawer-close'); await m.waitForTimeout(400);
  await m.click('#btn-promos'); await m.waitForTimeout(500);
  await m.screenshot({ path: require('path').join(require('os').tmpdir(), 'panel-promos-celular.png') });

  await p.click('#btn-stock'); await p.waitForTimeout(400);
  await p.screenshot({ path: require('path').join(require('os').tmpdir(), 'panel-stock.png') });
  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
  await b.close();
  console.log('Todo bien.');
})().catch(e => { console.error(e.message); process.exit(1); });
