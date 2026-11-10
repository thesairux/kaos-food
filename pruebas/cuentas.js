/* Prueba de las cuentas del panel y de la analítica (necesita Playwright): con «node pruebas/servidor.js»
   corriendo, «node pruebas/cuentas.js». El servidor de prueba simula GitHub y la base D1 en memoria. */
const { chromium } = require('playwright');
const BASE = 'http://localhost:8790';
const ok = (c, m) => { if (!c) throw new Error('FALLÓ: ' + m); console.log('  ✓ ' + m); };
const api = async d => { const r = await fetch(BASE + '/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); return { status: r.status, d: await r.json() }; };
const usuario = 'prueba' + Date.now().toString(36);

(async () => {
  const b = await chromium.launch(); const errores = [];
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errores.push(e.message));
  p.on('dialog', d => d.accept());
  const entrar = async (u, c) => {
    await p.goto(BASE + '/admin'); await p.fill('#user', u); await p.fill('#pass', c); await p.click('#login-btn');
    await p.waitForSelector('#editor:not([hidden])', { timeout: 15000 });
  };

  console.log('1) El dueño crea una cuenta');
  await entrar('kaosfood', 'clave-de-prueba-larga');
  await p.click('#btn-cuenta'); await p.waitForSelector('#crear-cuenta');
  await p.fill('#nc-usuario', usuario); await p.fill('#nc-clave', 'corta'); await p.click('#crear-cuenta button[type=submit]');
  ok(/al menos 12/.test(await p.locator('#crear-cuenta .cuenta-msg').innerText()), 'pide contraseñas de 12 caracteres o más');
  await p.fill('#nc-usuario', usuario); await p.fill('#nc-clave', 'clave-de-prueba-1'); await p.click('#crear-cuenta button[type=submit]');
  await p.waitForSelector(`[data-cuenta="${usuario}"]`);
  ok(true, 'la cuenta aparece en la lista');
  const archivo = await (await fetch(BASE + '/__cuentas')).text();
  ok(!archivo.includes('clave-de-prueba-1') && /"hash"/.test(archivo), 'la contraseña se guarda cifrada, nunca en texto');
  await p.click('#cuenta-cerrar'); await p.click('#logout');

  console.log('2) La cuenta entra y crea su código');
  await entrar(usuario, 'clave-de-prueba-1');
  ok((await api({ action: 'crear-cuenta', user: usuario, pass: 'clave-de-prueba-1', usuario: 'otra', clave: 'clave-de-prueba-1' })).d.error === 'permiso', 'una cuenta común no puede crear cuentas');
  await p.click('#btn-cuenta'); await p.click('#codigo-crear'); await p.waitForSelector('#codigo-ver');
  const codigo = await p.locator('#codigo-ver').innerText();
  ok(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){4}$/.test(codigo), 'el código tiene el formato XXXX-XXXX-XXXX-XXXX-XXXX');
  ok(!(await (await fetch(BASE + '/__cuentas')).text()).includes(codigo), 'el código tampoco se guarda en texto');
  await p.click('#cuenta-cerrar'); await p.click('#logout');

  console.log('3) Recuperar el acceso');
  await p.goto(BASE + '/admin'); await p.fill('#user', usuario); await p.click('#forgot');
  ok(await p.locator('#recover-form').isVisible() && (await p.inputValue('#r-user')) === usuario, '«¿Olvidaste tu contraseña?» abre «Recuperar el acceso» con el usuario puesto');
  await p.fill('#r-code', 'AAAA-BBBB-CCCC-DDDD-EEEE'); await p.fill('#r-pass', 'clave-nueva-2345'); await p.fill('#r-pass2', 'clave-nueva-2345');
  await p.click('#recover-btn'); await p.waitForFunction(() => document.querySelector('#recover-msg').textContent);
  ok(/no son correctos/.test(await p.locator('#recover-msg').innerText()), 'un código equivocado no sirve');
  await p.fill('#r-code', codigo.toLowerCase()); await p.click('#recover-btn');
  await p.waitForSelector('#login-form:not([hidden])');
  ok(/tu contraseña cambió/.test(await p.locator('#login-msg').innerText()), 'con el código correcto cambia la contraseña');
  ok((await api({ action: 'recuperar', usuario, codigo, nueva: 'clave-nueva-9999' })).d.error === 'codigo', 'el código sirve una sola vez');
  ok((await api({ action: 'cuenta', user: usuario, pass: 'clave-de-prueba-1' })).status === 401, 'la contraseña vieja ya no entra');
  await p.fill('#pass', 'clave-nueva-2345'); await p.click('#login-btn'); await p.waitForSelector('#editor:not([hidden])');
  ok(true, 'entra con la contraseña nueva');
  ok((await api({ action: 'recuperar', usuario: 'kaosfood', codigo: 'x', nueva: 'clave-nueva-2345' })).d.error === 'principal', 'la cuenta principal no se recupera con código (es la de Vercel)');
  await p.click('#logout');

  console.log('4) El dueño quita la cuenta');
  await entrar('kaosfood', 'clave-de-prueba-larga');
  await p.click('#btn-cuenta'); await p.waitForSelector(`[data-c-borrar="${usuario}"]`);
  await p.click(`[data-c-borrar="${usuario}"]`); await p.click(`[data-c-borrar="${usuario}"]`);
  await p.waitForSelector(`[data-cuenta="${usuario}"]`, { state: 'detached' });
  ok((await api({ action: 'cuenta', user: usuario, pass: 'clave-nueva-2345' })).status === 401, 'la cuenta quitada ya no puede entrar');
  await p.click('#cuenta-cerrar');

  console.log('5) Analítica');
  const antes = (await api({ action: 'estadisticas', user: 'kaosfood', pass: 'clave-de-prueba-larga', dias: 1 })).d.dias[0];
  const cli = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, timezoneId: 'America/Santiago' })).newPage();
  await cli.clock.setFixedTime(new Date('2026-11-09T15:00:00-03:00'));   // un lunes con el local abierto
  await cli.goto(BASE + '/'); await cli.waitForTimeout(400);
  await cli.evaluate(() => document.querySelector('[data-agregar="combo-1"]').click()); await cli.waitForTimeout(300);
  await cli.reload(); await cli.waitForTimeout(400);   // la misma visita no se cuenta dos veces
  await cli.close();
  const despues = (await api({ action: 'estadisticas', user: 'kaosfood', pass: 'clave-de-prueba-larga', dias: 1 })).d;
  const hoy = despues.dias[0];
  ok((hoy.visita || 0) - (antes.visita || 0) === 1, 'cuenta una visita por sesión');
  ok((hoy.agregar || 0) - (antes.agregar || 0) === 1 && despues.agr['combo-1'] >= 1, 'cuenta lo agregado al pedido y qué producto');
  ok((await fetch(BASE + '/api/estadisticas', { method: 'POST', body: JSON.stringify({ e: 'agregar', p: 'no-existe' }) })).status === 400, 'no acepta productos que no están en la carta');
  ok((await api({ action: 'estadisticas', user: 'x', pass: 'y' })).status === 401, 'las estadísticas piden contraseña');
  await p.click('#btn-stats'); await p.waitForSelector('.st-embudo');
  ok(/Visitas/.test(await p.locator('.st-embudo').innerText()) && await p.locator('.st-tile').count() >= 8, 'el panel muestra la analítica básica y la de conversión');

  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
  await b.close();
  console.log('Todo bien.');
})().catch(e => { console.error(e.message); process.exit(1); });
