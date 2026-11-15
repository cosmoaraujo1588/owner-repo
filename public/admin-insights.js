/* Kairos Admin - Visitantes ao vivo e Desempenho e conversao. Dados reais via /api/events (admin). Sem dados demonstrativos. */
(function () {
  "use strict";
  const A = window.KairosAdmin;
  if (!A) return;
  const esc = A.escapeHtml;
  const nf = (n) => new Intl.NumberFormat("pt-BR").format(Number(n) || 0);
  const get = async (qs) => { const r = await A.authFetch(`/api/events?${qs}`, { cache: "no-store" }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Falha ao carregar"); return r.json(); };
  const store = { get: (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } } };
  const active = (id) => document.getElementById(`section-${id}`)?.classList.contains("active");

  // ================= VISITANTES AO VIVO =================
  const UF = { RR: [2, 0], AP: [4, 0], AM: [1, 1], PA: [3, 1], MA: [4, 1], CE: [5, 1], RN: [6, 1], AC: [0, 2], RO: [1, 2], MT: [2, 2], TO: [3, 2], PI: [4, 2], PE: [5, 2], PB: [6, 2], DF: [2, 3], GO: [3, 3], BA: [4, 3], SE: [5, 3], AL: [6, 3], MS: [2, 4], MG: [3, 4], ES: [4, 4], SP: [3, 5], RJ: [4, 5], PR: [3, 6], SC: [3, 7], RS: [3, 8] };
  const UF_NAME = { AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins" };
  const DEVICE = { mobile: "Celular", desktop: "Computador", tablet: "Tablet" };
  const live = { timer: null, window: Number(store.get("kairos:live-window", "5")) || 5, data: null, error: "" };

  function brMap(byState) {
    const max = Math.max(1, ...Object.values(byState));
    const cell = 46, gap = 4;
    const tiles = Object.entries(UF).map(([uf, [c, r]]) => {
      const n = byState[uf] || 0, a = n ? 0.25 + 0.75 * (n / max) : 0;
      return `<g><title>${UF_NAME[uf]}: ${n} visitante(s)</title><rect x="${c * (cell + gap)}" y="${r * (cell + gap)}" width="${cell}" height="${cell}" rx="8" fill="${n ? `rgba(255,106,0,${a.toFixed(2)})` : "#f3f4f6"}" stroke="${n ? "#c2410c" : "#e5e7eb"}"/><text x="${c * (cell + gap) + cell / 2}" y="${r * (cell + gap) + 21}" text-anchor="middle" font-size="12" font-weight="700" fill="${n && a > .6 ? "#fff" : "#374151"}">${uf}</text><text x="${c * (cell + gap) + cell / 2}" y="${r * (cell + gap) + 37}" text-anchor="middle" font-size="12" fill="${n && a > .6 ? "#fff" : "#6b7280"}">${n || ""}</text></g>`;
    }).join("");
    return `<svg viewBox="0 0 ${7 * (cell + gap)} ${9 * (cell + gap)}" role="img" aria-label="Mapa do Brasil por estado, um quadro por estado" class="live-map">${tiles}</svg>`;
  }
  const list = (rows, fmt = (k) => esc(k)) => rows.length ? `<ul class="live-list">${rows.map(([k, v]) => `<li><span>${fmt(k)}</span><b>${nf(v)}</b></li>`).join("")}</ul>` : '<p class="admin-hint">Sem dados na janela.</p>';
  const ago = (s) => (s < 60 ? `há ${s}s` : `há ${Math.round(s / 60)} min`);
  const place = (v) => (v.country ? [v.city, v.region, v.country === "BR" ? "" : v.country].filter(Boolean).join(" - ") || (v.country === "BR" ? "Brasil" : v.country) : "Localização indisponível");

  function renderLive() {
    const root = document.getElementById("liveRoot"); if (!root) return;
    const d = live.data;
    const ctl = `<div class="insight-head"><div><h2>Visitantes ao vivo</h2><p class="admin-hint">Visitantes únicos (1 por sessão: atualizar a página não conta de novo) com atividade nos últimos ${live.window} min. Localização aproximada pelo provedor de rede; sem GPS e sem guardar IP.</p></div>
      <div class="cat-form"><label>Janela de atividade <select id="liveWin">${[1, 2, 5, 10, 15, 30].map((m) => `<option value="${m}" ${m === live.window ? "selected" : ""}>${m} min</option>`).join("")}</select></label><button class="secondary-button compact" type="button" id="liveRefresh">Atualizar</button></div></div>`;
    if (!d) { root.innerHTML = ctl + (live.error ? `<p class="err">${esc(live.error)}</p>` : '<p class="admin-hint">Carregando...</p>'); bindLive(); return; }
    const withGeo = d.active - d.unknownLocation;
    root.innerHTML = ctl + (live.error ? `<p class="err">${esc(live.error)} (mostrando a última leitura)</p>` : "") + `
      <div class="kpi-row"><div class="kpi big"><span>Ativos agora</span><strong>${nf(d.active)}</strong></div><div class="kpi"><span>Com localização</span><strong>${nf(withGeo)}</strong></div><div class="kpi"><span>Localização indisponível</span><strong>${nf(d.unknownLocation)}</strong></div><div class="kpi"><span>Atualizado</span><strong>${new Date(d.serverTime).toLocaleTimeString("pt-BR")}</strong></div></div>
      <div class="live-grid"><div><h3>Mapa do Brasil (por estado)</h3>${brMap(d.byState)}<p class="admin-hint">Cada quadro é um estado; cor mais forte = mais visitantes. Aproximado.</p></div>
        <div><h3>Cidades (aprox.)</h3>${list(d.byCity)}<h3>Países</h3>${list(Object.entries(d.byCountry))}<h3>Dispositivos</h3>${list(d.byDevice, (k) => esc(DEVICE[k] || k))}</div>
        <div><h3>Páginas agora</h3>${list(d.byPage)}<h3>Produtos sendo vistos</h3>${list(d.byProduct)}<h3>Origem</h3>${list(d.byOrigin)}</div></div>
      <h3>Visitantes ativos</h3><div class="cat-table-wrap"><table class="cat-table"><thead><tr><th>Visitante</th><th>Última atividade</th><th>Página</th><th>Produto</th><th>Origem</th><th>Local</th><th>Dispositivo</th></tr></thead><tbody>${d.visitors.map((v) => `<tr><td>#${esc(v.id)}</td><td>${ago(v.secondsAgo)}</td><td>${esc(v.page)}</td><td>${v.product ? esc(v.product.title) : "-"}</td><td>${esc(v.origin)}</td><td>${esc(place(v))}</td><td>${esc(DEVICE[v.device] || v.device)}</td></tr>`).join("") || '<tr><td colspan="7">Nenhum visitante ativo nesta janela.</td></tr>'}</tbody></table></div>`;
    bindLive();
  }
  function bindLive() {
    document.getElementById("liveWin")?.addEventListener("change", (e) => { live.window = Number(e.target.value); store.set("kairos:live-window", String(live.window)); loadLive(); });
    document.getElementById("liveRefresh")?.addEventListener("click", loadLive);
  }
  async function loadLive() {
    try { live.data = await get(`live=1&window=${live.window}`); live.error = ""; } catch (e) { live.error = e.message; }
    renderLive();
  }
  function livePoll() {
    clearInterval(live.timer);
    live.timer = setInterval(() => { if (active("live") && !document.hidden) loadLive(); }, 15000);
  }

  // ================= DESEMPENHO E CONVERSAO =================
  const perf = { range: store.get("kairos:perf-range", "7d"), from: "", to: "", compare: true, tab: "products", picked: new Set(), data: null, error: "" };
  const ymd = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
  function rangeDates() {
    const today = new Date();
    if (perf.range === "today") return [ymd(today), ymd(today)];
    if (perf.range === "30d") return [ymd(new Date(today - 29 * 864e5)), ymd(today)];
    if (perf.range === "custom" && perf.from && perf.to) return [perf.from, perf.to];
    return [ymd(new Date(today - 6 * 864e5)), ymd(today)];
  }
  const delta = (cur, prev) => { if (!perf.compare || perf.data.previous == null) return ""; if (!prev) return cur ? '<small class="up">novo</small>' : ""; const p = Math.round(((cur - prev) / prev) * 100); return `<small class="${p >= 0 ? "up" : "down"}">${p >= 0 ? "▲" : "▼"} ${Math.abs(p)}% vs. período anterior</small>`; };
  const kpi = (label, val, key, t, pv) => `<div class="kpi"><span>${label}</span><strong>${nf(val)}</strong>${delta(val, pv && pv[key])}</div>`;

  function lineChart(series) {
    const W = 640, H = 220, pad = 34, n = series.length;
    const max = Math.max(1, ...series.flatMap((s) => [s.views, s.cartAdds, s.checkoutClicks]));
    const x = (i) => pad + (n === 1 ? (W - 2 * pad) / 2 : (i * (W - 2 * pad)) / (n - 1)), y = (v) => H - pad - (v / max) * (H - 2 * pad);
    const line = (k, color) => `<polyline fill="none" stroke="${color}" stroke-width="2.5" points="${series.map((s, i) => `${x(i)},${y(s[k])}`).join(" ")}"/>${n <= 31 ? series.map((s, i) => `<circle cx="${x(i)}" cy="${y(s[k])}" r="3" fill="${color}"><title>${s.day}: ${s[k]}</title></circle>`).join("") : ""}`;
    const ticks = [0, 0.5, 1].map((f) => `<text x="${pad - 6}" y="${y(max * f) + 4}" text-anchor="end" font-size="10" fill="#6b7280">${Math.round(max * f)}</text><line x1="${pad}" x2="${W - pad}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="#e5e7eb"/>`).join("");
    const lab = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" font-size="10" fill="#6b7280">${series[i].day.slice(5).split("-").reverse().join("/")}</text>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="perf-chart" role="img" aria-label="Evolução diária">${ticks}${lab}${line("views", "#2563eb")}${line("cartAdds", "#d97706")}${line("checkoutClicks", "#15803d")}</svg><div class="legend"><span><i style="background:#2563eb"></i>Visualizações de produto/página</span><span><i style="background:#d97706"></i>Adições ao carrinho</span><span><i style="background:#15803d"></i>Cliques no checkout</span></div>`;
  }
  function barCompare(rows, nameKey) {
    if (!rows.length) return '<p class="admin-hint">Marque até 4 itens na tabela para comparar.</p>';
    const metrics = [["views", "Visualizações", "#2563eb"], ["cartAdds", "Carrinho", "#d97706"], ["checkoutClicks", "Cliques checkout", "#15803d"]];
    const max = Math.max(1, ...rows.flatMap((r) => metrics.map(([k]) => r[k])));
    return `<div class="bars">${rows.map((r) => `<div class="bar-group"><b>${esc(r[nameKey])}</b>${metrics.map(([k, l, c]) => `<div class="bar-line"><span>${l}</span><div class="bar"><i style="width:${(r[k] / max) * 100}%;background:${c}"></i></div><em>${nf(r[k])}</em></div>`).join("")}</div>`).join("")}</div>`;
  }

  function renderPerf() {
    const root = document.getElementById("perfRoot"); if (!root) return;
    const d = perf.data;
    const btn = (id, label) => `<button type="button" class="secondary-button compact ${perf.range === id ? "active" : ""}" data-range="${id}">${label}</button>`;
    const head = `<div class="insight-head"><div><h2>Desempenho e conversão</h2><p class="admin-hint">Visualizações, cliques e intenção de compra são medidos pela loja. <b>Cliques no checkout não são vendas.</b> Compras só entram com confirmação do fornecedor.</p></div>
      <div class="cat-form">${btn("today", "Hoje")}${btn("7d", "7 dias")}${btn("30d", "30 dias")}${btn("custom", "Período")}<span ${perf.range === "custom" ? "" : "hidden"}><input type="date" id="perfFrom" value="${esc(perf.from)}"> <input type="date" id="perfTo" value="${esc(perf.to)}"> <button class="primary-button compact" type="button" id="perfApply">Aplicar</button></span><label class="bump-check"><input type="checkbox" id="perfCmp" ${perf.compare ? "checked" : ""}> Comparar com período anterior</label></div></div>`;
    if (!d) { root.innerHTML = head + (perf.error ? `<p class="err">${esc(perf.error)}</p>` : '<p class="admin-hint">Carregando...</p>'); bindPerf(); return; }
    const t = d.totals, pv = d.previous, c = d.catalog;
    const rows = perf.tab === "products" ? d.products : d.categories;
    const nameKey = perf.tab === "products" ? "title" : "category";
    const idKey = perf.tab === "products" ? "id" : "category";
    const picked = rows.filter((r) => perf.picked.has(r[idKey])).slice(0, 4);
    const rate = (a, b) => (b ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "-");
    root.innerHTML = head + `<p class="admin-hint">Período: ${esc(d.period.from)} a ${esc(d.period.to)} (${d.period.days} dia(s)).</p>
      <div class="kpi-groups">
        <div class="kpi-group"><h4>1. Visualizações</h4><div class="kpi-row">${kpi("Visualizações de página", t.pageViews, "pageViews", t, pv)}${kpi("Visualizações de produto", t.productViews, "productViews", t, pv)}${kpi("Visitantes únicos", t.uniqueVisitors, "uniqueVisitors", t, pv)}</div></div>
        <div class="kpi-group"><h4>2. Cliques</h4><div class="kpi-row">${kpi("Cliques em produtos", t.productClicks, "productClicks", t, pv)}${kpi("Compartilhamentos", t.shares, "shares", t, pv)}</div></div>
        <div class="kpi-group"><h4>3. Intenção de compra</h4><div class="kpi-row">${kpi("Adições ao carrinho", t.cartAdds, "cartAdds", t, pv)}${kpi("Cliques no checkout externo", t.checkoutClicks, "checkoutClicks", t, pv)}${kpi("Sessões com intenção", t.intentSessions, "intentSessions", t, pv)}<div class="kpi"><span>Checkout / visitantes</span><strong>${rate(t.intentSessions, t.uniqueVisitors)}</strong></div></div></div>
        <div class="kpi-group"><h4>4. Compras confirmadas</h4><div class="kpi-row"><div class="kpi muted"><span>Confirmadas</span><strong>—</strong><small>${esc(d.purchases.note)}</small></div></div></div>
      </div>
      <h3>Evolução diária</h3>${lineChart(d.series)}
      <h3>Catálogo agora</h3><div class="kpi-row">${[["Produtos", c.total], ["Publicados", c.published], ["Rascunhos", c.drafts], ["Sem checkout", c.noCheckout], ["Sem imagem", c.noImage], ["Campanhas ativas", c.activeCampaigns]].map(([l, v]) => `<div class="kpi"><span>${l}</span><strong>${nf(v)}</strong></div>`).join("")}</div>
      <h3>Ranking e comparação</h3><div class="cat-form"><button class="secondary-button compact ${perf.tab === "products" ? "active" : ""}" data-tab="products" type="button">Produtos</button><button class="secondary-button compact ${perf.tab === "categories" ? "active" : ""}" data-tab="categories" type="button">Categorias</button><span class="admin-hint">Marque até 4 para comparar.</span></div>
      ${barCompare(picked, nameKey)}
      <div class="cat-table-wrap"><table class="cat-table"><thead><tr><th></th><th>${perf.tab === "products" ? "Produto" : "Categoria"}</th><th>Visualizações</th><th>Carrinho</th><th>Cliques checkout</th>${perf.tab === "products" ? "<th>Compart.</th>" : ""}<th>Checkout/Visual.</th></tr></thead><tbody>${rows.slice(0, 50).map((r) => `<tr><td><input type="checkbox" data-pick="${esc(r[idKey])}" ${perf.picked.has(r[idKey]) ? "checked" : ""}></td><td>${esc(r[nameKey])}</td><td>${nf(r.views)}</td><td>${nf(r.cartAdds)}</td><td>${nf(r.checkoutClicks)}</td>${perf.tab === "products" ? `<td>${nf(r.shares)}</td>` : ""}<td>${rate(r.checkoutClicks, r.views)}</td></tr>`).join("") || '<tr><td colspan="7">Sem dados no período.</td></tr>'}</tbody></table></div>`;
    bindPerf();
  }
  function bindPerf() {
    const root = document.getElementById("perfRoot");
    root.querySelectorAll("[data-range]").forEach((b) => b.addEventListener("click", () => { perf.range = b.dataset.range; store.set("kairos:perf-range", perf.range); if (perf.range === "custom") { renderPerf(); } else loadPerf(); }));
    root.querySelector("#perfApply")?.addEventListener("click", () => { perf.from = root.querySelector("#perfFrom").value; perf.to = root.querySelector("#perfTo").value; if (!perf.from || !perf.to || perf.from > perf.to) { A.toast("Informe um período válido."); return; } loadPerf(); });
    root.querySelector("#perfCmp")?.addEventListener("change", (e) => { perf.compare = e.target.checked; loadPerf(); });
    root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { perf.tab = b.dataset.tab; perf.picked.clear(); renderPerf(); }));
    root.querySelectorAll("[data-pick]").forEach((c) => c.addEventListener("change", () => { if (c.checked) { if (perf.picked.size >= 4) { c.checked = false; A.toast("Máximo de 4 itens."); return; } perf.picked.add(c.dataset.pick); } else perf.picked.delete(c.dataset.pick); renderPerf(); }));
  }
  async function loadPerf() {
    const [from, to] = rangeDates();
    try { perf.data = await get(`report=1&from=${from}&to=${to}&compare=${perf.compare ? 1 : 0}`); perf.error = ""; } catch (e) { perf.error = e.message; }
    renderPerf();
  }

  document.getElementById("adminNav")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-section]"); if (!b) return;
    if (b.dataset.section === "live") { renderLive(); loadLive(); livePoll(); }
    if (b.dataset.section === "performance") { renderPerf(); loadPerf(); }
  });
  window.KairosInsights = { brMap, UF };
}());
