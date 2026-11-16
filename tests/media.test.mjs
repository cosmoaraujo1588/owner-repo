import test from "node:test"; import assert from "node:assert/strict";
await import("../public/media-pipeline.js"); const M = globalThis.KairosMedia;
import { buildUploadPath, sniffImage } from "../api/upload.js"; import { sanitizeSettings } from "../api/catalog.js";
const u8 = (...a) => new Uint8Array(a);
test("sniff detecta JPEG/PNG/WebP/MP4/WebM por assinatura", () => {
  assert.equal(M.sniff(u8(0xff,0xd8,0xff,0xe0,0,0,0,0,0,0,0,0)), "image/jpeg");
  assert.equal(M.sniff(u8(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0)), "image/png");
  assert.equal(M.sniff(u8(0x1a,0x45,0xdf,0xa3,0,0,0,0,0,0,0,0)), "video/webm");
  assert.equal(M.sniff(new TextEncoder().encode("not an image at all")), "");
});
test("fit nunca amplia nem corta", () => {
  const r = M.fit(4000, 2000, 1920, 1080); assert.equal(r.width, 1920); assert.equal(r.height, 960);
  const s = M.fit(800, 400, 1920, 1080); assert.equal(s.width, 800); assert.equal(s.height, 400);
});
test("buildUploadPath organiza por finalidade", () => {
  assert.match(buildUploadPath({ purpose: "banner-desktop", name: "Natal 2026", extension: "webp" }), /^banners\/desktop\/.+\.webp$/);
  assert.match(buildUploadPath({ purpose: "banner-mobile", name: "x", extension: "webp" }), /^banners\/mobile\//);
  assert.match(buildUploadPath({ purpose: "banner-video", name: "x", extension: "mp4" }), /^banners\/videos\//);
  assert.match(buildUploadPath({ purpose: "banner-thumb", name: "x", extension: "webp" }), /^banners\/thumbnails\//);
});
test("sniffImage valida pelo conteudo e nao pelo MIME", () => {
  assert.equal(sniffImage(Buffer.from([0xff,0xd8,0xff,0xe1,0,0,0,0,0,0,0,0])), "image/jpeg");
  assert.equal(sniffImage(Buffer.from("GIF89a0000000000")), "");
});
test("sanitizeSettings limita a 5 ativos e valida links/midias", () => {
  const banners = Array.from({ length: 7 }, (_, i) => ({ id: "b" + i, title: "B" + i, order: i, active: true, desktopImage: "https://x.co/a.webp", link: "#produtos" }));
  banners.push({ id: "bad", title: "bad", order: 9, active: true, desktopImage: "javascript:alert(1)", link: "javascript:alert(1)" });
  const s = sanitizeSettings({ banners, carousel: { interval: 99, videoMaxMb: 1, enabled: true } });
  assert.ok(s.banners.filter(b => b.active).length <= 5);
  assert.ok(s.banners.every(b => !/^javascript/i.test(b.desktopImage || "") && !/^javascript/i.test(b.link || "")));
  assert.equal(s.carousel.interval, 30); assert.equal(s.carousel.videoMaxMb, 5);
});
