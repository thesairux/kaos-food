/* Herramientas que comparten los servidores de la página (carpeta functions/; en Vercel también api/).
   Esta carpeta no se publica: se incluye al armar los servidores. */

export function json(status, data, extra) {
  return new Response(data === undefined ? null : JSON.stringify(data), {
    status,
    headers: Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, extra || {})
  });
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Solo la propia página llama a los servidores: se rechazan las peticiones que el navegador marca como de otro
   sitio (así otra web no puede usar a sus visitantes para probar contraseñas, gastar la IA o inflar estadísticas).
   Sin esas cabeceras (pruebas, curl) se deja pasar. */
export function mismoSitio(request) {
  const h = request.headers;
  const sfs = h.get("Sec-Fetch-Site");
  if (sfs && sfs !== "same-origin" && sfs !== "none") return false;
  const origin = h.get("Origin");
  if (origin) {
    const hosts = [new URL(request.url).host, h.get("X-Forwarded-Host"), h.get("Host")].filter(Boolean).map(x => x.split(",")[0].trim());
    try { if (!hosts.includes(new URL(origin).host)) return false; } catch (e) { return false; }
  }
  return true;
}

export function ipDe(request) {
  return request.headers.get("CF-Connecting-IP") || (request.headers.get("X-Forwarded-For") || "").split(",")[0].trim() || "local";
}

/* Cuerpo JSON con un tope de tamaño */
export async function leerJson(request, max) {
  const txt = await request.text();
  if (max && txt.length > max) throw new Error("grande");
  return txt ? JSON.parse(txt) : {};
}

/* Texto ↔ base64 (con tildes y ñ) */
export function aBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function deBase64(b64) {
  const bin = atob(String(b64 || "").replace(/\s/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
export function aHex(buf) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join(""); }
export function deHex(hex) { const a = new Uint8Array(hex.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16); return a; }

/* Compara sin que el tiempo delate cuánto coincide */
export function igualSeguro(a, b) {
  a = String(a); b = String(b);
  let dif = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) dif |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return dif === 0;
}
export async function sha256Hex(texto) {
  return aHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(texto))));
}

/* Fecha de hoy (o de días atrás) en Chile, como 2026-11-08 */
export function fechaChile(menosDias) {
  const d = new Date(Date.now() - (menosDias || 0) * 86400000);
  const x = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(d).forEach(p => { x[p.type] = p.value; });
  return `${x.year}-${x.month}-${x.day}`;
}

/* La carta publicada (carta.js), leída de los archivos de la propia página */
let carta = null, cartaT = 0;
export async function leerCarta(env, request) {
  if (carta && Date.now() - cartaT < 60000) return carta;
  const r = await env.ASSETS.fetch(new URL("/carta.js", request.url));
  if (!r.ok) throw new Error("carta " + r.status);
  const txt = await r.text();
  carta = JSON.parse(txt.slice(txt.indexOf("{", txt.indexOf("window.CARTA")), txt.lastIndexOf("}") + 1));
  cartaT = Date.now();
  return carta;
}

/* Límite de pedidos por persona (por instancia del servidor: es una ayuda, no una garantía) */
export function limitador(ventanaMs, max) {
  const mapa = new Map();
  return ip => {
    const t = Date.now();
    const l = (mapa.get(ip) || []).filter(x => t - x < ventanaMs);
    if (l.length >= max) { mapa.set(ip, l); return false; }
    l.push(t);
    mapa.set(ip, l);
    if (mapa.size > 5000) mapa.clear();
    return true;
  };
}
