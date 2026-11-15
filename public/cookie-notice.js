/* Aviso discreto de cookies/identificadores (LGPD). Informativo: nao altera a medicao; link para a Politica de Privacidade. */
(function () {
  "use strict";
  var KEY = "kairos:cookie-notice-v1";
  try { if (localStorage.getItem(KEY)) return; } catch (e) { /* sem storage: mostra a cada visita */ }
  if (/^\/(admin|painel)/i.test(location.pathname)) return;

  function show() {
    if (document.getElementById("kxCookie")) return;
    var box = document.createElement("div");
    box.id = "kxCookie";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Aviso de cookies");
    box.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;max-width:560px;margin:0 auto;z-index:99990;background:#101827;color:#fff;border-radius:14px;padding:12px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;box-shadow:0 10px 30px rgba(0,0,0,.35);font:14px/1.45 Arial,sans-serif";
    box.innerHTML = '<span style="flex:1 1 240px">Usamos cookies e identificadores para o site funcionar, medir acessos e melhorar sua experiência. Veja a <a href="/privacidade" style="color:#ffb36b;font-weight:700">Política de Privacidade</a>.</span>'
      + '<button type="button" style="flex:0 0 auto;background:#ff6b00;color:#101827;border:0;border-radius:10px;padding:9px 18px;font-weight:800;cursor:pointer;font-size:14px">Entendi</button>';
    box.querySelector("button").addEventListener("click", function () {
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* ignora */ }
      box.remove();
    });
    document.body.appendChild(box);
  }
  function start() { setTimeout(show, 1200); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
}());
