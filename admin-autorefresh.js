(function () {
  "use strict";

  const INTERVAL_MS = 10000;
  let timer = null;
  let running = false;

  function reportsActive() {
    return document.getElementById("section-reports")?.classList.contains("active");
  }

  async function refreshReports() {
    if (running || !reportsActive()) return;
    running = true;
    try {
      document.getElementById("refreshReports")?.click();
    } finally {
      running = false;
    }
  }

  function start() {
    if (timer) clearInterval(timer);
    timer = setInterval(refreshReports, INTERVAL_MS);

    document.getElementById("adminNav")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-section]");
      if (button?.dataset.section === "reports") {
        setTimeout(refreshReports, 150);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}());
