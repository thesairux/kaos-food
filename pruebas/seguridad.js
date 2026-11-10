/* Pruebas de seguridad (hallazgos de la auditoría). Necesita Playwright y, para las partes 2 y 3,
   «node pruebas/servidor.js» corriendo. Uso: «node pruebas/seguridad.js». La parte 1 llama directo a functions/api/. */
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const BASE = 'http://localhost:8790';
const RAIZ = path.join(__dirname, '..');
const ok = (c, m) => { if (!c) throw new Error('FALLÓ: ' + m); console.log('  ✓ ' + m); };
const cartaDe = js => { const ctx = { window: {} }; vm.runInNewContext(js, ctx); return ctx.window.CARTA; };
const ORIGINAL = fs.readFileSync(path.join(RAIZ, 'carta.js'), 'utf8');
const O = cartaDe(ORIGINAL);

/* ---------- 1) API del panel, llamada directa con GitHub simulado ---------- */
async function api() {
  console.log('1) API del panel');
  const PASS = 'clave-de-prueba-larga';
  const ENV = { GITHUB_TOKEN: 'ghp_prueba', ADMIN_PASSWORD: PASS, GITHUB_REPO: 'prueba/asiansushi', GITHUB_BRANCH: 'main' };
  let publicadoAhora = ORIGINAL, respuestaContenido = null, publicado = null;
  const json = (d, st = 200) => new Response(JSON.stringify(d), { status: st, headers: { 'Content-Type': 'application/json' } });
  global.fetch = async (url, o = {}) => {
    url = String(url); const metodo = (o.method || 'GET').toUpperCase(); const cuerpo = o.body ? JSON.parse(o.body) : null;
    if (url.includes('/contents/privado/cuentas.json')) return json({ message: 'Not Found' }, 404);
    if (url.includes('/contents/carta.js')) return json(respuestaContenido || { encoding: 'base64', content: Buffer.from(publicadoAhora).toString('base64') });
    if (url.includes('/git/ref')) return json({ object: { sha: 'cabeza' } });
    if (url.includes('/git/commits/cabeza')) return json({ sha: 'cabeza', tree: { sha: 'arbol' } });
    if (url.includes('/git/trees/arbol')) return json({ tree: [] });
    if (url.includes('/git/blobs') && metodo === 'POST') { if (cuerpo.encoding === 'utf-8') publicado = cuerpo.content; return json({ sha: 'b'.repeat(40) }); }
    if (url.includes('/git/trees') && metodo === 'POST') return json({ sha: 'arbol-nuevo' });
    if (url.includes('/git/commits') && metodo === 'POST') return json({ sha: 'commit-nuevo' });
    if (url.includes('/git/refs/heads/') && metodo === 'PATCH') return json({ ok: true });
    return json({}, 404);
  };
  const { pathToFileURL } = require('url');
  const admin = await import(pathToFileURL(path.join(RAIZ, 'functions', 'api', 'admin.js')).href);
  let ipN = 0;
  const llamar = async (body, headers = {}, ip) => {
    const h = Object.assign({ 'content-type': 'application/json', 'cf-connecting-ip': ip || '10.0.0.' + (++ipN % 250) }, headers);
    const request = new Request('https://sitio.example/api/admin', { method: 'POST', headers: h, body: JSON.stringify(body) });
    const r = await admin.onRequest({ request, env: ENV });
    const t = await r.text();
    return { status: r.status, data: t ? JSON.parse(t) : null };
  };
  const publicar = site => llamar({ user: 'asiansushi', pass: PASS, action: 'publish', site, photos: [] });

  // carta con todo lo que la auditoría encontró
  const mala = JSON.parse(JSON.stringify(O));
  const prod = mala.secciones[0].categorias[0].productos[0];
  prod.unidad = '<img src=x onerror="window.__x=1">'; prod.rolls = '<b>2</b>';
  prod.foto = 'data:image/svg+xml,<svg/><!--");position:fixed;z:"-->';
  const salsa = mala.personalizacion.find(g => g.id === 'salsa-incluida');
  salsa.min = '<img src=x onerror="window.__y=1">'; salsa.max = '9999';
  mala.negocio.facebook = 'javascript:alert(1)'; mala.negocio.mapa = 'javascript:alert(2)';
  mala.tema = { color: '#00ff00', colorDestacado: '#0000ff' };
  let r = await publicar(mala);
  ok(r.status === 200, 'publicar una carta con valores peligrosos responde 200');
  const P = cartaDe(publicado), pp = P.secciones[0].categorias[0].productos[0], ps = P.personalizacion.find(g => g.id === 'salsa-incluida');
  ok(pp.unidad === undefined && pp.rolls === undefined && pp.foto === undefined, 'se descartan unidad con HTML, rolls que no es número y foto data:');
  ok(ps.min === 0 && ps.max === 50, 'min/max quedan como números acotados (' + ps.min + ', ' + ps.max + ')');
  ok(P.negocio.facebook === undefined && P.negocio.mapa === undefined, 'se descartan enlaces javascript:');
  ok(JSON.stringify(P.tema) === JSON.stringify(O.tema), 'el tema sigue siendo el publicado');

  // __proto__ para cambiar el nombre
  const proto = JSON.parse(JSON.stringify(O)); delete proto.negocio;
  const conProto = JSON.parse(JSON.stringify(proto).replace(/^\{/, '{"__proto__":{"negocio":{"nombre":"OTRO"}},'));
  r = await publicar(conProto);
  const P2 = cartaDe(publicado);
  ok(r.status === 200 && !publicado.includes('__proto__') && P2.negocio.nombre === O.negocio.nombre, '«__proto__» no cambia el nombre del local');

  // lo publicado no se puede leer: no se publica (falla cerrado)
  publicadoAhora = ORIGINAL.replace(/\n\};\s*$/, ',\n};\n');   // coma final: JS válido, JSON no
  vm.runInNewContext(publicadoAhora, { window: {} });
  publicado = null; r = await publicar(JSON.parse(JSON.stringify(O)));
  ok(r.status === 400 && r.data.error === 'carta' && publicado === null, 'carta.js con coma final → 400 «carta», sin publicar');
  publicadoAhora = ORIGINAL; respuestaContenido = { encoding: 'none', content: '' };
  r = await publicar(JSON.parse(JSON.stringify(O)));
  ok(r.status === 400 && r.data.error === 'carta', 'archivo de más de 1 MB (GitHub sin contenido) → 400 «carta»');
  respuestaContenido = null;
  const grande = JSON.parse(JSON.stringify(O)); grande.secciones[0].categorias[0].productos[0].detalle = '€'.repeat(360000);
  r = await publicar(grande);
  ok(r.status === 400 && r.data.error === 'datos', 'carta de más de 900 KB (en bytes) → 400 «datos»');

  // origen y tipo
  r = await llamar({ user: 'asiansushi', pass: PASS, action: 'login' }, { 'sec-fetch-site': 'cross-site', origin: 'https://otro.example' });
  ok(r.status === 403, 'petición desde otro sitio → 403');
  for (const nombre of ['asistente', 'estadisticas']) {
    const m = await import(pathToFileURL(path.join(RAIZ, 'functions', 'api', nombre + '.js')).href);
    const request = new Request('https://sitio.example/api/' + nombre, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site', origin: 'https://otro.example' }, body: '{}' });
    const rr = await (m.onRequestPost || m.onRequest)({ request, env: { ANTHROPIC_API_KEY: 'x', DB: { prepare() {} } }, waitUntil() {} });
    ok(rr.status === 403, '/api/' + nombre + ' desde otro sitio → 403');
  }
  r = await llamar({ user: 'asiansushi', pass: PASS, action: 'login' }, { 'content-type': 'text/plain' });
  ok(r.status === 415, 'cuerpo text/plain → 415');
  r = await llamar({ user: 'asiansushi', pass: PASS, action: 'login' }, { origin: 'https://sitio.example', 'sec-fetch-site': 'same-origin' });
  ok(r.status === 200, 'desde la misma página → 200');

  // límite de intentos por IP
  const res = await Promise.all(Array.from({ length: 25 }, (_, i) => llamar({ user: 'asiansushi', pass: 'mala-' + i }, {}, '10.9.9.9')));
  ok(res.filter(x => x.status === 429).length === 5 && res.filter(x => x.status === 401).length === 20, 'después de 20 intentos desde una IP → 429');
  ENV.ADMIN_PASSWORD = 'corta';

  // contraseña principal corta
  r = await llamar({ user: 'asiansushi', pass: 'corta', action: 'login' });
  ok(r.status === 500 && r.data.error === 'clave-principal-corta', 'contraseña principal de menos de 12 caracteres → el panel no funciona');
  ENV.ADMIN_PASSWORD = PASS;
}

/* ---------- 2) Página: aunque la carta traiga valores peligrosos, no se ejecutan ---------- */
async function pagina(b) {
  console.log('2) Página');
  const mala = JSON.parse(JSON.stringify(O));
  const prod = mala.secciones[0].categorias[0].productos[0];
  Object.assign(prod, { personalizar: ['salsa-incluida'], rolls: 2, unidad: '<img src=x onerror="window.__x1=1">',
    foto: 'data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\'/><!--");position:fixed;inset:0;z-index:99;x:url("-->' });
  mala.personalizacion.find(g => g.id === 'salsa-incluida').min = '<img src=x onerror="window.__x2=1">';
  mala.negocio.facebook = 'javascript:window.__x3=1';
  const js = 'window.CARTA = ' + JSON.stringify(mala) + ';';
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.clock.setFixedTime(new Date('2026-11-05T18:00:00Z'));
  await ctx.route(BASE + '/carta.js', r => r.fulfill({ contentType: 'text/javascript', body: js }));
  await ctx.route('https://wa.me/**', r => r.fulfill({ contentType: 'text/html', body: '<p>WhatsApp</p>' }));
  const p = await ctx.newPage();
  await p.goto(BASE + '/'); await p.waitForTimeout(800);
  await p.locator('[data-agregar="' + prod.id + '"]').first().click({ force: true }); await p.waitForTimeout(500);
  const marcas = await p.evaluate(() => [window.__x1, window.__x2, window.__x3]);
  ok(marcas.every(m => m === undefined), 'unidad y min con HTML no ejecutan nada en la ficha');
  ok(await p.locator('[data-ficha] img[onerror]').count() === 0, 'la ficha no tiene imágenes inyectadas');
  const pos = await p.$eval('[data-ficha] .ficha-foto', e => getComputedStyle(e).position).catch(() => 'sin foto');
  ok(pos !== 'fixed', 'la foto data: no cambia el estilo de la ficha (' + pos + ')');
  ok(await p.locator('a[data-facebook]').evaluate(a => a.hidden || !/^javascript:/i.test(a.getAttribute('href'))), 'el enlace javascript: de Facebook no se usa');
  await ctx.close();
}

/* ---------- 3) Panel: un nombre de grupo con HTML no se ejecuta, y la contraseña no queda en el formulario ---------- */
async function panel(b) {
  console.log('3) Panel');
  const mala = JSON.parse(JSON.stringify(O));
  mala.personalizacion[0].nombre = 'Grupo<img src=x onerror="window.__p=1">';
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.route(BASE + '/api/admin', r => r.request().method() === 'POST'
    ? r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, site: mala }) }) : r.continue());
  const p = await ctx.newPage();
  await p.goto(BASE + '/admin');
  await p.fill('#user', 'asiansushi'); await p.fill('#pass', 'clave-de-prueba-larga'); await p.click('#login-btn');
  await p.waitForSelector('#editor:not([hidden])'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => window.__p) === undefined, 'el nombre de grupo con HTML no se ejecuta al entrar');
  ok((await p.locator('#groups [data-group="armado"] summary small').textContent()).includes('<img'), 'el resumen lo muestra como texto');
  ok(await p.inputValue('#pass') === '', 'la contraseña no queda escrita en el formulario');
  ok(await p.getAttribute('#login-form', 'method') === 'post', 'el formulario de ingreso nunca manda la contraseña en la URL');
  await ctx.close();
}

(async () => {
  await api();
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  try { await pagina(b); await panel(b); } finally { await b.close(); }
  console.log('Todo bien.');
})().catch(e => { console.error(e.message); process.exit(1); });
