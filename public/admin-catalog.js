/* Kairos Admin - gestao de catalogo em escala: lista paginada, lote, importacao/exportacao CSV e galeria de midias.
   Usa a mesma API e o mesmo estado do admin.js (window.KairosAdmin). Nao cria tabelas novas. */
(function () {
  "use strict";
  const A = window.KairosAdmin;
  if (!A) return;
  const { state, toast, escapeHtml, formatCurrency } = A;
  const esc = escapeHtml;

  const norm = (v) => String(v == null ? "" : v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const key = (v) => norm(v).replace(/[^a-z0-9]/g, "");

  // ---------- regras de validacao (espelham o servidor: api/catalog.js isPublishable) ----------
  function validCheckout(url) { return /^https:\/\/[^\s?]+(\?[^?\s]*)?$/i.test(String(url || "").trim()); }
  function validImage(url) { return /^https:\/\/\S+$/i.test(String(url || "").trim()); }
  function categoryExists(name) {
    const n = norm(name);
    return state.categories.some((c) => norm(c.name) === n) || state.products.some((p) => p.visible !== false && norm(p.category) === n);
  }
  function publishable(p) { return Boolean(String(p.title || "").trim()) && Number(p.price) > 0 && validCheckout(p.checkoutUrl) && Boolean(p.category) && categoryExists(p.category); }
  function statusOf(p) {
    if (p.visible !== false) return "published";
    return state.settings.drafts && state.settings.drafts[p.id] ? "draft" : "inactive";
  }
  const STATUS_LABEL = { published: "Publicado", draft: "Rascunho", inactive: "Inativo" };

  function setDraft(id, on) {
    const drafts = { ...(state.settings.drafts || {}) };
    if (on) drafts[id] = true; else delete drafts[id];
    state.settings.drafts = drafts;
  }

  // ================= LISTA PAGINADA + FILTROS + LOTE =================
  const f = { q: "", cat: "", status: "", issue: "", sort: "order", page: 1, size: 25 };
  const selected = new Set();
  let ui = null;

  function buildUi() {
    const list = document.getElementById("productList");
    if (!list || ui) return;
    const card = list.closest(".admin-card");
    const head = document.createElement("div");
    head.className = "cat-tools";
    head.innerHTML = `
      <div class="cat-actions">
        <button class="primary-button compact" type="button" id="catImport">Importar CSV</button>
        <button class="secondary-button compact" type="button" id="catExport">Exportar catalogo</button>
      </div>
      <div class="cat-filters">
        <label class="bump-check"><input type="checkbox" id="catSelPage"> Pagina</label>
        <input type="search" id="catQ" placeholder="Buscar por nome, SKU ou categoria...">
        <select id="catCat"><option value="">Todas as categorias</option></select>
        <select id="catStatus"><option value="">Todos os status</option><option value="published">Publicados</option><option value="draft">Rascunhos</option><option value="inactive">Inativos</option></select>
        <select id="catIssue"><option value="">Sem filtro de pendencia</option><option value="noCheckout">Sem checkout</option><option value="noImage">Sem imagem</option><option value="noPrice">Sem preco</option></select>
        <select id="catSort"><option value="order">Ordem da loja</option><option value="title">Nome A-Z</option><option value="priceAsc">Menor preco</option><option value="priceDesc">Maior preco</option></select>
      </div>
      <div class="cat-batch" id="catBatch" hidden>
        <strong id="catSelCount"></strong>
        <button type="button" class="link-button" id="catSelAll"></button>
        <select id="catBatchCat"><option value="">Mudar categoria...</option></select>
        <button class="secondary-button compact" type="button" data-batch="activate">Ativar</button>
        <button class="secondary-button compact" type="button" data-batch="deactivate">Desativar</button>
        <button class="secondary-button compact" type="button" data-batch="featureOn">Destacar</button>
        <button class="secondary-button compact" type="button" data-batch="featureOff">Tirar destaque</button>
        <button class="secondary-button compact" type="button" data-batch="price">Alterar precos</button>
        <button class="secondary-button compact" type="button" data-batch="export">Exportar selecao</button>
        <button class="danger-button compact" type="button" data-batch="delete">Excluir</button>
      </div>`;
    card.insertBefore(head, list);
    const pager = document.createElement("div");
    pager.className = "cat-pager";
    pager.id = "catPager";
    list.after(pager);
    ui = { list, pager, q: head.querySelector("#catQ"), cat: head.querySelector("#catCat"), status: head.querySelector("#catStatus"), issue: head.querySelector("#catIssue"), sort: head.querySelector("#catSort"), batch: head.querySelector("#catBatch"), selCount: head.querySelector("#catSelCount"), selAll: head.querySelector("#catSelAll"), batchCat: head.querySelector("#catBatchCat") };
    let t;
    ui.q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { f.q = ui.q.value; f.page = 1; render(); }, 180); });
    [["cat", "cat"], ["status", "status"], ["issue", "issue"], ["sort", "sort"]].forEach(([el, k]) => ui[el].addEventListener("change", () => { f[k] = ui[el].value; f.page = 1; render(); }));
    head.querySelector("#catImport").addEventListener("click", openImport);
    head.querySelector("#catExport").addEventListener("click", () => exportCsv(state.products, "kairos-catalogo"));
    head.querySelector("#catSelPage").addEventListener("change", (e) => {
      const page = filtered().slice((f.page - 1) * f.size, f.page * f.size);
      page.forEach((p) => (e.target.checked ? selected.add(p.id) : selected.delete(p.id)));
      render();
    });
    ui.selAll.addEventListener("click", () => { filtered().forEach((p) => selected.add(p.id)); render(); });
    ui.batchCat.addEventListener("change", () => { if (ui.batchCat.value) batchCategory(ui.batchCat.value); ui.batchCat.value = ""; });
    head.querySelectorAll("[data-batch]").forEach((b) => b.addEventListener("click", () => runBatch(b.dataset.batch)));
    pager.addEventListener("click", (e) => {
      const b = e.target.closest("[data-page]"); if (!b) return;
      f.page = Number(b.dataset.page); render(); ui.list.scrollIntoView({ block: "start" });
    });
    pager.addEventListener("change", (e) => { if (e.target.id === "catSize") { f.size = Number(e.target.value); f.page = 1; render(); } });
    ui.list.addEventListener("click", onListClick);
    ui.list.addEventListener("change", (e) => {
      if (!e.target.matches("[data-sel]")) return;
      if (e.target.checked) selected.add(e.target.dataset.sel); else selected.delete(e.target.dataset.sel);
      renderBatchBar();
    });
  }

  function filtered() {
    const q = norm(f.q);
    let rows = state.products.filter((p) => {
      if (q && !norm(`${p.title} ${p.sku} ${p.category} ${p.subcategory}`).includes(q)) return false;
      if (f.cat && p.category !== f.cat) return false;
      if (f.status && statusOf(p) !== f.status) return false;
      if (f.issue === "noCheckout" && p.checkoutUrl) return false;
      if (f.issue === "noImage" && p.image) return false;
      if (f.issue === "noPrice" && Number(p.price) > 0) return false;
      return true;
    });
    const by = { order: (a, b) => (a.order || 0) - (b.order || 0), title: (a, b) => String(a.title).localeCompare(String(b.title), "pt-BR"), priceAsc: (a, b) => a.price - b.price, priceDesc: (a, b) => b.price - a.price }[f.sort];
    return rows.sort(by);
  }

  function render() {
    buildUi();
    if (!ui) return;
    const countEl = document.getElementById("productCount");
    const rows = filtered();
    if (countEl) countEl.textContent = rows.length === state.products.length ? String(rows.length) : `${rows.length} de ${state.products.length}`;
    // categorias nos selects (preserva selecao)
    const names = [...new Set([...state.categories.map((c) => c.name), ...state.products.map((p) => p.category)])].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
    const opts = names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
    ui.cat.innerHTML = `<option value="">Todas as categorias</option>${opts}`; ui.cat.value = f.cat;
    ui.batchCat.innerHTML = `<option value="">Mudar categoria...</option>${state.categories.map((c) => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join("")}`;
    const pages = Math.max(1, Math.ceil(rows.length / f.size));
    if (f.page > pages) f.page = pages;
    const slice = rows.slice((f.page - 1) * f.size, f.page * f.size);
    ui.list.innerHTML = slice.map((p) => {
      const st = statusOf(p);
      const flags = [!p.checkoutUrl ? "sem checkout" : "", !p.image ? "sem imagem" : "", !(Number(p.price) > 0) ? "sem preco" : ""].filter(Boolean);
      return `<article class="admin-item cat-item">
        <label class="cat-check"><input type="checkbox" data-sel="${esc(p.id)}" ${selected.has(p.id) ? "checked" : ""} aria-label="Selecionar"></label>
        <img src="${esc(p.image || "")}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        <div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.category)}${p.sku ? " · SKU " + esc(p.sku) : ""} · ${formatCurrency(p.price)} <span class="st-badge st-${st}">${STATUS_LABEL[st]}</span>${p.featured !== false ? ' <span class="st-badge st-feat">Destaque</span>' : ""}${flags.map((x) => ` <span class="st-badge st-warn">${x}</span>`).join("")}</p>
        </div>
        <div class="admin-item-actions">
          <button class="secondary-button compact" type="button" data-product-edit="${esc(p.id)}">Editar</button>
          <button class="danger-button compact" type="button" data-product-delete="${esc(p.id)}">Excluir</button>
        </div></article>`;
    }).join("") || '<p class="admin-hint" style="padding:12px">Nenhum produto encontrado com esses filtros.</p>';
    const btn = (p, label, dis, cur) => `<button type="button" class="secondary-button compact ${cur ? "active" : ""}" data-page="${p}" ${dis ? "disabled" : ""}>${label}</button>`;
    ui.pager.innerHTML = `${btn(f.page - 1, "‹ Anterior", f.page <= 1)}<span>Pagina ${f.page} de ${pages}</span>${btn(f.page + 1, "Proxima ›", f.page >= pages)}
      <select id="catSize">${[25, 50, 100].map((n) => `<option value="${n}" ${n === f.size ? "selected" : ""}>${n} por pagina</option>`).join("")}</select>`;
    renderBatchBar();
    const sp = document.getElementById("catSelPage");
    if (sp) sp.checked = slice.length > 0 && slice.every((p) => selected.has(p.id));
  }

  function renderBatchBar() {
    const n = selected.size;
    ui.batch.hidden = n === 0;
    ui.selCount.textContent = `${n} selecionado(s)`;
    const total = filtered().length;
    ui.selAll.textContent = total > n ? `Selecionar todos os ${total} filtrados` : "";
    ui.selAll.hidden = !(total > n);
  }

  function onListClick(e) {
    const ed = e.target.closest("[data-product-edit]");
    if (ed) { const p = A.productById(ed.dataset.productEdit); if (p) { A.fillProductForm(p); document.getElementById("productForm").scrollIntoView({ block: "start" }); } return; }
    const del = e.target.closest("[data-product-delete]");
    if (del) deleteProducts([del.dataset.productDelete]);
  }

  // ---------- operacoes em lote (nunca alteram IDs) ----------
  const selectedProducts = () => state.products.filter((p) => selected.has(p.id));
  async function commit(message) {
    selected.clear();
    await A.saveCatalog();
    if (message) toast(message);
    render();
  }
  function mutate(ids, fn) {
    const set = new Set(ids);
    state.products = state.products.map((p) => (set.has(p.id) ? { ...p, ...fn(p) } : p));
  }

  async function batchCategory(name) {
    const ids = [...selected];
    if (!confirm(`Mover ${ids.length} produto(s) para a categoria "${name}"?`)) return;
    mutate(ids, () => ({ category: name }));
    await commit();
  }

  async function runBatch(action) {
    const rows = selectedProducts();
    if (!rows.length) return;
    const ids = rows.map((p) => p.id);
    if (action === "activate") {
      const ok = rows.filter(publishable);
      const skipped = rows.length - ok.length;
      if (!ok.length) { alert("Nenhum item selecionado pode ser ativado: faltam nome, preco, categoria cadastrada ou checkout https valido."); return; }
      if (!confirm(`Ativar ${ok.length} produto(s) na loja?${skipped ? `\n${skipped} serao mantidos fora da loja por dados incompletos.` : ""}`)) return;
      ok.forEach((p) => setDraft(p.id, false));
      mutate(ok.map((p) => p.id), () => ({ visible: true }));
      await commit(skipped ? `${ok.length} ativados; ${skipped} nao ativados (dados incompletos).` : "");
    } else if (action === "deactivate") {
      if (!confirm(`Desativar ${ids.length} produto(s)? Eles saem da loja, mas continuam cadastrados.`)) return;
      mutate(ids, () => ({ visible: false }));
      await commit();
    } else if (action === "featureOn" || action === "featureOff") {
      mutate(ids, () => ({ featured: action === "featureOn" }));
      await commit();
    } else if (action === "price") openPriceDialog(rows);
    else if (action === "export") exportCsv(rows, "kairos-selecao");
    else if (action === "delete") deleteProducts(ids);
  }

  async function deleteProducts(ids) {
    const rows = ids.map((id) => A.productById(id)).filter(Boolean);
    if (!rows.length) return;
    const sample = rows.slice(0, 5).map((p) => `- ${p.title}`).join("\n");
    if (!confirm(`EXCLUIR DEFINITIVAMENTE ${rows.length} produto(s)?\n\n${sample}${rows.length > 5 ? `\n... e mais ${rows.length - 5}` : ""}\n\nEsta acao nao pode ser desfeita. Para apenas tirar da loja, use "Desativar".`)) return;
    const gone = new Set(ids);
    state.products = state.products.filter((p) => !gone.has(p.id));
    state.deletedIds = [...(state.deletedIds || []), ...ids];
    // limpa referencias para nao deixar associacoes/links orfaos
    const ob = state.settings.orderBump;
    if (ob) {
      const links = {};
      Object.entries(ob.links || {}).forEach(([k, v]) => { if (!gone.has(k)) { const keep = v.filter((x) => !gone.has(x)); if (keep.length) links[k] = keep; } });
      const disabled = {}; Object.entries(ob.disabled || {}).forEach(([k, v]) => { if (!gone.has(k) && links[k]) disabled[k] = v; });
      state.settings.orderBump = { ...ob, links, disabled };
    }
    ["shortLinks", "drafts"].forEach((k) => { if (state.settings[k]) { const o = { ...state.settings[k] }; gone.forEach((id) => delete o[id]); state.settings[k] = o; } });
    await commit(`${rows.length} produto(s) excluido(s).`);
  }

  // ---------- alteracao de precos com confirmacao ----------
  function money(n) { return Math.round(n * 100) / 100; }
  function openPriceDialog(rows) {
    const m = modal(`<h2>Alterar precos (${rows.length} produtos)</h2>
      <div class="cat-form">
        <label>Tipo<select id="pcMode"><option value="pct">Percentual (%)</option><option value="add">Somar/subtrair valor (R$)</option><option value="set">Definir preco fixo (R$)</option></select></label>
        <label>Valor<input id="pcVal" type="number" step="0.01" placeholder="ex.: -10 ou 5"></label>
        <label class="bump-check"><input type="checkbox" id="pcOld"> Tambem ajustar o preco antigo (se existir)</label>
      </div>
      <div id="pcPrev" class="cat-preview admin-hint">Informe o valor para ver a previa.</div>
      <div class="admin-actions"><button class="primary-button" type="button" id="pcApply" disabled>Confirmar alteracao</button><button class="secondary-button" type="button" data-close>Cancelar</button></div>`);
    const calc = (v, mode, val) => money(mode === "pct" ? v * (1 + val / 100) : mode === "add" ? v + val : val);
    const refresh = () => {
      const val = Number(m.querySelector("#pcVal").value), mode = m.querySelector("#pcMode").value;
      const prev = m.querySelector("#pcPrev"), apply = m.querySelector("#pcApply");
      if (!m.querySelector("#pcVal").value || !Number.isFinite(val)) { prev.textContent = "Informe o valor para ver a previa."; apply.disabled = true; return; }
      const bad = rows.filter((p) => !(calc(Number(p.price), mode, val) > 0));
      prev.innerHTML = rows.slice(0, 6).map((p) => `<div>${esc(p.title)}: ${formatCurrency(p.price)} → <b>${formatCurrency(Math.max(calc(Number(p.price), mode, val), 0))}</b></div>`).join("") + (rows.length > 6 ? `<div>... e mais ${rows.length - 6}</div>` : "") + (bad.length ? `<div class="err">${bad.length} produto(s) ficariam com preco menor ou igual a zero. Ajuste o valor.</div>` : "");
      apply.disabled = bad.length > 0;
    };
    m.querySelector("#pcVal").addEventListener("input", refresh); m.querySelector("#pcMode").addEventListener("change", refresh);
    m.querySelector("#pcApply").addEventListener("click", async () => {
      const val = Number(m.querySelector("#pcVal").value), mode = m.querySelector("#pcMode").value, old = m.querySelector("#pcOld").checked;
      if (!confirm(`Confirmar a alteracao de preco em ${rows.length} produto(s)?`)) return;
      mutate(rows.map((p) => p.id), (p) => ({ price: calc(Number(p.price), mode, val), ...(old && p.oldPrice ? { oldPrice: calc(Number(p.oldPrice), mode, val) } : {}) }));
      m.remove();
      await commit("Precos atualizados.");
    });
  }

  function modal(inner) {
    const el = document.createElement("div");
    el.className = "cat-modal";
    el.innerHTML = `<div class="cat-modal-card" role="dialog" aria-modal="true">${inner}</div>`;
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-close]")) el.remove(); });
    document.body.appendChild(el);
    return el;
  }

  // ================= CSV =================
  const COLS = [["ID", "id"], ["Nome", "title"], ["SKU", "sku"], ["Categoria", "category"], ["Subcategoria", "subcategory"], ["Preço", "price"], ["Preço antigo", "oldPrice"], ["Descrição curta", "shortDescription"], ["Descrição completa", "description"], ["Link de checkout externo", "checkoutUrl"], ["Imagem principal", "image"], ["Status", "status"], ["Destaque", "featured"]];

  function toCsv(rows, delim = ";") {
    const cell = (v) => { let s = String(v == null ? "" : v); if (/^[=+@]/.test(s)) s = "'" + s; return /["\n\r;,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [COLS.map((c) => c[0]).join(delim)];
    rows.forEach((p) => lines.push(COLS.map(([, k]) => cell(k === "status" ? STATUS_LABEL[statusOf(p)] : k === "featured" ? (p.featured !== false ? "sim" : "nao") : k === "price" || k === "oldPrice" ? (p[k] ? String(p[k]).replace(".", ",") : "") : p[k])).join(delim)));
    return lines.join("\r\n");
  }
  function exportCsv(rows, name) {
    const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    toast(`${rows.length} produto(s) exportado(s).`);
  }

  function parseCsv(text) {
    text = String(text || "").replace(/^﻿/, "");
    const first = text.split(/\r?\n/, 1)[0] || "";
    const count = (c) => (first.match(new RegExp(c === "\t" ? "\\t" : "\\" + c, "g")) || []).length;
    const delim = [";", ",", "\t"].sort((a, b) => count(b) - count(a))[0];
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.some((x) => x.trim() !== "")) rows.push(row); row = []; }
      else cur += ch;
    }
    row.push(cur); if (row.some((x) => x.trim() !== "")) rows.push(row);
    return rows;
  }

  function parsePrice(v) {
    let s = String(v == null ? "" : v).replace(/[R$\s]/gi, "");
    if (!s) return NaN;
    if (/,/.test(s)) s = s.replace(/\./g, "").replace(",", "."); // 1.234,56
    return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }

  const ALIASES = {
    id: ["id", "identificador"], title: ["nome", "nomedoproduto", "produto", "titulo", "name", "title"], sku: ["sku", "codigo"], category: ["categoria", "category"],
    subcategory: ["subcategoria", "subcategory"], price: ["preco", "precoatual", "valor", "price"], oldPrice: ["precoantigo", "precode", "oldprice"],
    shortDescription: ["descricaocurta", "shortdescription"], description: ["descricaocompleta", "descricao", "description"],
    checkoutUrl: ["linkdecheckoutexterno", "linkdecheckout", "checkout", "checkouturl", "link"], image: ["imagemprincipal", "imagem", "image", "imageurl"],
    status: ["status", "situacao"], featured: ["destaque", "featured"]
  };

  // Analisa as linhas: nada e gravado aqui; devolve a previa com problemas por linha.
  function analyze(rows, opts) {
    if (rows.length < 2) return { items: [], error: "O arquivo precisa ter cabecalho e ao menos uma linha de produto." };
    const head = rows[0].map(key);
    const idx = {};
    Object.entries(ALIASES).forEach(([field, names]) => { const i = head.findIndex((h) => names.includes(h)); if (i >= 0) idx[field] = i; });
    if (idx.title === undefined) return { items: [], error: 'Coluna "Nome" nao encontrada no cabecalho.' };
    const bySku = new Map(); state.products.forEach((p) => { if (p.sku) bySku.set(norm(p.sku), p); });
    const byId = new Map(state.products.map((p) => [p.id, p]));
    const usedIds = new Set(state.products.map((p) => p.id));
    const seenSku = new Set();
    const newCats = new Set();
    let order = Math.max(0, ...state.products.map((p) => Number(p.order) || 0)) + 1;
    const items = rows.slice(1).map((r, n) => {
      const g = (f2) => (idx[f2] === undefined ? "" : String(r[idx[f2]] || "").trim().replace(/^'(?=[=+@])/, ""));
      const it = { line: n + 2, problems: [], notes: [], skip: false, data: {}, existing: null };
      const title = g("title"), sku = g("sku"), idIn = g("id");
      if (!title) { it.skip = true; it.problems.push("Sem nome (linha ignorada)"); }
      if (sku) {
        if (seenSku.has(norm(sku))) { it.skip = true; it.problems.push("SKU duplicado no arquivo (linha ignorada)"); }
        seenSku.add(norm(sku));
      }
      it.existing = (idIn && byId.get(idIn)) || (sku && bySku.get(norm(sku))) || null;
      if (it.existing) {
        if (opts.update) it.notes.push(`Atualiza produto existente (ID mantido: ${it.existing.id})`);
        else { it.skip = true; it.problems.push("SKU/ID ja existe (atualizacao desativada)"); }
      }
      const price = parsePrice(g("price"));
      const oldRaw = g("oldPrice"), oldPrice = oldRaw ? parsePrice(oldRaw) : null;
      const category = g("category"), checkout = g("checkoutUrl"), image = g("image");
      const blocking = [];
      if (!(price > 0)) blocking.push(g("price") === "" ? "Sem preco" : "Preco invalido");
      if (oldRaw && !(oldPrice > 0)) it.notes.push("Preco antigo invalido (ignorado)");
      if (!category) blocking.push("Sem categoria");
      else if (!categoryExists(category)) { if (opts.createCats) newCats.add(category); else blocking.push("Categoria inexistente"); }
      if (!checkout) blocking.push("Sem checkout"); else if (!validCheckout(checkout)) blocking.push("Checkout invalido");
      if (!image) blocking.push("Sem imagem"); else if (!validImage(image)) blocking.push("Imagem invalida");
      // quando atualiza, campos vazios mantem o valor atual: nao e problema
      const ex = it.existing;
      const effective = ex && opts.update ? blocking.filter((b) => !((b === "Sem preco" && ex.price > 0) || (b === "Sem categoria" && ex.category) || (b === "Sem checkout" && ex.checkoutUrl) || (b === "Sem imagem" && ex.image))) : blocking;
      it.problems.push(...effective);
      const st = norm(g("status"));
      const wantsActive = ["ativo", "publicado", "active", "published", "1", "sim", "true"].includes(st);
      const explicitInactive = ["inativo", "inactive", "desativado"].includes(st);
      it.data = { title, sku, category, subcategory: g("subcategory"), price, oldPrice: oldPrice > 0 ? oldPrice : null, shortDescription: g("shortDescription"), description: g("description"), checkoutUrl: checkout, image, featured: g("featured") };
      const complete = effective.length === 0;
      const keep = ex && opts.update && st === "" && !it.skip; // sem status na planilha: mantem a situacao atual do produto existente
      const forceDraft = opts.allDraft && !ex;
      it.final = it.skip ? "skip" : keep ? (statusOf(ex) === "published" && complete ? "published" : statusOf(ex) === "published" ? "keep" : statusOf(ex)) : (wantsActive && complete && !forceDraft) ? "published" : explicitInactive && !forceDraft ? "inactive" : "draft";
      if (!it.skip && wantsActive && !complete && !keep) it.notes.push("Pediu publicacao, mas ficara como rascunho");
      if (!it.skip && !ex) {
        let base = A.slugify(title), id = base, i = 2;
        while (usedIds.has(id)) id = `${base}-${i++}`;
        usedIds.add(id); it.id = id; it.order = order++;
      }
      return it;
    });
    return { items, newCats: [...newCats] };
  }

  function applyImport(items, newCats) {
    const drafts = { ...(state.settings.drafts || {}) };
    let created = 0, updated = 0, pub = 0, dr = 0;
    newCats.forEach((name) => { if (!categoryExists(name)) state.categories.push({ id: A.slugify(name), name, image: "", order: state.categories.length, active: true }); });
    const sets = (cur, d, ex) => {
      const o = { ...cur };
      ["title", "sku", "category", "subcategory", "shortDescription", "description", "checkoutUrl", "image"].forEach((k) => { if (d[k]) o[k] = d[k]; });
      if (d.price > 0) o.price = d.price;
      if (d.oldPrice) o.oldPrice = d.oldPrice;
      if (d.featured) o.featured = ["sim", "true", "1", "destaque"].includes(norm(d.featured));
      return o;
    };
    items.filter((i) => !i.skip).forEach((it) => {
      const visible = it.final === "published";
      if (it.existing) {
        const vis = it.final === "published" ? true : it.final === "keep" ? it.existing.visible !== false : false;
        state.products = state.products.map((p) => p.id === it.existing.id ? { ...sets(p, it.data), visible: vis } : p);
        if (vis) delete drafts[it.existing.id]; else if (it.final === "draft") drafts[it.existing.id] = true;
        updated++;
      } else {
        const p = sets({ id: it.id, title: "", category: "Ofertas", subcategory: "", sku: "", price: 0, oldPrice: null, tag: "", shortDescription: "", description: "", image: "", gallery: [], videoUrl: "", videoThumb: "", checkoutUrl: "", featured: false, bestSeller: false, flashOffer: false, reviewRating: 5, reviewCount: 0, order: it.order }, it.data);
        p.visible = visible;
        state.products.push(p);
        if (it.final === "draft") drafts[it.id] = true;
        created++;
      }
      if (it.final === "published" || (it.final === "keep")) pub++; else dr++;
    });
    state.settings.drafts = drafts;
    return { created, updated, pub, dr };
  }

  function openImport() {
    const m = modal(`<h2>Importar produtos por CSV</h2>
      <p class="admin-hint">Colunas: Nome, SKU, Categoria, Subcategoria, Preço, Preço antigo, Descrição curta, Descrição completa, Link de checkout externo, Imagem principal, Status (ativo/rascunho/inativo). Separador ; ou , (aceita planilhas do Excel). Nada e gravado antes de voce confirmar.</p>
      <div class="cat-form">
        <input type="file" id="impFile" accept=".csv,text/csv,text/plain">
        <button type="button" class="secondary-button compact" id="impTpl">Baixar modelo CSV</button>
        <label class="bump-check"><input type="checkbox" id="impDraft"> Importar tudo como rascunho</label>
        <label class="bump-check"><input type="checkbox" id="impUpdate" checked> Atualizar produtos existentes (mesmo SKU/ID; o ID nunca muda)</label>
        <label class="bump-check"><input type="checkbox" id="impCats"> Criar categorias que ainda nao existem</label>
      </div>
      <div id="impPrev"></div>
      <div class="admin-actions"><button class="primary-button" type="button" id="impGo" disabled>Importar</button><button class="secondary-button" type="button" data-close>Fechar</button></div>`);
    let text = "", result = null;
    const run = () => {
      if (!text) return;
      const opts = { allDraft: m.querySelector("#impDraft").checked, update: m.querySelector("#impUpdate").checked, createCats: m.querySelector("#impCats").checked };
      result = analyze(parseCsv(text), opts);
      const box = m.querySelector("#impPrev"), go = m.querySelector("#impGo");
      if (result.error) { box.innerHTML = `<p class="err">${esc(result.error)}</p>`; go.disabled = true; return; }
      const c = { published: 0, keep: 0, draft: 0, inactive: 0, skip: 0, upd: 0 };
      result.items.forEach((i) => { c[i.final]++; if (i.existing && !i.skip) c.upd++; });
      box.innerHTML = `<div class="cat-summary"><span>${result.items.length} linhas</span><span class="ok">${c.published} publicar</span><span class="warn">${c.draft} rascunho</span><span>${c.inactive} inativo</span><span>${c.upd} atualizam existentes</span><span class="err">${c.skip} ignoradas</span></div>
        <div class="cat-table-wrap"><table class="cat-table"><thead><tr><th>Linha</th><th>Produto</th><th>SKU</th><th>Preco</th><th>Resultado</th><th>Avisos</th></tr></thead><tbody>${result.items.slice(0, 400).map((i) => `<tr class="${i.final}"><td>${i.line}</td><td>${esc(i.data.title || "(sem nome)")}</td><td>${esc(i.data.sku)}</td><td>${i.data.price > 0 ? formatCurrency(i.data.price) : "-"}</td><td><b>${{ published: "Publicar", keep: "Mantem situacao", draft: "Rascunho", inactive: "Inativo", skip: "Ignorar" }[i.final]}</b></td><td>${[...i.problems, ...i.notes].map((x) => `<span class="st-badge ${i.problems.includes(x) ? "st-warn" : "st-feat"}">${esc(x)}</span>`).join(" ")}</td></tr>`).join("")}</tbody></table></div>${result.items.length > 400 ? `<p class="admin-hint">Mostrando 400 de ${result.items.length} linhas na previa (todas serao importadas).</p>` : ""}`;
      go.disabled = c.skip === result.items.length;
    };
    m.querySelector("#impFile").addEventListener("change", async (e) => { const file = e.target.files[0]; if (!file) return; text = await file.text(); run(); });
    ["#impDraft", "#impUpdate", "#impCats"].forEach((s) => m.querySelector(s).addEventListener("change", run));
    m.querySelector("#impTpl").addEventListener("click", () => {
      const blob = new Blob(["﻿Nome;SKU;Categoria;Subcategoria;Preço;Preço antigo;Descrição curta;Descrição completa;Link de checkout externo;Imagem principal;Status\r\nExemplo de produto;EX-001;Casa;;49,90;69,90;Resumo curto;Descrição completa;https://pay.exemplo.com.br/checkout/abc;https://exemplo.com/foto.jpg;rascunho\r\n"], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "modelo-importacao-kairos.csv"; a.click();
    });
    m.querySelector("#impGo").addEventListener("click", async () => {
      if (!result || result.error) return;
      const n = result.items.filter((i) => !i.skip).length;
      if (!confirm(`Importar ${n} produto(s)? Produtos incompletos entram como rascunho e nao aparecem na loja.`)) return;
      const r = applyImport(result.items, result.newCats);
      m.remove();
      await A.saveCatalog();
      toast(`Importacao concluida: ${r.created} criados, ${r.updated} atualizados, ${r.pub} publicados, ${r.dr} rascunhos.`);
      render();
    });
  }

  // ================= GALERIA DE MIDIAS (principal + galeria, ate 12) =================
  const media = { gallery: [] };
  let box = null;

  function buildMedia() {
    const form = document.getElementById("productForm");
    if (!form || box) return;
    box = document.createElement("div");
    box.className = "full comp-box";
    box.id = "mediaBox";
    box.innerHTML = `<h3>Galeria de imagens</h3><p class="admin-hint">A primeira imagem e a principal. Envie varias de uma vez, reordene, troque ou remova. O Supabase Storage e mantido; URLs antigas continuam funcionando.</p>
      <div id="mediaGrid" class="media-grid"></div>
      <div class="cat-form"><label class="secondary-button compact media-add">Enviar imagens<input type="file" id="mediaFiles" accept="image/jpeg,image/png,image/webp" multiple hidden></label>
      <input type="url" id="mediaUrl" placeholder="ou cole uma URL https de imagem"><button type="button" class="secondary-button compact" id="mediaUrlAdd">Adicionar URL</button></div>
      <span class="admin-hint" id="mediaStatus"></span><input type="file" id="mediaReplace" accept="image/jpeg,image/png,image/webp" hidden>`;
    form.querySelector("#prodComp").before(box);
    box.addEventListener("click", onMediaClick);
    box.querySelector("#mediaFiles").addEventListener("change", async (e) => { const files = [...e.target.files]; e.target.value = ""; await addFiles(files); });
    box.querySelector("#mediaUrlAdd").addEventListener("click", () => {
      const input = box.querySelector("#mediaUrl"), url = input.value.trim();
      if (!validImage(url)) { toast("Informe uma URL https valida."); return; }
      pushImage(url); input.value = "";
    });
    box.querySelector("#mediaReplace").addEventListener("change", async (e) => {
      const file = e.target.files[0], i = Number(e.target.dataset.index); e.target.value = "";
      if (!file) return;
      try { setMediaStatus("Enviando..."); const url = await A.uploadMedia(file, form.elements.title.value || "produto", "product-image"); const list = combined(); list[i] = url; setCombined(list); setMediaStatus("Imagem trocada. A URL antiga continua valida no Storage."); }
      catch (err) { setMediaStatus(err.message || "Falha no envio."); }
    });
    form.elements.image.addEventListener("input", renderMedia);
    form.elements.image.addEventListener("change", renderMedia);
    form.elements.imageFile.addEventListener("change", () => setTimeout(renderMedia, 50));
  }

  const setMediaStatus = (t) => { const el = box && box.querySelector("#mediaStatus"); if (el) el.textContent = t || ""; };
  const mainValue = () => String(document.getElementById("productForm").elements.image.value || "").trim();
  const combined = () => [mainValue(), ...media.gallery].filter(Boolean);
  function setCombined(list) {
    const form = document.getElementById("productForm");
    const uniq = [...new Set(list.filter(Boolean))].slice(0, 12);
    form.elements.image.value = uniq[0] || "";
    media.gallery = uniq.slice(1);
    form.elements.galleryJson.value = JSON.stringify(media.gallery);
    renderMedia();
  }
  function pushImage(url) {
    const list = combined();
    if (list.length >= 12) { toast("Limite de 12 imagens por produto."); return; }
    list.push(url); setCombined(list);
  }
  async function addFiles(files) {
    const form = document.getElementById("productForm");
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      if (combined().length >= 12) { toast("Limite de 12 imagens por produto."); break; }
      try { setMediaStatus(`Enviando ${i + 1} de ${files.length}...`); pushImage(await A.uploadMedia(files[i], `${form.elements.title.value || "produto"}-${i + 1}`, "product-image")); ok++; }
      catch (err) { toast(`${files[i].name}: ${err.message || "falha no envio"}`); }
    }
    setMediaStatus(ok ? `${ok} imagem(ns) enviada(s) e otimizada(s). Salve o produto para publicar.` : "");
  }
  function renderMedia() {
    if (!box) return;
    const list = combined();
    box.querySelector("#mediaGrid").innerHTML = list.map((url, i) => `<div class="media-tile ${i === 0 ? "main" : ""}">
      <img src="${esc(url)}" alt="" loading="lazy" onerror="this.style.opacity=.2">${i === 0 ? '<span class="media-badge">Principal</span>' : ""}
      <div class="media-ctl"><button type="button" data-m-up="${i}" ${i === 0 ? "disabled" : ""} title="Mover">↑</button><button type="button" data-m-down="${i}" ${i === list.length - 1 ? "disabled" : ""} title="Mover">↓</button>${i ? `<button type="button" data-m-main="${i}">Principal</button>` : ""}<button type="button" data-m-rep="${i}">Trocar</button><button type="button" data-m-del="${i}">✕</button></div></div>`).join("") || '<p class="admin-hint">Nenhuma imagem.</p>';
    document.getElementById("productForm").elements.galleryJson.value = JSON.stringify(media.gallery);
  }
  function onMediaClick(e) {
    const b = e.target.closest("button"); if (!b) return;
    const list = combined(), d = b.dataset;
    if (d.mUp !== undefined) { const i = +d.mUp; [list[i - 1], list[i]] = [list[i], list[i - 1]]; }
    else if (d.mDown !== undefined) { const i = +d.mDown; [list[i + 1], list[i]] = [list[i], list[i + 1]]; }
    else if (d.mMain !== undefined) { const [x] = list.splice(+d.mMain, 1); list.unshift(x); }
    else if (d.mDel !== undefined) { list.splice(+d.mDel, 1); }
    else if (d.mRep !== undefined) { const r = box.querySelector("#mediaReplace"); r.dataset.index = d.mRep; r.click(); return; }
    else return;
    setCombined(list);
  }
  document.addEventListener("kairos:product-loaded", (e) => {
    buildMedia();
    media.gallery = e.detail && Array.isArray(e.detail.gallery) ? e.detail.gallery.slice(0, 11) : [];
    setMediaStatus("");
    renderMedia();
  });

  function init() { buildMedia(); renderMedia(); render(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.KairosCatalog = { render, analyze, parseCsv, parsePrice, toCsv, publishable, statusOf };
}());
