/* Entrada para Cloudflare Workers (si el proyecto se creó como Worker, con dirección .workers.dev).
   Los archivos de la página (dist/) los sirve Cloudflare directo; este archivo solo atiende las direcciones
   /api/… con los mismos servidores de functions/api/ que usa Cloudflare Pages. Ver wrangler.jsonc. */
import * as admin from "./functions/api/admin.js";
import * as asistente from "./functions/api/asistente.js";
import * as estadisticas from "./functions/api/estadisticas.js";

const RUTAS = { "/api/admin": admin, "/api/asistente": asistente, "/api/estadisticas": estadisticas };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const m = RUTAS[url.pathname.replace(/\/+$/, "")];
    if (!m) return env.ASSETS.fetch(request);
    const metodo = request.method.charAt(0) + request.method.slice(1).toLowerCase();
    const manejador = m["onRequest" + metodo] || m.onRequest;
    if (!manejador) return new Response(null, { status: 405 });
    return manejador({ request, env, params: {}, waitUntil: p => ctx.waitUntil(p) });
  }
};
