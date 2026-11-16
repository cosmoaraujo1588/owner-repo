/* Kairos - pipeline de midias do painel (navegador). Sem bibliotecas externas.
   Imagens: valida pelo conteudo, redimensiona sem cortar/distorcer, converte para WebP (banners) e gera miniatura.
   Videos: valida formato/tamanho, extrai poster e envia com barra de progresso. Envio DIRETO ao Supabase Storage (URL assinada)
   e conferencia da URL publica antes de devolver o resultado. */
(function (root) {
  "use strict";

  var LIMITS = {
    "banner-desktop": { w: 1920, h: 1080 },
    "banner-mobile": { w: 1080, h: 1920 },
    "banner-poster": { w: 1280, h: 1280 },
    "product-image": { w: 1600, h: 1600 },
    thumb: { w: 480, h: 480 }
  };
  var cfg = { authFetch: null, videoMaxMb: 30 };

  // ---------- puro (testavel em Node) ----------
  function sniff(bytes) {
    var b = bytes || [];
    if (b.length < 12) return "";
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
    if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
      var brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
      return brand === "qt  " ? "video/quicktime" : "video/mp4";
    }
    if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
    return "";
  }
  function fit(w, h, maxW, maxH) {
    var scale = Math.min(1, maxW / w, maxH / h); // nunca amplia e nunca corta: so reduz mantendo a proporcao
    return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)), scale: scale };
  }
  function codecOf(text) {
    if (/avc1/.test(text)) return "h264";
    if (/hvc1|hev1/.test(text)) return "hevc";
    if (/av01/.test(text)) return "av1";
    return "";
  }
  function extOf(type) { return { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" }[type] || ""; }

  // ---------- navegador ----------
  function head(file, n) { return file.slice(0, n).arrayBuffer().then(function (buf) { return new Uint8Array(buf); }); }
  function toBlob(canvas, type, q) { return new Promise(function (resolve) { canvas.toBlob(resolve, type, q); }); }
  function fail(message) { var e = new Error(message); e.userMessage = message; return e; }

  async function encode(bitmap, size, preferType, hasAlpha) {
    var canvas = document.createElement("canvas");
    canvas.width = size.width; canvas.height = size.height;
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    var blob = await toBlob(canvas, preferType, 0.86);
    if (blob && blob.type === preferType) return blob;
    // navegador sem codificador WebP: cai para PNG (com transparencia) ou JPEG
    var fallback = hasAlpha ? "image/png" : "image/jpeg";
    return toBlob(canvas, fallback, 0.88);
  }

  /** @returns {{blob,type,width,height,converted,thumb:{blob,type,width,height}|null,originalBytes:number}} */
  async function processImage(file, opts) {
    opts = opts || {};
    var purpose = opts.purpose || "product-image";
    if (!file || !file.size) throw fail("Selecione um arquivo de imagem valido.");
    if (file.size > 40 * 1024 * 1024) throw fail("Imagem muito grande (mais de 40 MB). Reduza antes de enviar.");
    var type = sniff(await head(file, 16));
    if (type !== "image/jpeg" && type !== "image/png" && type !== "image/webp") {
      throw fail("Formato nao aceito. Use uma imagem JPG, JPEG, PNG ou WebP (o conteudo do arquivo nao e uma dessas imagens).");
    }
    var bitmap;
    try { bitmap = await createImageBitmap(file); } catch (e) { throw fail("Nao foi possivel ler a imagem. O arquivo pode estar corrompido."); }
    var lim = LIMITS[purpose] || LIMITS["product-image"];
    var size = fit(bitmap.width, bitmap.height, lim.w, lim.h);
    var toWebp = purpose.indexOf("banner") === 0;
    // Produtos mantem JPG/PNG/WebP original (rastreadores sociais leem melhor JPG/PNG); banners viram WebP.
    var wanted = toWebp ? "image/webp" : type;
    var out = await encode(bitmap, size, wanted, type !== "image/jpeg");
    var result;
    if (!out) throw fail("Falha ao processar a imagem.");
    if (size.scale === 1 && out.size >= file.size && (!toWebp || type === "image/webp")) {
      result = { blob: file, type: type, width: size.width, height: size.height, converted: false };
    } else {
      result = { blob: out, type: out.type, width: size.width, height: size.height, converted: out.type !== type };
    }
    result.originalBytes = file.size;
    result.thumb = null;
    if (opts.thumb) {
      var ts = fit(bitmap.width, bitmap.height, LIMITS.thumb.w, LIMITS.thumb.h);
      var tb = await encode(bitmap, ts, "image/webp", type !== "image/jpeg");
      if (tb) result.thumb = { blob: tb, type: tb.type, width: ts.width, height: ts.height };
    }
    if (bitmap.close) bitmap.close();
    return result;
  }

  function loadVideo(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), v = document.createElement("video");
      v.preload = "metadata"; v.muted = true; v.playsInline = true;
      var done = function (err) { if (err) { URL.revokeObjectURL(url); reject(err); } else resolve({ video: v, url: url }); };
      v.onloadedmetadata = function () { done(); };
      v.onerror = function () { done(fail("Nao foi possivel ler o video. Converta para MP4 (H.264) antes de enviar.")); };
      setTimeout(function () { done(fail("Tempo esgotado ao ler o video. Converta para MP4 (H.264) e tente novamente.")); }, 15000);
      v.src = url;
    });
  }

  /** Valida e inspeciona o video (sem converter). */
  async function inspectVideo(file, opts) {
    opts = opts || {};
    if (!file || !file.size) throw fail("Selecione um arquivo de video valido.");
    var type = sniff(await head(file, 16));
    if (type === "video/quicktime") throw fail("Arquivos .MOV nao sao aceitos. Converta para MP4 (H.264) e envie novamente.");
    if (type !== "video/mp4" && type !== "video/webm") throw fail("Formato de video nao aceito. Use MP4 (H.264) ou WebM.");
    var maxMb = opts.maxMb || cfg.videoMaxMb;
    if (file.size > maxMb * 1024 * 1024) throw fail("Video com " + (file.size / 1048576).toFixed(1) + " MB. O limite e " + maxMb + " MB: comprima o video (ex.: 1280x720, ate 8 Mbps) e tente de novo.");
    var warn = "";
    if (type === "video/mp4") {
      var first = String.fromCharCode.apply(null, Array.from(await head(file, 262144)));
      var tailBuf = new Uint8Array(await file.slice(Math.max(0, file.size - 262144)).arrayBuffer());
      var codec = codecOf(first) || codecOf(String.fromCharCode.apply(null, Array.from(tailBuf)));
      if (codec === "hevc" || codec === "av1") warn = "Este video usa " + (codec === "hevc" ? "HEVC (H.265)" : "AV1") + " e pode nao tocar em todos os navegadores. Prefira MP4 com H.264.";
    }
    var loaded = await loadVideo(file);
    var v = loaded.video, info = { type: type, duration: v.duration || 0, width: v.videoWidth, height: v.videoHeight, warning: warn, poster: null };
    try {
      v.currentTime = Math.min(1, (v.duration || 2) / 2);
      await new Promise(function (resolve) { v.onseeked = resolve; setTimeout(resolve, 4000); });
      if (v.videoWidth) {
        var s = fit(v.videoWidth, v.videoHeight, LIMITS["banner-poster"].w, LIMITS["banner-poster"].h);
        var c = document.createElement("canvas"); c.width = s.width; c.height = s.height;
        c.getContext("2d").drawImage(v, 0, 0, s.width, s.height);
        var pb = await toBlob(c, "image/webp", 0.82);
        if (pb) info.poster = { blob: pb, type: pb.type, width: s.width, height: s.height };
      }
    } catch (e) { /* poster e opcional */ }
    URL.revokeObjectURL(loaded.url);
    return info;
  }

  function authFetch(url, options) {
    if (!cfg.authFetch) throw new Error("Sessao do painel indisponivel.");
    return cfg.authFetch(url, options);
  }

  function putWithProgress(signedUrl, blob, type, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("PUT", signedUrl);
      xhr.setRequestHeader("content-type", type);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.setRequestHeader("cache-control", "max-age=31536000");
      xhr.upload.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = function () { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error("Storage respondeu " + xhr.status)); };
      xhr.onerror = function () { reject(new Error("Falha de rede ao enviar para o Storage")); };
      xhr.send(blob);
    });
  }

  async function legacyUpload(blob, purpose, name) {
    var fd = new FormData();
    fd.append("file", new File([blob], name + "." + extOf(blob.type), { type: blob.type }));
    fd.append("title", name); fd.append("purpose", purpose);
    var r = await authFetch("/api/upload", { method: "POST", body: fd });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok || !d.url) throw new Error(d.error || "Falha no envio");
    return { url: d.url, path: d.path };
  }

  /** Envia um Blob e SO retorna sucesso apos confirmar que a URL publica responde. */
  async function upload(blob, opts) {
    var purpose = opts.purpose, name = opts.name || "arquivo", type = blob.type;
    var signed = await authFetch("/api/upload?action=sign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ purpose: purpose, name: name, contentType: type, size: blob.size }) });
    var sd = await signed.json().catch(function () { return {}; });
    if (!signed.ok) throw fail(sd.error || "O servidor recusou o envio do arquivo.");
    var path = sd.path, url = sd.publicUrl;
    try { await putWithProgress(sd.signedUrl, blob, type, opts.onProgress); }
    catch (err) {
      if (blob.size > 4 * 1024 * 1024) throw fail("Falha ao enviar o arquivo (" + err.message + "). Verifique a conexao e tente novamente.");
      var leg = await legacyUpload(blob, purpose, name); path = leg.path; url = leg.url; // arquivos pequenos: caminho alternativo
    }
    var vr = await authFetch("/api/upload?action=verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: path, size: blob.size }) });
    var vd = await vr.json().catch(function () { return {}; });
    if (!vr.ok || !vd.ok) throw fail("O arquivo foi enviado, mas a URL publica nao respondeu corretamente (" + (vd.status || "sem resposta") + "). O item NAO foi publicado; tente novamente.");
    if (opts.onProgress) opts.onProgress(100);
    return { url: vd.url || url, path: path, size: blob.size, type: type };
  }

  /** Fluxo completo de imagem: processa -> (original opcional) -> miniatura -> envia. */
  async function uploadImage(file, opts) {
    opts = opts || {};
    var purpose = opts.purpose || "product-image";
    var p = await processImage(file, { purpose: purpose, thumb: Boolean(opts.thumb) });
    var name = opts.name || "imagem";
    var main = await upload(p.blob, { purpose: purpose, name: name, onProgress: opts.onProgress });
    var out = { url: main.url, path: main.path, width: p.width, height: p.height, converted: p.converted, bytes: p.blob.size, originalBytes: p.originalBytes, thumbUrl: "", originalUrl: "" };
    if (p.thumb) { try { out.thumbUrl = (await upload(p.thumb.blob, { purpose: "banner-thumb", name: name })).url; } catch (e) { /* miniatura e opcional */ } }
    if (opts.keepOriginal && p.converted && file.size <= 8 * 1024 * 1024) { try { out.originalUrl = (await upload(file, { purpose: "banner-original", name: name })).url; } catch (e) { /* recuperacao e opcional */ } }
    return out;
  }

  async function uploadVideo(file, opts) {
    opts = opts || {};
    var info = await inspectVideo(file, { maxMb: opts.maxMb });
    var up = await upload(file, { purpose: "banner-video", name: opts.name || "video", onProgress: opts.onProgress });
    var posterUrl = "";
    if (info.poster) { try { posterUrl = (await upload(info.poster.blob, { purpose: "banner-thumb", name: (opts.name || "video") + "-poster" })).url; } catch (e) { /* sem poster */ } }
    return { url: up.url, path: up.path, posterUrl: posterUrl, duration: info.duration, width: info.width, height: info.height, warning: info.warning, bytes: file.size };
  }

  var api = {
    LIMITS: LIMITS, sniff: sniff, fit: fit, codecOf: codecOf, extOf: extOf,
    configure: function (o) { Object.assign(cfg, o || {}); },
    processImage: processImage, inspectVideo: inspectVideo, upload: upload, uploadImage: uploadImage, uploadVideo: uploadVideo
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.KairosMedia = api;
}(typeof window !== "undefined" ? window : globalThis));
