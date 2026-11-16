/* Kairos Admin - Banners e carrossel principal (ate 5 itens ativos, imagens e videos, desktop e mobile).
   Persistencia real: settings.banners[] e settings.carousel (tabela settings, chave "store"), via PUT /api/catalog. */
(function () {
  "use strict";
  var A = window.KairosAdmin;
  if (!A || !window.KairosMedia) return;
  var state = A.state, esc = A.escapeHtml, M = window.KairosMedia;
  var MAX_ACTIVE = 5;
  var DEFAULTS = { enabled: true, autoplay: true, interval: 6, arrows: true, dots: true, swipe: true, pauseOnInteraction: true, pauseHidden: true, videoMaxMb: 30 };
  var root = null, editor = null;

  function cfg() { return Object.assign({}, DEFAULTS, state.settings.carousel || {}); }
  function items() { if (!Array.isArray(state.settings.banners)) state.settings.banners = []; return state.settings.banners; }
  function sorted() { return items().slice().sort(function (a, b) { return Number(a.order || 0) - Number(b.order || 0); }); }
  function activeCount(except) { return items().filter(function (b) { return b.active !== false && b.id !== except; }).length; }
  function toIsoLocal(iso) { if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return ""; var p = function (n) { return String(n).padStart(2, "0"); }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()); }
  function fromLocal(v) { if (!v) return ""; var d = new Date(v); return isNaN(d) ? "" : d.toISOString(); }
  function fmt(iso) { return iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""; }
  function statusOf(b) {
    if (b.active === false) return ["Inativo", "st-inactive"];
    var now = Date.now();
    if (b.startAt && now < Date.parse(b.startAt)) return ["Agendado", "st-draft"];
    if (b.endAt && now > Date.parse(b.endAt)) return ["Expirado", "st-warn"];
    return ["Ativo na loja", "st-published"];
  }
  function thumbOf(b) { return b.poster || b.desktopImage || b.mobileImage || ""; }

  function build() {
    var section = document.getElementById("section-banners");
    if (!section || root) return;
    root = document.createElement("div");
    root.className = "admin-card";
    root.id = "carouselRoot";
    section.insertBefore(root, section.firstChild);
    // Remove da tela os campos antigos do carrossel (a nova area os substitui); campos do banner principal e da barra promocional permanecem.
    var form = document.getElementById("bannerForm");
    if (form) {
      form.querySelectorAll('[name^="carousel"], #bannerPreview').forEach(function (el) { var box = el.closest("label") || el; box.hidden = true; });
      var h = document.createElement("h3"); h.textContent = "Banner de fundo e barra promocional"; h.className = "full"; form.insertBefore(h, form.firstChild);
    }
    var oldList = document.getElementById("bannerList");
    if (oldList) { var card = oldList.closest(".admin-card"); if (card) card.hidden = true; }
    root.addEventListener("click", onClick);
    root.addEventListener("change", onChange);
  }

  function render() {
    build();
    if (!root) return;
    var c = cfg(), list = sorted(), active = activeCount();
    root.innerHTML = '<div class="insight-head"><div><h2>Banners e carrossel principal</h2><p class="admin-hint">Ate ' + MAX_ACTIVE + ' itens ativos (banners e videos juntos), na ordem abaixo. Com 1 item a loja exibe estatico, sem setas nem indicadores. Recomendado: desktop 16:9 (1920×1080) e mobile 1080×1350 ou 1080×1920. Imagens sao convertidas para WebP sem cortar.</p></div>' +
      '<div class="cat-form"><strong>' + active + ' de ' + MAX_ACTIVE + ' ativos</strong><button class="primary-button compact" type="button" data-car="new">Novo banner ou video</button></div></div>' +
      '<div class="car-cfg">' +
      chk("enabled", "Carrossel ativo na loja", c.enabled) + chk("autoplay", "Reproducao automatica", c.autoplay) + chk("arrows", "Setas laterais", c.arrows) + chk("dots", "Indicadores de posicao", c.dots) +
      chk("swipe", "Deslizar no celular", c.swipe) + chk("pauseOnInteraction", "Pausar ao interagir", c.pauseOnInteraction) + chk("pauseHidden", "Pausar com a aba inativa", c.pauseHidden) +
      '<label>Intervalo (s)<input type="number" min="3" max="30" data-cfg="interval" value="' + esc(c.interval) + '"></label>' +
      '<label>Limite de video (MB)<input type="number" min="5" max="100" data-cfg="videoMaxMb" value="' + esc(c.videoMaxMb) + '"></label>' +
      '<button class="secondary-button compact" type="button" data-car="saveCfg">Salvar configuracoes</button></div>' +
      '<div class="admin-list car-list">' + (list.map(function (b, i) {
        var st = statusOf(b), isVideo = b.type === "video" || (!b.desktopImage && !b.mobileImage && (b.videoUrl || b.mobileVideoUrl));
        return '<article class="admin-item car-item"><img src="' + esc(thumbOf(b)) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'"><div><h3>' + esc(b.title || "Sem titulo") + ' <span class="st-badge ' + (isVideo ? "st-feat" : "") + '">' + (isVideo ? "Video" : "Imagem") + '</span> <span class="st-badge ' + st[1] + '">' + st[0] + '</span></h3>' +
          '<p>Ordem ' + (i + 1) + (b.link ? " · " + esc(b.link) : "") + (b.startAt || b.endAt ? " · " + esc(fmt(b.startAt) || "sempre") + " ate " + esc(fmt(b.endAt) || "sem fim") : "") + '</p></div>' +
          '<div class="admin-item-actions"><button class="secondary-button compact" type="button" data-car="up" data-id="' + esc(b.id) + '"' + (i === 0 ? " disabled" : "") + '>↑</button><button class="secondary-button compact" type="button" data-car="down" data-id="' + esc(b.id) + '"' + (i === list.length - 1 ? " disabled" : "") + '>↓</button>' +
          '<button class="secondary-button compact" type="button" data-car="toggle" data-id="' + esc(b.id) + '">' + (b.active === false ? "Ativar" : "Desativar") + '</button>' +
          '<button class="secondary-button compact" type="button" data-car="edit" data-id="' + esc(b.id) + '">Editar</button>' +
          '<button class="danger-button compact" type="button" data-car="del" data-id="' + esc(b.id) + '">Excluir</button></div></article>';
      }).join("") || '<p class="admin-hint">Nenhum item cadastrado. Clique em "Novo banner ou video".</p>') + '</div>';
  }
  function chk(k, label, v) { return '<label class="bump-check"><input type="checkbox" data-cfg="' + k + '"' + (v ? " checked" : "") + '> ' + label + '</label>'; }

  function readCfg() {
    var out = {};
    root.querySelectorAll("[data-cfg]").forEach(function (el) { out[el.dataset.cfg] = el.type === "checkbox" ? el.checked : Number(el.value); });
    return out;
  }
  function onChange() { /* configuracoes so persistem ao clicar em Salvar */ }

  async function onClick(e) {
    var b = e.target.closest("[data-car]"); if (!b) return;
    var act = b.dataset.car, id = b.dataset.id, list = items(), item = list.find(function (x) { return x.id === id; });
    if (act === "new") return openEditor(null);
    if (act === "edit") return openEditor(item);
    if (act === "saveCfg") {
      var c = readCfg(); c.interval = Math.min(30, Math.max(3, c.interval || 6)); c.videoMaxMb = Math.min(100, Math.max(5, c.videoMaxMb || 30));
      state.settings.carousel = Object.assign({}, cfg(), c);
      await A.saveCatalog(); render(); return;
    }
    if (!item) return;
    if (act === "toggle") {
      if (item.active === false && activeCount(item.id) >= MAX_ACTIVE) { alert("O carrossel aceita no maximo " + MAX_ACTIVE + " itens ativos. Desative outro item primeiro."); return; }
      item.active = item.active === false; await A.saveCatalog(); render(); return;
    }
    if (act === "del") {
      if (!confirm('Excluir "' + (item.title || "este item") + '" do carrossel? Os arquivos enviados continuam no Storage.')) return;
      state.settings.banners = list.filter(function (x) { return x.id !== id; }); await A.saveCatalog(); render(); return;
    }
    if (act === "up" || act === "down") {
      var s = sorted(), i = s.findIndex(function (x) { return x.id === id; }), j = act === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= s.length) return;
      s.splice(j, 0, s.splice(i, 1)[0]);
      s.forEach(function (x, n) { x.order = n + 1; });
      await A.saveCatalog(); render();
    }
  }

  // ---------------- editor ----------------
  function openEditor(item) {
    var draft = Object.assign({ id: "", title: "", type: "image", altText: "", link: "", active: true, desktopImage: "", mobileImage: "", videoUrl: "", mobileVideoUrl: "", poster: "", mobilePoster: "", startAt: "", endAt: "" }, item || {});
    if (item && !item.type) draft.type = (!item.desktopImage && !item.mobileImage && (item.videoUrl || item.mobileVideoUrl)) ? "video" : "image";
    var busy = 0, view = "desktop";
    var m = document.createElement("div");
    m.className = "cat-modal";
    m.innerHTML = '<div class="cat-modal-card car-editor" role="dialog" aria-modal="true"><h2>' + (item ? "Editar" : "Novo") + ' item do carrossel</h2>' +
      '<div class="cat-form"><label>Tipo<select data-f="type"><option value="image">Banner (imagem)</option><option value="video">Video</option></select></label>' +
      '<label>Titulo interno<input data-f="title" maxlength="160" placeholder="ex.: Natal 2026 - ofertas"></label>' +
      '<label>Link de destino<input data-f="link" placeholder="#produtos, /categoria ou https://..."></label>' +
      '<label>Texto alternativo (acessibilidade)<input data-f="altText" maxlength="200"></label>' +
      '<label>Exibir a partir de<input type="datetime-local" data-f="startAt"></label><label>Exibir ate<input type="datetime-local" data-f="endAt"></label>' +
      '<label class="bump-check"><input type="checkbox" data-f="active"> Ativo na loja</label></div>' +
      '<div class="car-slots" id="carSlots"></div>' +
      '<div class="cat-form"><strong>Previa:</strong><button type="button" class="secondary-button compact" data-v="desktop">Desktop</button><button type="button" class="secondary-button compact" data-v="mobile">Mobile</button></div>' +
      '<div class="car-preview" id="carPreview"></div><p class="err" id="carErr"></p>' +
      '<div class="admin-actions"><button class="primary-button" type="button" id="carSave">Salvar item</button><button class="secondary-button" type="button" data-close>Cancelar</button></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function (e) { if (e.target === m || e.target.closest("[data-close]")) m.remove(); });
    var $ = function (s) { return m.querySelector(s); };
    m.querySelectorAll("[data-f]").forEach(function (el) {
      var k = el.dataset.f;
      if (el.type === "checkbox") el.checked = draft[k] !== false;
      else if (k === "startAt" || k === "endAt") el.value = toIsoLocal(draft[k]);
      else el.value = draft[k] || "";
      el.addEventListener("input", function () { sync(); });
      el.addEventListener("change", function () { sync(); if (k === "type") drawSlots(); });
    });
    function sync() {
      m.querySelectorAll("[data-f]").forEach(function (el) {
        var k = el.dataset.f;
        draft[k] = el.type === "checkbox" ? el.checked : (k === "startAt" || k === "endAt") ? fromLocal(el.value) : el.value;
      });
      drawPreview();
    }
    function slotHtml(key, label, kind) {
      var url = draft[key], isV = kind === "video";
      return '<div class="car-slot" data-slot="' + key + '"><strong>' + label + '</strong>' +
        (url ? (isV ? '<video src="' + esc(url) + '" muted playsinline preload="metadata" class="car-thumb"></video>' : '<img src="' + esc(url) + '" alt="" class="car-thumb">') : '<div class="car-empty">Sem arquivo</div>') +
        '<div class="car-bar" hidden><i></i></div><small class="car-info"></small>' +
        '<label class="secondary-button compact car-up">Enviar ' + (isV ? "video (MP4/WebM)" : "imagem (JPG, PNG, WebP)") + '<input type="file" hidden accept="' + (isV ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp") + '"></label>' +
        '<input type="url" placeholder="ou cole uma URL https" value="' + esc(url) + '" data-url="' + key + '">' + (url ? '<button type="button" class="link-button" data-clear="' + key + '">Remover</button>' : "") + '</div>';
    }
    function drawSlots() {
      var t = draft.type;
      $("#carSlots").innerHTML = t === "video"
        ? slotHtml("videoUrl", "Video desktop", "video") + slotHtml("mobileVideoUrl", "Video mobile (opcional)", "video") + slotHtml("poster", "Capa (poster) desktop", "image") + slotHtml("mobilePoster", "Capa mobile (opcional)", "image")
        : slotHtml("desktopImage", "Imagem desktop (16:9)", "image") + slotHtml("mobileImage", "Imagem mobile (opcional)", "image");
      drawPreview();
    }
    function drawPreview() {
      var t = draft.type, mob = view === "mobile";
      var img = mob ? (draft.mobileImage || draft.desktopImage) : (draft.desktopImage || draft.mobileImage);
      var vid = mob ? (draft.mobileVideoUrl || draft.videoUrl) : (draft.videoUrl || draft.mobileVideoUrl);
      var poster = mob ? (draft.mobilePoster || draft.poster || draft.desktopImage) : (draft.poster || draft.desktopImage);
      var inner = t === "video" ? (vid ? '<video src="' + esc(vid) + '" poster="' + esc(poster) + '" muted playsinline controls preload="metadata"></video>' : '<div class="car-empty">Envie um video</div>')
        : (img ? '<img src="' + esc(img) + '" alt="">' : '<div class="car-empty">Envie uma imagem</div>');
      $("#carPreview").innerHTML = '<div class="car-frame ' + (mob ? "mobile" : "desktop") + '">' + inner + '</div>' + (!mob || !(t === "video" ? draft.mobileVideoUrl : draft.mobileImage) ? (mob ? '<p class="admin-hint">Sem arquivo mobile: a loja usa o de desktop, sem distorcer.</p>' : "") : "");
      m.querySelectorAll("[data-v]").forEach(function (b) { b.classList.toggle("active", b.dataset.v === view); });
    }
    m.addEventListener("click", function (e) {
      var v = e.target.closest("[data-v]"); if (v) { view = v.dataset.v; drawPreview(); }
      var clr = e.target.closest("[data-clear]"); if (clr) { draft[clr.dataset.clear] = ""; drawSlots(); }
    });
    m.addEventListener("change", async function (e) {
      var url = e.target.closest("[data-url]");
      if (url) { var val = url.value.trim(); if (val && !/^https:\/\//i.test(val)) { $("#carErr").textContent = "Use uma URL https."; return; } draft[url.dataset.url] = val; $("#carErr").textContent = ""; drawSlots(); return; }
      if (e.target.type !== "file" || !e.target.files[0]) return;
      var slot = e.target.closest("[data-slot]"), key = slot.dataset.slot, file = e.target.files[0];
      var bar = slot.querySelector(".car-bar"), fill = bar.firstElementChild, info = slot.querySelector(".car-info");
      bar.hidden = false; fill.style.width = "0%"; info.textContent = "Processando..."; $("#carErr").textContent = ""; busy++; $("#carSave").disabled = true;
      M.configure({ authFetch: A.authFetch, videoMaxMb: cfg().videoMaxMb });
      var name = (draft.title || "banner") + "-" + key;
      try {
        var res;
        if (key === "videoUrl" || key === "mobileVideoUrl") {
          res = await M.uploadVideo(file, { name: name, maxMb: cfg().videoMaxMb, onProgress: function (p) { fill.style.width = p + "%"; info.textContent = "Enviando " + p + "%"; } });
          draft[key] = res.url;
          if (key === "videoUrl" && res.posterUrl && !draft.poster) draft.poster = res.posterUrl;
          if (key === "mobileVideoUrl" && res.posterUrl && !draft.mobilePoster) draft.mobilePoster = res.posterUrl;
          drawSlots();
          var s2 = m.querySelector('[data-slot="' + key + '"] .car-info'); if (s2) s2.textContent = "Enviado (" + (res.bytes / 1048576).toFixed(1) + " MB, " + Math.round(res.duration) + "s)." + (res.warning ? " " + res.warning : "");
        } else {
          var purpose = key === "mobileImage" ? "banner-mobile" : key === "desktopImage" ? "banner-desktop" : "banner-poster";
          res = await M.uploadImage(file, { purpose: purpose, name: name, thumb: purpose !== "banner-poster", keepOriginal: purpose !== "banner-poster", onProgress: function (p) { fill.style.width = p + "%"; info.textContent = "Enviando " + p + "%"; } });
          draft[key] = res.url;
          drawSlots();
          var s3 = m.querySelector('[data-slot="' + key + '"] .car-info'); if (s3) s3.textContent = "Salvo e verificado: " + res.width + "×" + res.height + ", " + Math.round(res.bytes / 1024) + " KB" + (res.converted ? " (WebP; original " + Math.round(res.originalBytes / 1024) + " KB)" : "");
        }
      } catch (err) {
        bar.hidden = true; info.textContent = ""; $("#carErr").textContent = (err.userMessage || err.message || "Falha no envio.") + " O item nao foi alterado.";
      } finally { busy--; if (!busy) $("#carSave").disabled = false; }
    });
    $("#carSave").addEventListener("click", async function () {
      sync();
      var err = $("#carErr"); err.textContent = "";
      if (busy) { err.textContent = "Aguarde o termino dos envios."; return; }
      var t = draft.type;
      var hasMedia = t === "video" ? (draft.videoUrl || draft.mobileVideoUrl) : (draft.desktopImage || draft.mobileImage);
      if (!draft.title.trim()) { err.textContent = "Informe o titulo interno."; return; }
      if (!hasMedia) { err.textContent = t === "video" ? "Envie ao menos um video." : "Envie ao menos uma imagem."; return; }
      if (draft.link && !/^(#|\/(?!\/)|\.\/|https?:\/\/)/i.test(draft.link)) { err.textContent = "Link invalido. Use #secao, /caminho ou https://..."; return; }
      if (draft.startAt && draft.endAt && Date.parse(draft.endAt) <= Date.parse(draft.startAt)) { err.textContent = "O fim deve ser depois do inicio."; return; }
      var wantsActive = draft.active !== false, list = items(), existing = item ? list.find(function (x) { return x.id === item.id; }) : null;
      if (wantsActive && activeCount(existing && existing.id) >= MAX_ACTIVE) { draft.active = false; alert("Ja existem " + MAX_ACTIVE + " itens ativos. O item foi salvo como INATIVO; desative outro para ativa-lo."); }
      var record = Object.assign({}, existing || {}, draft, { id: existing ? existing.id : A.slugify(draft.title + "-" + Date.now()), order: existing ? existing.order : (list.reduce(function (mx, x) { return Math.max(mx, Number(x.order) || 0); }, 0) + 1) });
      if (t === "video") { record.desktopImage = record.desktopImage || ""; } else { record.videoUrl = ""; record.mobileVideoUrl = ""; record.poster = ""; record.mobilePoster = ""; }
      if (existing) Object.assign(existing, record); else list.push(record);
      m.remove();
      await A.saveCatalog(); render();
    });
    drawSlots();
    sync();
  }

  function init() { render(); }
  document.getElementById("adminNav")?.addEventListener("click", function (e) { if (e.target.closest('[data-section="banners"]')) render(); });
  // renderAll() do admin.js chama renderBanners(): reaproveita o gancho para redesenhar apos salvar/carregar.
  var tries = 0, t = setInterval(function () { if (state.settings && (state.products.length || tries++ > 40)) { clearInterval(t); init(); } }, 250);
  window.KairosCarousel = { render: render, statusOf: statusOf };
}());
