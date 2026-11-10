/* Vercel: /api/admin usa el mismo servidor que Cloudflare (functions/api/admin.js). */
import * as servidor from "../functions/api/admin.js";
import { manejar } from "../lib/vercel.js";

const atender = manejar(servidor);
export function GET(request) { return atender(request); }
export function POST(request) { return atender(request); }
