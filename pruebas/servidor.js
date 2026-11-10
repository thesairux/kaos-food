/* Servidor de prueba (node pruebas/servidor.js): arma dist/ como Cloudflare Pages y ejecuta las funciones de
   functions/api/ igual que Cloudflare, con GitHub y la base D1 simulados en memoria.
   «Publicar» en el panel no guarda nada: la carta publicada queda en /__publicado para revisarla.
   /__cuentas muestra las cuentas guardadas y /__estadisticas la tabla de la analítica.
   Con SIN_DB=1 arranca sin base D1 (para ver el panel sin estadísticas activadas). */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { execSync } = require("child_process");

const RAIZ = path.join(__dirname, "..");
const DIST = path.join(RAIZ, "dist");
const PUERTO = +process.env.PUERTO || 8790;
const HOST = "127.0.0.1";   // solo este equipo: no queda abierto a la red
const BASE = `http://localhost:${PUERTO}`;
execSync("sh herramientas/construir.sh", { cwd: RAIZ, stdio: "ignore" });

/* ---- GitHub simulado: lee carta.js del disco y recibe lo que se publica ---- */
let publicado = null;
let cuentas = null;
const fetchReal = global.fetch;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
global.fetch = async (url, o = {}) => {
  url = String(url);
  if (!url.startsWith("https://api.github.com/")) return fetchReal(url, o);
  const metodo = (o.method || "GET").toUpperCase();
  const cuerpo = o.body ? JSON.parse(o.body) : null;
  if (url.includes("/contents/carta.js")) return json({ sha: "carta", encoding: "base64", content: fs.readFileSync(path.join(RAIZ, "carta.js")).toString("base64") });
  if (url.includes("/contents/privado/cuentas.json")) {
    if (metodo === "PUT") {
      if ((cuerpo.sha || null) !== (cuentas ? cuentas.sha : null)) return json({ message: "sha" }, 409);
      cuentas = { sha: "c" + Date.now() + Math.random().toString(36).slice(2, 6), content: cuerpo.content };
      return json({ content: { sha: cuentas.sha } });
    }
    return cuentas ? json({ sha: cuentas.sha, encoding: "base64", content: cuentas.content }) : json({ message: "Not Found" }, 404);
  }
  if (url.includes("/git/ref")) return json({ object: { sha: "cabeza" } });
  if (url.includes("/git/commits/cabeza")) return json({ sha: "cabeza", tree: { sha: "arbol" } });
  if (url.includes("/git/trees/arbol")) return json({ tree: [] });
  if (url.includes("/git/blobs") && metodo === "POST") {
    if (cuerpo.encoding === "utf-8") publicado = cuerpo.content;   // la carta; las fotos llegan en base64
    return json({ sha: require("crypto").randomBytes(20).toString("hex") });
  }
  if (url.includes("/git/trees") && metodo === "POST") return json({ sha: "arbol-nuevo" });
  if (url.includes("/git/commits") && metodo === "POST") return json({ sha: "commit-nuevo" });
  if (url.includes("/git/refs/heads/") && metodo === "PATCH") return json({ ok: true });
  return json({ message: "no simulado: " + metodo + " " + url }, 404);
};

/* ---- D1 simulada con SQLite en memoria (lo mismo que usa Cloudflare por dentro) ---- */
function d1() {
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(":memory:");
  class Consulta {
    constructor(sql, args) { this.sql = sql; this.args = args || []; }
    bind(...args) { return new Consulta(this.sql, args); }
    async run() { db.prepare(this.sql).run(...this.args); return { success: true }; }
    async all() { return { success: true, results: db.prepare(this.sql).all(...this.args) }; }
    async first() { return db.prepare(this.sql).get(...this.args) || null; }
  }
  return { prepare: sql => new Consulta(sql), batch: async l => { const r = []; for (const c of l) r.push(await c.run()); return r; }, _db: db };
}

const tipos = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".json": "application/json" };
function archivo(pathname) {
  let ruta;
  try { ruta = decodeURIComponent(pathname); } catch (e) { return null; }
  if (ruta === "/") ruta = "/index.html";
  if (ruta === "/admin") ruta = "/admin.html";
  const f = path.resolve(DIST, "." + path.posix.normalize("/" + ruta));
  const rel = path.relative(DIST, f);
  // solo archivos dentro de dist/, y nada que empiece con punto
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel) || rel.split(path.sep).some(p => p.startsWith("."))) return null;
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return null;
  return f;
}

const ENV = {
  GITHUB_TOKEN: "ghp_prueba", ADMIN_PASSWORD: "clave-de-prueba-larga", GITHUB_REPO: "prueba/kaos-food", GITHUB_BRANCH: "main", CF_PAGES: "1",
  ASSETS: { fetch: async u => { const f = archivo(new URL(String(u)).pathname); return f ? new Response(fs.readFileSync(f)) : new Response("no", { status: 404 }); } }
};
if (process.env.ANTHROPIC_API_KEY) ENV.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const base = process.env.SIN_DB ? null : d1();
if (base) ENV.DB = base;

/* Ejecuta functions/api/<nombre>.js como lo hace Cloudflare Pages */
const modulos = {};
async function funcion(nombre, req, res) {
  const m = modulos[nombre] || (modulos[nombre] = await import(pathToFileURL(path.join(RAIZ, "functions/api", nombre + ".js")).href));
  const trozos = [];
  for await (const c of req) trozos.push(c);
  const headers = new Headers();
  Object.entries(req.headers).forEach(([k, v]) => { if (!k.startsWith(":")) headers.set(k, Array.isArray(v) ? v.join(", ") : v); });
  headers.set("CF-Connecting-IP", "127.0.0.1");
  const request = new Request(BASE + req.url, { method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(trozos) });
  const manejador = m["onRequest" + req.method[0] + req.method.slice(1).toLowerCase()] || m.onRequest;
  const r = manejador ? await manejador({ request, env: ENV, params: {}, waitUntil() {} }) : new Response(null, { status: 405 });
  res.statusCode = r.status;
  r.headers.forEach((v, k) => res.setHeader(k, v));
  res.end(Buffer.from(await r.arrayBuffer()));
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, BASE);
  try {
    const api = /^\/api\/([a-z]+)$/.exec(u.pathname);
    if (api && fs.existsSync(path.join(RAIZ, "functions/api", api[1] + ".js"))) return await funcion(api[1], req, res);
    if (u.pathname === "/__estadisticas") { res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify(base ? base._db.prepare("SELECT * FROM estadisticas").all() : [])); }
    if (u.pathname === "/__cuentas") { res.setHeader("Content-Type", "application/json"); return res.end(cuentas ? Buffer.from(cuentas.content, "base64").toString("utf8") : "{}"); }
    if (u.pathname === "/__publicado") { res.setHeader("Content-Type", "text/javascript"); return res.end(publicado || ""); }
    const f = archivo(u.pathname);
    if (!f) { res.statusCode = 404; return res.end("no"); }
    res.setHeader("Content-Type", tipos[path.extname(f)] || "application/octet-stream");
    fs.createReadStream(f).pipe(res);
  } catch (e) { console.error(e); res.statusCode = 500; res.end("error"); }
}).listen(PUERTO, HOST, () => console.log("listo " + BASE + (base ? "" : " (sin base D1)")));
