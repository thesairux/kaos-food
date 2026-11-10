/*
  Analítica de la página: la página avisa aquí lo que pasa (visitas, clics a WhatsApp, productos vistos y
  agregados, pedidos enviados) y se suma por día en la base de datos (D1 en Cloudflare o Upstash en Vercel; ver lib/estadisticas-db.js).
  Se ve en el panel, en «Estadísticas». No guarda nada de las personas: ni IP, ni nombre, ni dirección.
  Sin la base conectada, responde igual y no guarda nada.
*/
import { json, ipDe, leerJson, leerCarta, fechaChile, limitador, mismoSitio } from "../../lib/comun.js";
import { hayBase, sumar } from "../../lib/estadisticas-db.js";

const EVENTOS = ["visita", "wsp", "ver", "agregar", "abrir", "enviar", "asistente"];
const permitido = limitador(10 * 60 * 1000, 150);

async function idsProductos(env, request) {
  const C = await leerCarta(env, request);
  const ids = new Set();
  (C.secciones || []).forEach(s => (s.categorias || []).forEach(c => (c.productos || []).forEach(p => ids.add(p.id))));
  return ids;
}

export async function onRequestGet({ env }) {
  return json(200, { ok: true, guardando: hayBase(env) });
}

export async function onRequestPost({ request, env }) {
  if (!hayBase(env)) return json(204);
  if (!mismoSitio(request)) return json(403, { error: "origen" });
  if (!permitido(ipDe(request))) return json(204);
  let b;
  try { b = await leerJson(request, 2000); } catch (e) { return json(400, { error: "datos" }); }
  const e = b && b.e;
  if (!EVENTOS.includes(e)) return json(400, { error: "evento" });

  const filas = [];
  if (e === "ver" || e === "agregar") {
    const p = String(b.p || "");
    let existe = false;
    try { existe = /^[a-z0-9-]{1,60}$/.test(p) && (await idsProductos(env, request)).has(p); } catch (x) { existe = false; }
    if (!existe) return json(400, { error: "producto" });
    filas.push([e === "ver" ? "ver" : "agr", p, 1]);
    if (e === "agregar" && b.primera) filas.push(["total", "agregar", 1]);   // embudo: visitas que agregaron algo
  } else if (e === "enviar") {
    const n = Math.round(+b.n || 0);
    filas.push(["total", "enviar", 1]);
    if (n > 0 && n < 5000000) filas.push(["total", "ingresos", n]);
  } else {
    filas.push(["total", e, 1]);
  }
  try { await sumar(env, fechaChile(), filas); } catch (err) { /* sin conexión: no se guarda esta vez */ }
  return json(204);
}
