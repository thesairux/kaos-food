/* Vercel: /api/asistente usa el mismo servidor que Cloudflare (functions/api/asistente.js). */
import * as servidor from "../functions/api/asistente.js";
import { manejar } from "../lib/vercel.js";

const atender = manejar(servidor);
export function GET(request) { return atender(request); }
export function POST(request) { return atender(request); }
