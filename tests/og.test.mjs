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
