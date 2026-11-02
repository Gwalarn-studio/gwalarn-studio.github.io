// Remote job quiz: each answer adds points to roles; the top 3 roles are shown at the end.
(() => {
  const root = document.getElementById("quiz");
  const data = JSON.parse(document.getElementById("quiz-data").textContent);
  const L = data.labels;
  let step = 0, score = {};

  function render() {
    if (step >= data.questions.length) return result();
    const q = data.questions[step];
    root.innerHTML = `<div class="bar" aria-hidden="true"><i style="width:${(step / data.questions.length) * 100}%"></i></div>
      <span class="eyebrow">${L.question} ${step + 1} / ${data.questions.length}</span>
      <div class="q" id="qtext">${q.q}</div>
      <div class="opts" role="group" aria-labelledby="qtext">${q.a.map((a, i) => `<button type="button" data-i="${i}">${a.t}</button>`).join("")}</div>`;
    root.querySelector(".opts").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      for (const r of q.a[b.dataset.i].r) score[r] = (score[r] || 0) + 1;
      step++; render(); root.querySelector("button")?.focus();
    });
  }

  function result() {
    const max = data.questions.length;
    const top = Object.entries(score).sort((a, b) => b[1] - a[1]).slice(0, 3);
    root.innerHTML = `<div class="bar" aria-hidden="true"><i style="width:100%"></i></div>
      <span class="eyebrow">${L.result}</span>` + top.map(([id, s], i) => {
        const r = data.roles[id];
        return `<div class="result"><span class="pct">${i === 0 ? L.best : L.also} · ${Math.round(s / max * 100)}${document.documentElement.lang === "fr" ? "\u00a0" : ""}% ${L.match}</span>
          <h3>${r.name}</h3><p>${r.why}</p><p><b>${L.start}</b> ${r.start}</p></div>`;
      }).join("") + `<p><a class="btn" href="${data.cta.href}">${data.cta.label}</a></p>
      <p><button type="button" class="copy" id="again" style="float:none">${L.again}</button></p>`;
    root.querySelector("#again").addEventListener("click", () => { step = 0; score = {}; render(); });
  }
  render();
})();
