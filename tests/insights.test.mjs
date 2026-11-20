import test from "node:test";
import assert from "node:assert/strict";
import { geoFromHeaders, originLabel, periodBounds, liveReport, periodReport } from "../api/_insights.js";

// fake supabase minimo (builder encadeavel)
function fake(tables) {
  const q = (name) => {
    let rows = [...(tables[name] || [])];
    const b = {
      select: () => b, order: () => b, limit: () => b, in: (c, v) => { rows = rows.filter((r) => v.includes(r[c])); return b; },
      eq: (c, v) => { rows = rows.filter((r) => r[c] === v); return b; },
      gte: (c, v) => { rows = rows.filter((r) => r[c] >= v); return b; }, lt: (c, v) => { rows = rows.filter((r) => r[c] < v); return b; },
      range: (a, z) => Promise.resolve({ data: rows.slice(a, z + 1), error: null }),
      maybeSingle: () => Promise.resolve({ data: rows[0] || null, error: null }),
      then: (ok) => Promise.resolve({ data: rows, error: null }).then(ok)
    };
    return b;
  };
  return { from: q };
}

test("geo: so localizacao aproximada, sem IP", () => {
  assert.deepEqual(geoFromHeaders({ "x-vercel-ip-country": "br", "x-vercel-ip-country-region": "sp", "x-vercel-ip-city": "S%C3%A3o%20Paulo", "x-real-ip": "1.2.3.4" }), { country: "BR", region: "SP", city: "São Paulo" });
  assert.deepEqual(geoFromHeaders({}), { country: null, region: null, city: null });
});
test("origem", () => {
  assert.equal(originLabel(""), "Direto");
  assert.equal(originLabel("https://www.kairosshopping.com.br/x"), "Navegação interna");
  assert.equal(originLabel("https://l.facebook.com/a"), "l.facebook.com");
});
test("periodo", () => {
  const b = periodBounds("2026-11-01", "2026-11-07");
  assert.equal(b.days, 7); assert.equal(b.fromIso, "2026-11-01T03:00:00.000Z");
});
test("live: janela, sessao unica, sem admin/teste, geo ausente", async () => {
  const now = Date.now(), iso = (m) => new Date(now - m * 60000).toISOString();
  const sb = fake({
    products: [{ id: "p1", title: "Produto 1", category: "Casa" }],
    online_visitors: [
      { session_id: "aaaaaa111111", page: "/", device: "mobile", origin: "", last_activity: iso(1), created_at: iso(9), country: "BR", region: "SP", city: "Indaiatuba" },
      { session_id: "bbbbbb222222", page: "/produto/x", product_id: "p1", device: "desktop", origin: "https://google.com/", last_activity: iso(4), created_at: iso(4) },
      { session_id: "cccccc333333", page: "/", device: "mobile", last_activity: iso(9), created_at: iso(9) },
      { session_id: "test-1", page: "/", last_activity: iso(1), created_at: iso(1) },
      { session_id: "dddddd444444", page: "/admin.html", last_activity: iso(1), created_at: iso(1) }
    ]
  });
  const r = await liveReport(sb, 5);
  assert.equal(r.active, 2); assert.equal(r.unknownLocation, 1); assert.equal(r.byState.SP, 1);
  assert.equal(r.byProduct[0][0], "Produto 1");
  assert.equal((await liveReport(sb, 10)).active, 3); // janela configuravel
});
test("relatorio: cliques de checkout nao sao vendas", async () => {
  const t = "2026-11-10T15:00:00.000Z";
  const sb = fake({
    products: [{ id: "p1", title: "P1", category: "Casa", active: true, checkout_url: "x", image_url: "y" }],
    view_events: [{ event_type: "product_view", session_id: "s1", product_id: "p1", page: "/", payload: {}, created_at: t }, { event_type: "page_view", session_id: "t", page: "/", payload: { test: true }, created_at: t }],
    click_events: [{ click_type: "checkout_click", session_id: "s1", product_id: "p1", payload: {}, created_at: t }, { click_type: "share_product", session_id: "s1", product_id: "p1", payload: {}, created_at: t }],
    cart_events: [{ event_type: "cart_add", session_id: "s1", product_id: "p1", payload: {}, created_at: t }],
    settings: [{ key: "store", value: { drafts: {}, campaign: { enabled: false } } }]
  });
  const r = await periodReport(sb, { from: "2026-11-09", to: "2026-11-11" });
  assert.equal(r.totals.productViews, 1); assert.equal(r.totals.pageViews, 0); // evento de teste excluido
  assert.equal(r.totals.checkoutClicks, 1); assert.equal(r.totals.cartAdds, 1); assert.equal(r.totals.shares, 1);
  assert.equal(r.totals.intentSessions, 1);
  assert.equal(r.purchases.confirmed, null);
  assert.equal(r.products[0].checkoutClicks, 1); assert.equal(r.series.length, 3);
});

import { uaClass } from "../api/_insights.js";
test("uaClass separa robos declarados de navegadores", () => {
  assert.equal(uaClass("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"), "bot");
  assert.equal(uaClass("Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/120.0 Safari/537.36"), "bot");
  assert.equal(uaClass("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari"), "browser");
  assert.equal(uaClass(""), "unknown");
});

test("liveReport: brasil + internacional + robos declarados sao coerentes e robos ficam fora dos ativos", async () => {
  const now = new Date().toISOString();
  const row = (id, country, ua_class, extra = {}) => ({ session_id: id, page: "/", country, region: null, city: null, origin: "facebook", device: "mobile", last_activity: now, created_at: now, ua_class, ...extra });
  const sb = fake({ online_visitors: [row("a1", "BR", "browser"), row("a2", "US", "browser"), row("a3", "SE", "unknown"), row("a4", "US", "bot"), row("test-5", "BR", "browser"), row("a6", null, "browser"), row("a7", "IE", "bot", { page: "/admin" })], products: [] });
  const r = await liveReport(sb, 5);
  assert.equal(r.active, 4);            // a1,a2,a3,a6 (bot, teste e /admin fora)
  assert.equal(r.brazil, 1);
  assert.equal(r.international, 2);     // US, SE
  assert.equal(r.unknownLocation, 1);
  assert.equal(r.botsDeclared, 1);      // so o bot em pagina publica
  assert.ok(r.brazil + r.international + r.unknownLocation === r.active);
});
