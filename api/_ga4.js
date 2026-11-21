// GA4 Data API (somente leitura) via conta de servico. Sem dependencias: JWT RS256 com node:crypto.
// Credenciais SOMENTE em variaveis de ambiente protegidas; nada disso vai para o navegador.
//   GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY   (ou GA4_SERVICE_ACCOUNT_JSON com o JSON completo)
//   GA4_PROPERTY_ID (opcional; padrao 540539657 = propriedade da Kairos Shopping)
import { createSign } from "node:crypto";

export const GA4_PROPERTY_DEFAULT = "540539657"; // ID da propriedade (NAO e o Measurement ID G-...)
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const PROD_HOSTS = new Set(["www.kairosshopping.com.br", "kairosshopping.com.br"]);

export function readCredentials(env = process.env) {
  let email = env.GA4_CLIENT_EMAIL || "", key = env.GA4_PRIVATE_KEY || "";
  if (env.GA4_SERVICE_ACCOUNT_JSON) {
    try { const j = JSON.parse(env.GA4_SERVICE_ACCOUNT_JSON); email = email || j.client_email || ""; key = key || j.private_key || ""; } catch { /* json invalido: tratado como ausente */ }
  }
  key = key.replace(/\\n/g, "\n");
  const missing = [];
  if (!email) missing.push("GA4_CLIENT_EMAIL (ou GA4_SERVICE_ACCOUNT_JSON)");
  if (!key) missing.push("GA4_PRIVATE_KEY (ou GA4_SERVICE_ACCOUNT_JSON)");
  return { email, key, propertyId: String(env.GA4_PROPERTY_ID || GA4_PROPERTY_DEFAULT).replace(/\D/g, ""), missing };
}

const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");

export function signJwt({ email, key }, now = Math.floor(Date.now() / 1000)) {
  const head = b64({ alg: "RS256", typ: "JWT" });
  const body = b64({ iss: email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const sig = createSign("RSA-SHA256").update(`${head}.${body}`).sign(key).toString("base64url");
  return `${head}.${body}.${sig}`;
}

async function accessToken(creds, fetchImpl) {
  const r = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: signJwt(creds) })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw gaError("auth", j.error_description || (typeof j.error === "string" ? j.error : j.error?.message) || `HTTP ${r.status}`);
  return j.access_token;
}

function gaError(code, detail) {
  const e = new Error(detail); e.code = code; return e;
}

async function runReport(token, propertyId, body, fetchImpl) {
  const r = await fetchImpl(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j.error?.message || `HTTP ${r.status}`;
    if (r.status === 403 && /has not been used|disabled|SERVICE_DISABLED/i.test(JSON.stringify(j))) throw gaError("api_disabled", msg);
    if (r.status === 403) throw gaError("no_access", msg);
    throw gaError("api", msg);
  }
  return j;
}

const rows = (j) => (j.rows || []).map((r) => [...(r.dimensionValues || []).map((d) => d.value), ...(r.metricValues || []).map((m) => Number(m.value) || 0)]);
export const envKind = (host) => (PROD_HOSTS.has(host) ? "producao" : /\.vercel\.app$/i.test(host) ? "preview" : /localhost|127\.0\.0\.1/.test(host) ? "local" : host === "(not set)" ? "sem_host" : "outro");

export async function gaReport({ days = 7, env = process.env, fetchImpl = fetch } = {}) {
  const creds = readCredentials(env);
  const source = `Google Analytics Data API (propriedade ${creds.propertyId})`;
  if (creds.missing.length) return { configured: false, missing: creds.missing, propertyId: creds.propertyId, source };
  const n = Math.min(Math.max(Number(days) || 7, 1), 90);
  const dateRanges = [{ startDate: `${n}daysAgo`, endDate: "today" }];
  try {
    const token = await accessToken(creds, fetchImpl);
    const [ev, geo, src] = await Promise.all([
      runReport(token, creds.propertyId, { dateRanges, dimensions: [{ name: "eventName" }, { name: "hostName" }], metrics: [{ name: "eventCount" }, { name: "totalUsers" }], limit: 200, orderBys: [{ metric: { metricName: "eventCount" }, desc: true }] }, fetchImpl),
      runReport(token, creds.propertyId, { dateRanges, dimensions: [{ name: "country" }], metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "engagedSessions" }], limit: 20, orderBys: [{ metric: { metricName: "sessions" }, desc: true }] }, fetchImpl),
      runReport(token, creds.propertyId, { dateRanges, dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }], metrics: [{ name: "sessions" }, { name: "engagedSessions" }], limit: 20, orderBys: [{ metric: { metricName: "sessions" }, desc: true }] }, fetchImpl)
    ]);
    return {
      configured: true, source, propertyId: creds.propertyId, days: n, fetchedAt: new Date().toISOString(),
      events: rows(ev).map(([name, host, count, users]) => ({ name, host, env: envKind(host), count, users })),
      countries: rows(geo).map(([country, sessions, users, engaged]) => ({ country, sessions, users, engaged })),
      sources: rows(src).map(([source_, medium, sessions, engaged]) => ({ source: source_, medium, sessions, engaged }))
    };
  } catch (e) {
    return { configured: true, source, propertyId: creds.propertyId, error: e.code || "api", message: String(e.message || e).slice(0, 300) };
  }
}
