/* Gwalarn : apparitions au défilement, barre d'achat mobile, avis vérifiés. */
(function () {
  // Apparitions
  var els = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add("in"); });

  // Barre d'achat mobile : visible après le haut de page, cachée sur l'offre
  var bar = document.querySelector(".buybar"), hero = document.querySelector(".hero"), offer = document.getElementById("offre");
  if (bar && hero) {
    var upd = function () {
      var past = hero.getBoundingClientRect().bottom < 0;
      var atOffer = offer && offer.getBoundingClientRect().top < innerHeight && offer.getBoundingClientRect().bottom > 0;
      bar.classList.toggle("show", past && !atOffer);
    };
    addEventListener("scroll", upd, { passive: true }); upd();
  }

  // Avis : seuls les acheteurs peuvent en laisser un (lien sur leur page de téléchargement).
  // Tri par défaut « meilleures notes », affiché et modifiable ; la moyenne compte tous les avis.
  var box = document.getElementById("avis-liste");
  if (!box) return;
  var api = box.getAttribute("data-api");
  var all = [], shown = 3;
  var stars = function (n) { var s = ""; for (var i = 1; i <= 5; i++) s += i <= n ? "★" : '<span class="off">★</span>'; return s; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var sel = document.getElementById("avis-tri"), more = document.getElementById("avis-plus");
  function render() {
    var avg = document.getElementById("avis-moyenne"), count = document.getElementById("avis-nombre"), st = document.getElementById("avis-etoiles");
    if (!all.length) {
      box.innerHTML = '<div class="empty"><b>Soyez le premier à donner votre avis.</b><br>Après votre achat, un lien sur votre page de téléchargement vous permet de noter le guide.</div>';
      avg.textContent = "–"; count.textContent = "Aucun avis pour l’instant"; st.innerHTML = stars(0);
      more.hidden = true; return;
    }
    var m = all.reduce(function (a, r) { return a + r.note; }, 0) / all.length;
    avg.textContent = m.toFixed(1).replace(".", ","); st.innerHTML = stars(Math.round(m));
    count.textContent = all.length + " avis vérifié" + (all.length > 1 ? "s" : "");
    var mode = sel.value, list = all.slice();
    list.sort(function (a, b) {
      if (mode === "recents") return b.date.localeCompare(a.date);
      if (mode === "basses") return a.note - b.note || b.date.localeCompare(a.date);
      return b.note - a.note || b.date.localeCompare(a.date);
    });
    box.innerHTML = list.slice(0, shown).map(function (r) {
      return '<article class="review"><div class="meta"><span class="stars">' + stars(r.note) + '</span><span class="ok">✓ Achat vérifié</span></div>' +
        '<p style="margin:0">' + esc(r.texte) + '</p><div class="meta" style="margin:8px 0 0"><span>' + esc(r.prenom || "Lecteur") + '</span><span>' +
        new Date(r.date).toLocaleDateString("fr-FR") + "</span></div></article>";
    }).join("");
    more.hidden = list.length <= shown;
  }
  sel.addEventListener("change", render);
  more.addEventListener("click", function () { shown = 1e9; render(); });
  if (!api) { render(); return; }
  fetch(api).then(function (r) { return r.ok ? r.json() : []; }).then(function (d) { all = Array.isArray(d) ? d : []; render(); }).catch(render);
})();
