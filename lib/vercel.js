/* Adaptador para Vercel: corre los mismos servidores de functions/api/ (escritos para Cloudflare) dentro de
   las funciones de Vercel (carpeta api/). Arma las variables como las espera el código y lee carta.js del disco. */
import fs from "node:fs";
import path from "node:path";

function entorno(request) {
  const env = Object.assign({}, process.env, { PLATAFORMA: "vercel" });
  if (!env.GITHUB_REPO && env.VERCEL_GIT_REPO_OWNER && env.VERCEL_GIT_REPO_SLUG) env.GITHUB_REPO = env.VERCEL_GIT_REPO_OWNER + "/" + env.VERCEL_GIT_REPO_SLUG;
  if (!env.GITHUB_BRANCH && env.VERCEL_GIT_COMMIT_REF) env.GITHUB_BRANCH = env.VERCEL_GIT_COMMIT_REF;
  // Los servidores piden archivos de la página (carta.js) a ASSETS, como en Cloudflare
  env.ASSETS = {
    fetch: async u => {
      const nombre = new URL(String(u && u.url ? u.url : u)).pathname.replace(/^\/+/, "");
      if (nombre === "carta.js") {
        try { return new Response(fs.readFileSync(path.join(process.cwd(), nombre))); } catch (e) { /* se pide por internet */ }
      }
      return fetch(new URL("/" + nombre, request.url));
    }
  };
  return env;
}

export function manejar(modulo) {
  return async request => {
    const metodo = request.method.charAt(0) + request.method.slice(1).toLowerCase();
    const fn = modulo["onRequest" + metodo] || modulo.onRequest;
    if (!fn) return new Response(null, { status: 405 });
    return fn({ request, env: entorno(request), params: {}, waitUntil() {} });
  };
}
