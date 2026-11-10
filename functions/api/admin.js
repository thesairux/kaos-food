/*
  Panel de administración de la página: recibe los cambios y los guarda en GitHub; maneja las cuentas
  del panel y lee las estadísticas.

  Se configura en las variables del proyecto (Cloudflare: Settings → Variables and Secrets;
  Vercel: Settings → Environment Variables):
    GITHUB_TOKEN    (obligatoria, como «Secret») clave de GitHub con permiso "Contents: Read and write"
                    sobre el repositorio de la página. Nunca se envía al navegador.
    ADMIN_PASSWORD  (obligatoria, como «Secret») contraseña de la cuenta principal del panel, de 12 caracteres
                    o más. No hay contraseña de fábrica, para que cada cliente que use esta plantilla tenga la suya.
    GITHUB_REPO     "usuario/repositorio" de la página en GitHub (obligatoria en Cloudflare; Vercel lo sabe solo).
    ADMIN_USER      (opcional) usuario de la cuenta principal. Si no existe: kaosfood
    GITHUB_BRANCH   (opcional) rama donde se guardan los cambios. Si no existe: la rama publicada, o main
  Para las estadísticas: en Cloudflare una base D1 con el nombre DB; en Vercel, Upstash for Redis (Storage).
*/
import { json, sleep, ipDe, mismoSitio, leerJson, aBase64, deBase64, aHex, deHex, igualSeguro, sha256Hex, fechaChile, limitador } from "../../lib/comun.js";
import { hayBase, leer as leerEstadisticas } from "../../lib/estadisticas-db.js";

// Las variables del proyecto llegan con cada pedido; aquí quedan a mano para las funciones de abajo.
let ENV = {};

const DEFAULT_USER = "kaosfood";
const CONTENT_FILE = "carta.js";
const MAX_PHOTO_BYTES = 3.5 * 1024 * 1024;
const MAX_SITE_CHARS = 400000;
const MAX_SITE_BYTES = 900 * 1024;     // la API de contenidos de GitHub entrega el archivo completo solo bajo 1 MB
const MIN_PASSWORD = 12;
const FOTO_CARTA = /^(img\/carta\/[\w.-]+\.webp|fotos\/[a-z0-9-]{4,40}\.jpg)$/;
const PHOTO_PATH = /^fotos\/[a-z0-9-]{4,40}\.jpg$/;
const HEADER = `/*
  CARTA
  =====
  Lo más fácil es editarla desde el panel: tu-pagina/admin
  También se puede editar aquí: los precios van sin punto ni signo (14500), el horario como
  "14:00-23:00" o "cerrado", los colores como "#d01c23", y cada elemento de una lista va
  separado por una coma. La explicación completa está en el README del repositorio.
*/
`;

/* ---------- utilidades ---------- */
function checkCredentials(user, pass) {
  if (typeof user !== "string" || typeof pass !== "string" || !user || !pass) return false;
  const expectedUser = (ENV.ADMIN_USER || DEFAULT_USER).toLowerCase();
  const userOk = igualSeguro(user.trim().toLowerCase(), expectedUser);
  const passOk = igualSeguro(pass, ENV.ADMIN_PASSWORD || "");
  return userOk && passOk && !!ENV.ADMIN_PASSWORD;
}

/* ---------- GitHub ---------- */
// Al pegar la clave en el panel del hosting es fácil que quede un espacio o un salto de línea: se limpian.
function token() {
  return (ENV.GITHUB_TOKEN || "").trim();
}
function plataforma() { return ENV.PLATAFORMA || "cloudflare"; }
function repo() {
  const full = (ENV.GITHUB_REPO || "thesairux/kaos-food").trim();
  return { full, branch: (ENV.GITHUB_BRANCH || ENV.CF_PAGES_BRANCH || "main").trim() };
}
async function gh(path, opts = {}) {
  const r = repo();
  const res = await fetch(`https://api.github.com/repos/${r.full}${path}`, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "panel-pagina",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.body ? { "Content-Type": "application/json" } : {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!res.ok) {
    const err = new Error(`GitHub ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

/* carta.js trae un comentario arriba y luego "window.CARTA = { … };" */
const sinProto = (k, v) => (k === "__proto__" ? undefined : v);
async function loadSite() {
  let f;
  try {
    f = await gh(`/contents/${CONTENT_FILE}?ref=${encodeURIComponent(repo().branch)}`);
  } catch (e) {
    if (e.status === 404) return null;   // todavía no hay carta publicada
    throw e;
  }
  // si no se puede leer lo publicado (archivo muy grande, o editado a mano y ya no es JSON estricto)
  // no se publica: sin lo publicado no se puede conservar el diseño
  if (!f || f.encoding !== "base64" || !f.content) throw cliente("carta");
  try {
    const text = deBase64(f.content);
    const start = text.indexOf("{", text.indexOf("window.CARTA"));
    const site = JSON.parse(text.slice(start, text.lastIndexOf("}") + 1), sinProto);
    if (!site || typeof site !== "object" || Array.isArray(site)) throw new Error("carta");
    return site;
  } catch (e) {
    throw cliente("carta");
  }
}

async function uploadPhoto(data) {
  if (typeof data !== "string") throw Object.assign(new Error("foto"), { client: "foto" });
  let inicio = "";
  try { inicio = atob(data.slice(0, 8)); } catch (e) { inicio = ""; }
  const isJpeg = inicio.charCodeAt(0) === 0xff && inicio.charCodeAt(1) === 0xd8 && inicio.charCodeAt(2) === 0xff;
  const largo = Math.floor(data.length * 3 / 4);
  if (!isJpeg || largo > MAX_PHOTO_BYTES) throw Object.assign(new Error("foto"), { client: "foto" });
  const blob = await gh("/git/blobs", { method: "POST", body: { content: data, encoding: "base64" } });
  return blob.sha;
}

/* Fotos subidas desde el panel que la carta usa */
function usedPhotos(site) {
  const used = new Set();
  (Array.isArray(site.secciones) ? site.secciones : []).forEach(sec => {
    (sec && Array.isArray(sec.categorias) ? sec.categorias : []).forEach(cat => {
      (cat && Array.isArray(cat.productos) ? cat.productos : []).forEach(p => {
        if (p && typeof p.foto === "string" && p.foto.startsWith("fotos/")) used.add(p.foto);
      });
    });
  });
  return used;
}

/* Lo estético de la página no se cambia desde el panel: colores, textos de cada parte y nombre del local
   quedan como están publicados. El panel maneja la carta, el stock, las promos y los datos del local. */
function mantenerDiseno(site, actual) {
  ["tema", "textos"].forEach(k => {
    if (actual && actual[k] !== undefined) site[k] = actual[k];
    else delete site[k];
  });
  if (!site.negocio || typeof site.negocio !== "object" || Array.isArray(site.negocio)) site.negocio = {};
  if (actual && actual.negocio && typeof actual.negocio.nombre === "string") site.negocio.nombre = actual.negocio.nombre;
  else delete site.negocio.nombre;
}

/* La carta que manda el panel se limpia antes de publicarla: la página la pinta y no debe poder
   traer código, enlaces raros ni valores que cambien el diseño. */
const lista = v => (Array.isArray(v) ? v : []);
const objeto = v => v && typeof v === "object" && !Array.isArray(v);
const httpsOk = v => typeof v === "string" && /^https:\/\//i.test(v.trim());
function entero(v, def, min, max) { const n = Math.floor(Number(v)); return Math.min(max, Math.max(min, Number.isFinite(n) ? n : def)); }
function limpiarCarta(site) {
  site = JSON.parse(JSON.stringify(site), sinProto);
  if (!objeto(site) || !Array.isArray(site.secciones)) throw cliente("datos");
  const n = objeto(site.negocio) ? site.negocio : (site.negocio = {});
  ["facebook", "mapa"].forEach(k => { if (n[k] != null && !httpsOk(n[k])) delete n[k]; });
  lista(n.sucursales).forEach(x => { if (objeto(x) && x.mapa != null && !httpsOk(x.mapa)) delete x.mapa; });
  // apps de delivery: se quedan solo las que traen nombre y una dirección https
  if (n.appsDelivery != null) {
    n.appsDelivery = lista(n.appsDelivery)
      .filter(x => objeto(x) && typeof x.nombre === "string" && x.nombre.trim() && httpsOk(x.url))
      .map(x => ({ nombre: x.nombre.trim().slice(0, 40), url: x.url.trim() }));
    if (!n.appsDelivery.length) delete n.appsDelivery;
  }
  site.secciones.forEach(sec => lista(sec && sec.categorias).forEach(cat => lista(cat && cat.productos).forEach(p => {
    if (!objeto(p)) return;
    if (p.unidad != null && !(typeof p.unidad === "string" && /^[\p{L} ]{1,20}$/u.test(p.unidad))) delete p.unidad;
    if (p.rolls != null && !Array.isArray(p.rolls)) {
      if (typeof p.rolls === "number" && p.rolls > 0) p.rolls = entero(p.rolls, 1, 1, 30); else delete p.rolls;
    }
    if (p.foto != null && !(typeof p.foto === "string" && FOTO_CARTA.test(p.foto))) delete p.foto;
  })));
  lista(site.personalizacion).forEach(g => {
    if (!objeto(g)) return;
    if (g.min != null) g.min = entero(g.min, 0, 0, 50);
    if (g.max != null) g.max = entero(g.max, 1, 1, 50);
    lista(g.opciones).forEach(o => {
      if (objeto(o) && objeto(o.suma)) Object.keys(o.suma).forEach(k => { o.suma[k] = entero(o.suma[k], 0, 0, 50); });
    });
  });
  return site;
}

async function publish(site, photos) {
  if (!site || typeof site !== "object" || Array.isArray(site) || !Array.isArray(site.secciones)) {
    throw Object.assign(new Error("site"), { client: "datos" });
  }
  site = limpiarCarta(site);
  mantenerDiseno(site, await loadSite());
  const json = JSON.stringify(site, null, 2);
  if (json.length > MAX_SITE_CHARS) throw Object.assign(new Error("site"), { client: "datos" });
  const list = (Array.isArray(photos) ? photos : []).filter(p =>
    p && typeof p.path === "string" && PHOTO_PATH.test(p.path) && typeof p.sha === "string" && /^[0-9a-f]{40}$/.test(p.sha));
  const used = usedPhotos(site);
  const content = HEADER + "window.CARTA = " + json + ";\n";
  if (new TextEncoder().encode(content).length > MAX_SITE_BYTES) throw Object.assign(new Error("site"), { client: "datos" });
  const branch = encodeURIComponent(repo().branch);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ref = await gh(`/git/ref/heads/${branch}`);
      const headSha = ref.object.sha;
      const head = await gh(`/git/commits/${headSha}`);
      const entries = list.filter(p => used.has(p.path)).map(p => ({ path: p.path, mode: "100644", type: "blob", sha: p.sha }));
      const cblob = await gh("/git/blobs", { method: "POST", body: { content, encoding: "utf-8" } });
      entries.push({ path: CONTENT_FILE, mode: "100644", type: "blob", sha: cblob.sha });
      // fotos subidas desde el panel que ya no aparecen en la carta: se borran del repositorio
      const tree = await gh(`/git/trees/${head.tree.sha}?recursive=1`);
      (tree.tree || []).forEach(t => {
        if (t.type === "blob" && t.path.startsWith("fotos/") && !used.has(t.path)) {
          entries.push({ path: t.path, mode: "100644", type: "blob", sha: null });
        }
      });
      const newTree = await gh("/git/trees", { method: "POST", body: { base_tree: head.tree.sha, tree: entries } });
      const commit = await gh("/git/commits", { method: "POST", body: { message: "Cambios desde el panel de la página", tree: newTree.sha, parents: [headSha] } });
      await gh(`/git/refs/heads/${branch}`, { method: "PATCH", body: { sha: commit.sha } });
      return;
    } catch (e) {
      if (attempt === 0 && (e.status === 409 || e.status === 422)) continue; // la rama cambió: se intenta otra vez
      throw e;
    }
  }
}

/* ---------- cuentas del panel ----------
   La cuenta principal (dueño) es ADMIN_USER / ADMIN_PASSWORD de las variables del proyecto: es la llave maestra.
   El dueño crea las demás cuentas desde el panel («Cuenta»). Se guardan en privado/cuentas.json del
   repositorio, con la contraseña y el código de recuperación cifrados (nunca en texto). Ese archivo no se
   publica en la página (herramientas/construir.sh no lo copia) y el servidor lo lee por GitHub. */
const CUENTAS_FILE = "privado/cuentas.json";
const USUARIO_OK = /^[a-z0-9._-]{3,30}$/;
const MIN_CLAVE = 12;
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sin 0/O ni 1/I, para que no se confundan

function cliente(codigo, status) { return Object.assign(new Error(codigo), { client: codigo, httpStatus: status || 400 }); }
// PBKDF2-SHA256 con sal propia por cuenta (lo que trae Cloudflare). 30.000 vueltas toman ~4 ms: cabe en los
// 10 ms de procesador por pedido del plan gratis. Con el plan pagado de Workers se puede subir (hasta 100.000);
// cada cuenta guarda sus vueltas, así que las antiguas siguen funcionando.
const VUELTAS = 30000;
async function derivar(clave, salHex, vueltas) {
  const llave = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(clave)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: deHex(salHex), iterations: vueltas }, llave, 256);
  return aHex(bits);
}
function azarHex(n) { return aHex(crypto.getRandomValues(new Uint8Array(n))); }
async function cifrarClave(clave) {
  const sal = azarHex(16);
  return { sal, vueltas: VUELTAS, hash: await derivar(clave, sal, VUELTAS) };
}
const SAL_FALSA = azarHex(16);
async function claveCorrecta(c, clave) {
  // sin cuenta igual se calcula, para que no se note por el tiempo si el usuario existe
  const h = await derivar(clave, c && c.sal ? c.sal : SAL_FALSA, c && c.vueltas ? c.vueltas : VUELTAS);
  if (!c || !c.hash) return false;
  return igualSeguro(h, c.hash);
}
function nuevoCodigo() {
  const b = crypto.getRandomValues(new Uint8Array(20));
  let s = "";
  for (let i = 0; i < 20; i++) { s += ALFABETO[b[i] % 32]; if (i % 4 === 3 && i < 19) s += "-"; }
  return s;
}
function hashCodigo(c) {
  return sha256Hex("codigo:" + String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, ""));
}
function revisarClave(clave) {
  if (typeof clave !== "string" || clave.length < MIN_CLAVE) throw cliente("clave-corta");
  if (clave.length > 200) throw cliente("datos");
}
function usuarioPrincipal() { return (ENV.ADMIN_USER || DEFAULT_USER).toLowerCase(); }

let cacheCuentas = null;   // { datos, sha, t }
async function leerCuentas(fresco) {
  if (!fresco && cacheCuentas && Date.now() - cacheCuentas.t < 30000) return cacheCuentas;
  try {
    const f = await gh(`/contents/${CUENTAS_FILE}?ref=${encodeURIComponent(repo().branch)}`);
    const datos = JSON.parse(deBase64(f.content));
    if (!Array.isArray(datos.cuentas)) datos.cuentas = [];
    cacheCuentas = { datos, sha: f.sha, t: Date.now() };
  } catch (e) {
    if (e.status !== 404) throw e;
    cacheCuentas = { datos: { cuentas: [] }, sha: null, t: Date.now() };
  }
  return cacheCuentas;
}
async function cambiarCuentas(cambio) {
  for (let intento = 0; intento < 2; intento++) {
    const actual = await leerCuentas(true);
    const datos = JSON.parse(JSON.stringify(actual.datos));
    const resultado = await cambio(datos);
    try {
      const r = await gh(`/contents/${CUENTAS_FILE}`, { method: "PUT", body: {
        message: "Cuentas del panel",
        content: aBase64(JSON.stringify(datos, null, 2) + "\n"),
        branch: repo().branch,
        ...(actual.sha ? { sha: actual.sha } : {})
      } });
      cacheCuentas = { datos, sha: r && r.content ? r.content.sha : null, t: Date.now() };
      return resultado;
    } catch (e) {
      if (intento === 0 && (e.status === 409 || e.status === 422)) continue;   // alguien la cambió recién: otra vez
      throw e;
    }
  }
}
function buscar(datos, usuario) { return datos.cuentas.find(c => c.usuario === usuario); }

/* ¿Quién es? La cuenta principal (Vercel) o una cuenta del panel. */
async function autenticar(user, pass) {
  if (typeof user !== "string" || typeof pass !== "string" || !user || !pass || pass.length > 200) return null;
  if (checkCredentials(user, pass)) return { usuario: usuarioPrincipal(), dueno: true };
  if (!token()) return null;
  const u = user.trim().toLowerCase();
  if (!USUARIO_OK.test(u)) return null;
  const { datos } = await leerCuentas();
  const c = buscar(datos, u);
  return (await claveCorrecta(c, pass)) ? { usuario: u, dueno: false } : null;
}

/* «Recuperar el acceso»: usuario + código de recuperación + contraseña nueva. El código sirve una sola vez. */
const puedeRecuperar = limitador(15 * 60 * 1000, 6);
async function recuperar(body, ip) {
  if (!puedeRecuperar(ip)) throw cliente("limite", 429);
  const usuario = String(body.usuario || "").trim().toLowerCase();
  if (usuario && usuario === usuarioPrincipal()) throw cliente("principal");
  revisarClave(body.nueva);
  if (!token()) throw cliente("config", 500);
  const { datos } = await leerCuentas(true);
  const c = USUARIO_OK.test(usuario) ? buscar(datos, usuario) : null;
  const ok = !!(c && c.codigo && igualSeguro(await hashCodigo(body.codigo), c.codigo));
  if (!ok) { await sleep(1200); throw cliente("codigo", 401); }
  const nueva = await cifrarClave(body.nueva);
  await cambiarCuentas(d => {
    const x = buscar(d, usuario);
    if (!x) throw cliente("codigo", 401);
    Object.assign(x, nueva, { cambiada: new Date().toISOString() });
    delete x.codigo;   // el código ya se usó
  });
}

/* Lo que se ve en «Cuenta» */
async function infoCuenta(quien) {
  const { datos } = await leerCuentas(true);
  if (quien.dueno) {
    return { usuario: quien.usuario, dueno: true, cuentas: datos.cuentas.map(c => ({ usuario: c.usuario, creada: c.creada || "", tieneCodigo: !!c.codigo })) };
  }
  const c = buscar(datos, quien.usuario);
  return { usuario: quien.usuario, dueno: false, tieneCodigo: !!(c && c.codigo) };
}

async function accionCuenta(quien, body) {
  const a = body.action;
  if (a === "cuenta") return infoCuenta(quien);
  if (a === "cambiar-clave") {
    if (quien.dueno) throw cliente("principal");
    revisarClave(body.nueva);
    const { datos } = await leerCuentas(true);
    if (!(await claveCorrecta(buscar(datos, quien.usuario), String(body.actual || "")))) { await sleep(800); throw cliente("clave-actual"); }
    const nueva = await cifrarClave(body.nueva);
    await cambiarCuentas(d => { Object.assign(buscar(d, quien.usuario) || {}, nueva, { cambiada: new Date().toISOString() }); });
    return { ok: true };
  }
  if (a === "nuevo-codigo") {
    if (quien.dueno) throw cliente("principal");
    const codigo = nuevoCodigo();
    const codigoHash = await hashCodigo(codigo);
    await cambiarCuentas(d => { const c = buscar(d, quien.usuario); if (!c) throw cliente("datos"); c.codigo = codigoHash; });
    return { ok: true, codigo };   // se muestra una sola vez
  }
  // lo que sigue es solo para el dueño
  if (!quien.dueno) throw cliente("permiso", 403);
  const usuario = String(body.usuario || "").trim().toLowerCase();
  if (a === "crear-cuenta") {
    if (!USUARIO_OK.test(usuario)) throw cliente("usuario");
    if (usuario === usuarioPrincipal()) throw cliente("existe");
    revisarClave(body.clave);
    const clave = await cifrarClave(body.clave);
    await cambiarCuentas(d => {
      if (buscar(d, usuario)) throw cliente("existe");
      if (d.cuentas.length >= 30) throw cliente("muchas");
      d.cuentas.push({ usuario, ...clave, creada: new Date().toISOString() });
    });
    return infoCuenta(quien);
  }
  if (a === "borrar-cuenta") {
    await cambiarCuentas(d => { d.cuentas = d.cuentas.filter(c => c.usuario !== usuario); });
    return infoCuenta(quien);
  }
  if (a === "restablecer-clave") {
    revisarClave(body.clave);
    const clave = await cifrarClave(body.clave);
    await cambiarCuentas(d => { const c = buscar(d, usuario); if (!c) throw cliente("datos"); Object.assign(c, clave, { cambiada: new Date().toISOString() }); });
    return infoCuenta(quien);
  }
  return null;
}

/* ---------- estadísticas (functions/api/estadisticas.js las va sumando por día en D1) ---------- */
async function estadisticas(dias) {
  if (!hayBase(ENV)) return { configurado: false, plataforma: plataforma() };
  dias = [1, 7, 30, 90].includes(+dias) ? +dias : 7;
  const fechas = [];
  for (let i = dias - 1; i >= 0; i--) fechas.push(fechaChile(i));
  const filas = await leerEstadisticas(ENV, fechas[0], fechas[fechas.length - 1]);
  const porDia = {};
  fechas.forEach(f => { porDia[f] = { fecha: f }; });
  const ver = {}, agr = {};
  filas.forEach(({ dia, tipo, clave, n }) => {
    if (!porDia[dia]) return;
    if (tipo === "total") porDia[dia][clave] = (porDia[dia][clave] || 0) + Number(n);
    else if (tipo === "ver") ver[clave] = (ver[clave] || 0) + Number(n);
    else if (tipo === "agr") agr[clave] = (agr[clave] || 0) + Number(n);
  });
  return { configurado: true, dias: fechas.map(f => porDia[f]), ver, agr };
}

/* ---------- estado ----------
   Abrir /api/admin en el navegador muestra qué configuración le llegó al servidor.
   Nunca muestra la clave: solo si está y si se pegó limpia. */
function estado() {
  const raw = ENV.GITHUB_TOKEN || "";
  const t = raw.trim();
  const r = repo();
  return {
    ok: true,
    claveGithub: t ? "configurada" : "FALTA",
    claveFormato: !t ? "-" : (/^(github_pat_|ghp_|gho_|ghs_)[A-Za-z0-9_]+$/.test(t) ? "se ve bien" : "se ve rara: revisa que esté pegada completa y sin nada más"),
    claveConEspacios: raw !== t,
    repositorio: r.full,
    rama: r.branch,
    usuario: ENV.ADMIN_USER ? "propio" : "de fábrica",
    contrasena: !ENV.ADMIN_PASSWORD ? "FALTA" : ENV.ADMIN_PASSWORD.length < MIN_PASSWORD ? `muy corta (mínimo ${MIN_PASSWORD})` : "configurada",
    repositorioConfigurado: ENV.GITHUB_REPO ? "sí" : "FALTA GITHUB_REPO",
    estadisticas: hayBase(ENV) ? "base conectada" : (plataforma() === "vercel" ? "sin base (conecta Upstash for Redis en Storage)" : "sin base D1 (conecta una con el nombre DB)"),
    plataforma: plataforma(),
    version: (ENV.CF_PAGES_COMMIT_SHA || ENV.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7)
  };
}

/* ---------- control de origen e intentos ---------- */
// Solo la propia página llama a esta API (mismoSitio, en lib/comun.js) y solo con JSON (que obliga al navegador a
// preguntar antes de mandar algo desde otro sitio).
// Límite de intentos por IP. Vive en la memoria de cada instancia, así que es un freno parcial:
// el límite real se pone en el hosting (Vercel Firewall o reglas de Cloudflare sobre POST /api/admin; ver README).
const INTENTOS = new Map();
const VENTANA = 15 * 60 * 1000;
const MAX_INTENTOS = 20;
function contarIntento(ip) {
  const ahora = Date.now();
  if (INTENTOS.size > 5000) for (const [k, v] of INTENTOS) if (ahora - v.desde > VENTANA) INTENTOS.delete(k);
  let r = INTENTOS.get(ip);
  if (!r || ahora - r.desde > VENTANA) { r = { n: 0, desde: ahora }; INTENTOS.set(ip, r); }
  r.n++;
  return r.n;
}

/* ---------- entrada ---------- */
export async function onRequest({ request, env }) {
  ENV = env || {};
  if (request.method === "GET") return json(200, estado());
  if (request.method !== "POST") return json(405, { error: "metodo" });
  if (!mismoSitio(request)) return json(403, { error: "origen" });
  if (!/^application\/json\b/i.test(request.headers.get("Content-Type") || "")) return json(415, { error: "tipo" });
  const ip = ipDe(request);
  if (contarIntento(ip) > MAX_INTENTOS) return json(429, { error: "limite" });
  let body;
  try { body = await leerJson(request, 8 * 1024 * 1024); } catch (e) { return json(400, { error: "datos" }); }
  body = body || {};

  if (!ENV.ADMIN_PASSWORD) return json(500, { error: "clave" });
  if (ENV.ADMIN_PASSWORD.length < MIN_PASSWORD) return json(500, { error: "clave-principal-corta" });

  try {
    if (body.action === "recuperar") { await recuperar(body, ip); return json(200, { ok: true }); }
    const quien = await autenticar(body.user, body.pass);
    if (!quien) {
      await sleep(1200); // además del límite por IP, cada fallo tarda
      return json(401, { error: "acceso" });
    }
    INTENTOS.delete(ip);   // con la contraseña correcta, el contador de esa IP vuelve a cero
    if (!token()) return json(500, { error: "config" });
    if (body.action === "login") return json(200, { ok: true, site: await loadSite(), cuenta: await infoCuenta(quien) });
    if (body.action === "photo") return json(200, { ok: true, sha: await uploadPhoto(body.data) });
    if (body.action === "publish") { await publish(body.site, body.photos); return json(200, { ok: true }); }
    if (body.action === "estadisticas") {
      try { return json(200, await estadisticas(body.dias)); }
      catch (e) { return json(502, { error: "base", status: e.status || 0 }); }
    }
    const r = await accionCuenta(quien, body);
    if (r) return json(200, r);
    return json(400, { error: "accion" });
  } catch (e) {
    if (e.client) return json(e.httpStatus || 400, { error: e.client });
    return json(502, { error: "github", status: e.status || 0 });
  }
}
