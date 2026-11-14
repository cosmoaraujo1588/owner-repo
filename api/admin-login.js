import { adminConfigured, checkAdminCredentials, createToken, sendJson } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  if (!adminConfigured()) {
    return sendJson(res, 503, { error: "Acesso administrativo nao configurado. Defina ADMIN_PASSWORD e ADMIN_SECRET na Vercel." });
  }

  const body = await readBody(req);
  if (checkAdminCredentials(body.user, body.password)) {
    return sendJson(res, 200, { token: createToken(), open: false });
  }
  return sendJson(res, 401, { error: "Usuario ou senha invalidos" });
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 10000) raw = raw.slice(0, 10000);
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(raw || "{}");
        resolve(parsed && typeof parsed === "object" ? parsed : {});
      } catch { resolve({}); }
    });
  });
}
