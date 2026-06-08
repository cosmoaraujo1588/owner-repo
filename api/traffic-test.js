import { getSupabase, sendJson, cleanText } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return sendJson(res, 503, {
      ok: false,
      error: "Supabase not configured",
      message: "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para registrar visitantes."
    });
  }

  const now = new Date().toISOString();
  const amount = Math.max(1, Math.min(Number(req.query?.visitors || req.query?.v || 1), 250));
  const source = cleanText(req.query?.source || "traffic-test", 80);
  const page = cleanText(req.query?.page || "/", 400);
  const device = cleanText(req.query?.device || "load-test", 80);
  const referrer = cleanText(req.headers.referer || req.headers.referrer || source, 800);

  const onlineRows = Array.from({ length: amount }, (_, index) => ({
    session_id: `test-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    page,
    product_id: null,
    device,
    origin: referrer,
    last_activity: now
  }));

  const viewRows = onlineRows.map((visitor) => ({
    event_type: "page_view",
    session_id: visitor.session_id,
    page,
    referrer,
    device,
    payload: {
      source,
      test: true,
      user_agent: cleanText(req.headers["user-agent"], 300)
    },
    created_at: now
  }));

  const [onlineResult, viewsResult] = await Promise.all([
    supabase.from("online_visitors").upsert(onlineRows, { onConflict: "session_id" }),
    supabase.from("view_events").insert(viewRows)
  ]);

  const error = onlineResult.error || viewsResult.error;
  if (error) return sendJson(res, 500, { ok: false, error: error.message });

  return sendJson(res, 200, {
    ok: true,
    recordedVisitors: amount,
    page,
    source,
    expiresOnlineInSeconds: 120,
    nextCheck: "/api/public-stats"
  });
}
