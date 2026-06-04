import { createToken, sendJson } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  if (!process.env.ADMIN_PASSWORD) return sendJson(res, 200, { token: "", open: true });

  const body = await readBody(req);
  const user = process.env.ADMIN_USER || "admin";
  if (body.user === user && body.password === process.env.ADMIN_PASSWORD) {
    return sendJson(res, 200, { token: createToken(), open: false });
  }
  return sendJson(res, 401, { error: "Usuario ou senha invalidos" });
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => raw += chunk);
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); }
      catch { resolve({}); }
    });
  });
}
