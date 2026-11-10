/* Base de datos de la analítica. Sirve cualquiera de las dos, según dónde esté publicada la página:
   - Cloudflare: una base D1 (gratis) conectada con el nombre DB. Una tabla que se crea sola.
   - Vercel: Upstash Redis (Storage → Upstash for Redis), que deja las variables KV_REST_API_URL y
     KV_REST_API_TOKEN (o UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN).
   Solo guarda cuentas por día; nada de las personas. */

const DIAS_GUARDADOS = 400;   // ~13 meses

function d1(env) { return env && env.DB && typeof env.DB.prepare === "function" ? env.DB : null; }
function upstash(env) {
  if (!env) return null;
  const url = String(env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || "").trim().replace(/\/+$/, "");
  const token = String(env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  return url && token ? { url, token } : null;
}
export function hayBase(env) { return !!(d1(env) || upstash(env)); }

/* ---- D1 ---- */
const CREAR = `CREATE TABLE IF NOT EXISTS estadisticas (
  dia TEXT NOT NULL, tipo TEXT NOT NULL, clave TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, tipo, clave))`;
let tablaLista = false;
async function asegurar(db) {
  if (tablaLista) return;
  await db.prepare(CREAR).run();
  tablaLista = true;
}

/* ---- Upstash (varios comandos en una llamada) ---- */
async function redis(c, comandos) {
  const r = await fetch(c.url + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + c.token, "Content-Type": "application/json" },
    body: JSON.stringify(comandos)
  });
  if (!r.ok) throw Object.assign(new Error("redis " + r.status), { status: r.status });
  return (await r.json()).map(x => (x && x.error ? null : x && x.result));
}
function diasEntre(desde, hasta) {
  const out = [];
  for (let d = new Date(desde + "T12:00:00Z"); d.toISOString().slice(0, 10) <= hasta; d = new Date(d.getTime() + 86400000)) {
    out.push(d.toISOString().slice(0, 10));
    if (out.length > 400) break;
  }
  return out;
}

/* filas: [[tipo, clave, cuánto], …]   tipo: "total" (visita, wsp, enviar, ingresos…), "ver" o "agr" (por producto) */
export async function sumar(env, dia, filas) {
  const db = d1(env);
  if (db) {
    await asegurar(db);
    const sql = "INSERT INTO estadisticas (dia, tipo, clave, n) VALUES (?1, ?2, ?3, ?4) " +
      "ON CONFLICT (dia, tipo, clave) DO UPDATE SET n = n + excluded.n";
    await db.batch(filas.map(([tipo, clave, n]) => db.prepare(sql).bind(dia, tipo, clave, n)));
    if (Math.random() < 0.005) {   // de vez en cuando se borran los días muy antiguos
      const limite = new Date(Date.now() - DIAS_GUARDADOS * 86400000).toISOString().slice(0, 10);
      await db.prepare("DELETE FROM estadisticas WHERE dia < ?1").bind(limite).run();
    }
    return;
  }
  const c = upstash(env);
  if (!c) return;
  const clave = "st:" + dia;
  const cmds = filas.map(([tipo, k, n]) => ["HINCRBY", clave, tipo + ":" + k, n]);
  cmds.push(["EXPIRE", clave, DIAS_GUARDADOS * 86400]);
  await redis(c, cmds);
}

export async function leer(env, desde, hasta) {
  const db = d1(env);
  if (db) {
    await asegurar(db);
    const r = await db.prepare("SELECT dia, tipo, clave, n FROM estadisticas WHERE dia >= ?1 AND dia <= ?2").bind(desde, hasta).all();
    return r.results || [];
  }
  const c = upstash(env);
  if (!c) return [];
  const dias = diasEntre(desde, hasta);
  const res = await redis(c, dias.map(d => ["HGETALL", "st:" + d]));
  const filas = [];
  res.forEach((h, i) => {
    const pares = Array.isArray(h) ? h : h && typeof h === "object" ? Object.entries(h).flat() : [];
    for (let j = 0; j + 1 < pares.length; j += 2) {
      const campo = String(pares[j]), corte = campo.indexOf(":");
      if (corte > 0) filas.push({ dia: dias[i], tipo: campo.slice(0, corte), clave: campo.slice(corte + 1), n: Number(pares[j + 1]) || 0 });
    }
  });
  return filas;
}
