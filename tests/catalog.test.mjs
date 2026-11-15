import test from "node:test";
import assert from "node:assert/strict";
import { isPublishable, sanitizeSettings } from "../api/catalog.js";

test("isPublishable exige nome, preco e checkout https valido", () => {
  const ok = { title: "A", price: 10, checkoutUrl: "https://pay.x.com/c/1?a=1" };
  assert.equal(isPublishable(ok), true);
  assert.equal(isPublishable({ ...ok, price: 0 }), false);
  assert.equal(isPublishable({ ...ok, title: "" }), false);
  assert.equal(isPublishable({ ...ok, checkoutUrl: "" }), false);
  assert.equal(isPublishable({ ...ok, checkoutUrl: "http://x.com/a" }), false);
  assert.equal(isPublishable({ ...ok, checkoutUrl: "https://x.com/a?b?c" }), false);
});

test("sanitizeSettings normaliza drafts", () => {
  const s = sanitizeSettings({ drafts: { a: true, b: false, c: 1 } });
  assert.deepEqual(s.drafts, { a: true, c: true });
});
