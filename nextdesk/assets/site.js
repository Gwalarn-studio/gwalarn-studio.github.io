// Copy buttons: copy the text of the block named by data-copy.
document.addEventListener("click", e => {
  const b = e.target.closest("[data-copy]");
  if (!b) return;
  const el = document.getElementById(b.dataset.copy);
  if (!el) return;
  const done = b.dataset.done || "Copied";
  // Hide the copy button(s) inside the block while reading it, so "Copy" is not pasted into the CV.
  const btns = [...el.querySelectorAll("[data-copy]")];
  btns.forEach(x => x.style.display = "none");
  const text = el.innerText.trim();
  btns.forEach(x => x.style.display = "");
  navigator.clipboard?.writeText(text).then(() => {
    const old = b.textContent; b.textContent = done; setTimeout(() => b.textContent = old, 1600);
  }).catch(() => {});
});

// Checklists: count ticked boxes, remember them per page in this browser.
document.querySelectorAll("[data-checklist]").forEach(list => {
  const key = "nd:" + location.pathname + ":" + list.dataset.checklist;
  const boxes = [...list.querySelectorAll("input[type=checkbox]")];
  const out = document.querySelector(`[data-progress="${list.dataset.checklist}"]`);
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(key) || "[]"); } catch (_) {}
  boxes.forEach((b, i) => { b.checked = !!saved[i]; });
  const update = () => {
    const n = boxes.filter(b => b.checked).length;
    if (out) out.textContent = out.dataset.tpl.replace("{n}", n).replace("{t}", boxes.length);
    try { localStorage.setItem(key, JSON.stringify(boxes.map(b => b.checked))); } catch (_) {}
  };
  list.addEventListener("change", update); update();
});
