import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { injectProductMeta } from "../api/product-page.js";

const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const mk = (o) => injectProductMeta(html, { title: "Projetor de Natal Astronauta Bivolt", short_description: "Projeções luminosas & efeitos natalinos", price: 59.9, image_url: "https://x.supabase.co/storage/v1/object/public/kairos-public/products/a.jpg", ...o }, "projetor-de-natal-astronauta-bivolt", "https://www.kairosshopping.com.br");
const meta = (h, attr, name) => new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`).exec(h)?.[1];

test("metadados sociais individuais por produto", () => {
  const h = mk({});
  assert.equal(meta(h, "property", "og:title"), "Projetor de Natal Astronauta Bivolt");
  assert.equal(meta(h, "property", "og:type"), "product");
  assert.match(meta(h, "property", "og:image"), /^https:\/\/.+\.jpg$/);
  assert.equal(meta(h, "property", "og:url"), "https://www.kairosshopping.com.br/produto/projetor-de-natal-astronauta-bivolt");
  assert.equal(meta(h, "name", "twitter:card"), "summary_large_image");
  assert.equal(meta(h, "name", "twitter:title"), "Projetor de Natal Astronauta Bivolt");
  assert.equal(meta(h, "name", "twitter:image"), meta(h, "property", "og:image"));
  assert.match(meta(h, "name", "twitter:description"), /Proje.+luminosas &amp; efeitos/);
  assert.match(h, /<link rel="canonical" href="https:\/\/www\.kairosshopping\.com\.br\/produto\/projetor-de-natal-astronauta-bivolt">/);
  assert.ok(!/og:image:width/.test(h), "nao declara dimensoes falsas");
});

test("produtos diferentes nao compartilham metadados", () => {
  const a = mk({}), b = mk({ title: "Outro Produto", image_url: "https://x.supabase.co/b.png" });
  assert.notEqual(meta(a, "property", "og:image"), meta(b, "property", "og:image"));
  assert.ok(!b.includes("Projetor de Natal"));
});

test("descricao longa termina em palavra inteira", () => {
  const h = mk({ short_description: "palavra ".repeat(60) });
  assert.match(meta(h, "property", "og:description"), /palavra…$/);
});

import vm from "node:vm";
import { buildCodes } from "../api/_shortcode.js";
import { sanitizeSettings } from "../api/catalog.js";

test("codigos curtos: cliente e servidor geram os mesmos links", async () => {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(await readFile(new URL("../public/shortcode.js", import.meta.url), "utf8"), ctx);
  const P = [{ id: "z9", title: "Bolsa Térmica Lancheira para Marmita" }, { id: "a1", title: "Bolsa Térmica Grande" }, { id: "m3", title: "Projetor de Natal Astronauta" }];
  const o = { z9: "marmita-termica" };
  const a = buildCodes(P, o), b = ctx.window.KairosShort.buildCodes(P, o);
  assert.deepEqual(JSON.parse(JSON.stringify(b.byId)), a.byId);
  assert.equal(a.byId.z9, "marmita-termica");
  assert.equal(a.byId.a1, "bolsa-termica");
  assert.equal(a.byId.m3, "projetor-natal");
  assert.equal(new Set(Object.values(a.byId)).size, 3);
});

test("associacoes: manual tem prioridade, sem aleatorios, sem duplicar carrinho", async () => {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(await readFile(new URL("../public/shortcode.js", import.meta.url), "utf8"), ctx);
  const S = (...a) => JSON.parse(JSON.stringify(ctx.window.KairosShort.suggest(...a)));
  const prods = ["a", "b", "c", "d", "e"].map((id) => ({ id, category: id === "e" ? "Outra" : "X" }));
  const cfg = { links: { a: ["c", "b", "e"] }, disabled: {} };
  assert.deepEqual(S(prods, [prods[0]], [], cfg).map((p) => p.id), ["c", "b", "e"]);
  assert.deepEqual(S(prods, [prods[0]], ["b"], cfg).map((p) => p.id), ["c", "e"]);
  assert.deepEqual(S(prods, [prods[0]], [], { ...cfg, disabled: { a: true } }), []);
  assert.deepEqual(S(prods, [prods[3]], [], { links: {} }).map((p) => p.id), ["a", "b", "c"]);
  assert.deepEqual(S(prods, [prods[3]], [], { links: {}, autoByCategory: false }), []);
  prods[2].active = false;
  assert.deepEqual(S(prods, [prods[0]], [], cfg).map((p) => p.id), ["b", "e"]);
});

test("servidor sanitiza associacoes, links curtos e campanha", () => {
  const s = sanitizeSettings({ orderBump: { links: { a: ["a", "b", "b"], x: [] }, disabled: { a: 1, q: 0 }, max: 99 }, shortLinks: { a: "Bolsa Térmica!", b: "", c: "bolsa-termica" }, campaign: { enabled: true, endAt: "lixo" } });
  assert.deepEqual(s.orderBump.links, { a: ["b", "b"] });
  assert.deepEqual(s.orderBump.disabled, { a: true });
  assert.equal(s.orderBump.max, 6);
  assert.deepEqual(s.shortLinks, { a: "bolsa-termica" });
  assert.equal(s.campaign.enabled, false);
});

import { injectProductShell } from "../api/product-page.js";
test("injectProductShell entrega titulo, preco e compra no HTML inicial e escapa conteudo", () => {
  const html = '<html><head></head><body><div class="product-modal" id="productModal" hidden></div></body></html>';
  const out = injectProductShell(html, { id: "p1", title: 'Fone <script>x</script>', price: 59.9, old_price: 79.9, image_url: "https://x.co/a.jpg", checkout_url: "https://pay.example/co", description: "Linha 1 <b>", category: "Audio" });
  assert.ok(!out.includes("<script>x"));
  assert.match(out, /<h1>Fone /);
  assert.match(out, /R\$\s?59,90/);
  assert.match(out, /href="https:\/\/pay\.example\/co"/);
  assert.ok(!out.includes('id="productModal" hidden'));
  assert.match(out, /<body class="product-open">/);
  const bad = injectProductShell(html, { id: "p2", title: "X", price: 1, checkout_url: "javascript:alert(1)" });
  assert.ok(!bad.includes("javascript:"));
});

import { injectHomeProducts } from "../api/_home.js";
test("injectHomeProducts coloca cards rastreaveis na grade e escapa conteudo", () => {
  const html = '<div class="product-grid catalog-grid" id="catalogGrid"></div>';
  const out = injectHomeProducts(html, [{ id: "a", title: 'Cafeteira "Pro" <b>', price: 99.9, image_url: "https://x.co/a.jpg", category: "Casa" }]);
  assert.match(out, /href="\/produto\/cafeteira-pro/);
  assert.match(out, /R\$\s?99,90/);
  assert.ok(!out.includes("<b>"));
  assert.equal(injectHomeProducts(html, []), html);
});
