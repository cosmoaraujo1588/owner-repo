import { getSupabase, sendJson, cleanText } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  const supabase = getSupabase();
  if (!supabase) return sendJson(res, 202, { ok: true, local: true });
  const body = await readBody(req);
  const result = await supabase.from("leads").insert({
    name: cleanText(body.name, 160),
    whatsapp: cleanText(body.whatsapp, 80),
    city: cleanText(body.city, 160),
    source: cleanText(body.source || "site", 120),
    session_id: cleanText(body.session_id, 160),
    status: "novo"
  });
  if (result.error) return sendJson(res, 500, { error: result.error.message });
  sendJson(res, 200, { ok: true });
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
