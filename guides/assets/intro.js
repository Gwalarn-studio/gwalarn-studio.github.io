/* Intro cinématique Gwalarn, en un seul plan continu « drone » :
   la Terre tourne, la caméra plonge vers la France, puis bascule jusqu'à raser la mer ;
   la France se détache, tourne sur elle-même et devient un livre, qui s'ouvre sur le site.
   Jouée à chaque ouverture, bouton « Passer l'intro », rien si l'animation est réduite. */
(function () {
  var intro = document.getElementById("intro");
  if (!intro) return;
  var seen = false; // l'intro se joue à chaque ouverture de la page (bouton « Passer l'intro » pour la sauter)
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Robots des moteurs de recherche et outils de mesure : même page, sans l'animation, pour qu'ils voient le contenu tout de suite.
  var robot = /bot|crawl|spider|slurp|lighthouse|inspectiontool|pagespeed|facebookexternalhit|bingpreview/i.test(navigator.userAgent || "");
  if (seen || reduce || robot || !window.d3 || !d3.geoOrthographic) { finish(true); return; }
  document.documentElement.classList.add("intro-on");
  intro.querySelector(".skip").addEventListener("click", function () { finish(); });

  var plane = intro.querySelector(".plane"), world = intro.querySelector(".world");
  var map = intro.querySelector(".plane canvas");
  var frs = intro.querySelectorAll(".plane .fr");
  var book = intro.querySelector(".plane .book");
  var cover = book.querySelector(".cover");
  var caption = intro.querySelector(".caption");
  var fog = intro.querySelector(".fog");
  var sky = intro.querySelector(".sky");
  var bgfill = intro.querySelector(".bgfill");
  var her = intro.querySelector(".heritage"), herL = intro.querySelectorAll(".heritage .hl");
  var herFront = intro.querySelector(".heritage .front"), flash = intro.querySelector(".hflash");
  var beam = intro.querySelector(".m-phare .beam"), lamp = intro.querySelector(".m-phare .lamp");
  var site = document.getElementById("site");
  var done = false;

  // ---------- outils ----------
  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var seg = function (t, a, b) { return clamp((t - a) / (b - a)); };
  var io = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }; // ease in-out
  var out = function (x) { return 1 - Math.pow(1 - x, 3); };
  var lerp = function (a, b, x) { return a + (b - a) * x; };

  // ---------- ciel étoilé (dessiné une fois) ----------
  (function () {
    var c = sky.getContext("2d"), d = Math.min(devicePixelRatio || 1, 2);
    sky.width = innerWidth * d; sky.height = innerHeight * d;
    c.scale(d, d);
    for (var i = 0; i < 220; i++) {
      c.globalAlpha = Math.random() * 0.7 + 0.2; c.fillStyle = "#fff";
      var r = Math.random() * 1.3 + 0.2; c.fillRect(Math.random() * innerWidth, Math.random() * innerHeight, r, r);
    }
  })();

  // ---------- carte : une grande toile 2× l'écran, posée sur un plan 3D ----------
  var W = innerWidth, H = innerHeight;
  var PW = W * 2.6, PH = H * 2.6;                                // taille du plan (px CSS)
  var dpr = Math.min(devicePixelRatio || 1, 1);
  map.width = PW * dpr; map.height = PH * dpr;
  plane.style.width = PW + "px"; plane.style.height = PH + "px";
  plane.style.left = (W - PW) / 2 + "px"; plane.style.top = (H - PH) / 2 + "px";
  frs.forEach(function (s) { s.setAttribute("viewBox", "0 0 " + PW + " " + PH); s.style.width = PW + "px"; s.style.height = PH + "px"; });
  var ctx = map.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  var FR = [-2.4, -46.6];       // rotation qui met la France face à la caméra
  var proj = d3.geoOrthographic().clipAngle(90).precision(0.5).translate([PW / 2, PH / 2]);
  var path = d3.geoPath(proj, ctx), svgPath = d3.geoPath(proj);
  var grat = d3.geoGraticule10(), sphere = { type: "Sphere" };

  fetch(intro.getAttribute("data-geo")).then(function (r) { return r.json(); }).then(start).catch(function () { finish(); });

  function start(geo) {
    var k0 = Math.min(W, H) * 0.36;
    proj.rotate(FR).scale(1);
    var b1 = svgPath.bounds(geo.france);
    var k1 = Math.min(W * 0.8 / (b1[1][0] - b1[0][0]), H * 0.55 / (b1[1][1] - b1[0][1]));
    // France à l'échelle finale : centre, taille → pivot des rotations et place du livre
    proj.scale(k1);
    var fb = svgPath.bounds(geo.france);
    var cx = (fb[0][0] + fb[1][0]) / 2, cy = (fb[0][1] + fb[1][1]) / 2, fh = fb[1][1] - fb[0][1];
    plane.style.transformOrigin = cx + "px " + cy + "px";
    var bh = fh * 0.95, bw = bh / 1.38;
    book.style.width = bw + "px"; book.style.height = bh + "px";
    book.style.left = cx - bw / 2 + "px"; book.style.top = cy - bh / 2 + "px";
    book.style.setProperty("--bw", bw + "px");
    book.querySelector(".emblem path").setAttribute("d", d3.geoPath(d3.geoMercator().fitExtent([[2, 2], [98, 98]], geo.france))(geo.france));
    // taille du livre à l'écran à la fin : ~46 % de la hauteur
    var bookScale = Math.min(H * 0.46, W * 0.85 * 1.38) / bh;
    // décalage pour amener le centre de la France au centre de l'écran
    var dx = PW / 2 - cx, dy = PH / 2 - cy;

    var T0 = performance.now(), lastDraw = -1;

    function draw(rot, k, gratA) {
      proj.rotate(rot).scale(k);
      ctx.clearRect(0, 0, PW, PH);
      var c = PW / 2, m = PH / 2;
      var g = ctx.createRadialGradient(c, m, k * 0.92, c, m, k * 1.25);
      g.addColorStop(0, "rgba(120,180,255,.45)"); g.addColorStop(1, "rgba(120,180,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, m, k * 1.25, 0, 7); ctx.fill();
      var o = ctx.createRadialGradient(c - k * 0.35, m - k * 0.4, k * 0.1, c, m, k);
      o.addColorStop(0, "#1f5596"); o.addColorStop(1, "#06172f");
      ctx.beginPath(); path(sphere); ctx.fillStyle = o; ctx.fill();
      if (gratA > 0.01) { ctx.beginPath(); path(grat); ctx.strokeStyle = "rgba(255,255,255," + 0.09 * gratA + ")"; ctx.lineWidth = 0.6; ctx.stroke(); }
      ctx.beginPath(); path(geo.land); ctx.fillStyle = "#2f6b55"; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.16)"; ctx.lineWidth = 0.6; ctx.stroke();
      var d = svgPath(geo.france) || "";
      frs.forEach(function (s) { s.firstElementChild.setAttribute("d", d); });
    }

    function frame(now) {
      if (done) return;
      var t = now - T0;
      // 1. la Terre tourne vers l'Europe (0 → 2,6 s)
      var a = io(seg(t, 0, 2600));
      // 2. le drone plonge : zoom continu (1,8 → 4,8 s)
      var z = io(seg(t, 1800, 4800));
      // 3. il bascule jusqu'à raser la mer (3,6 → 6,0 s)
      var p = io(seg(t, 3600, 6000));
      // 4. la mer s'efface, la France reste et se détache (5,4 → 6,4 s)
      var f = io(seg(t, 5400, 6400));
      // 5. la France tourne sur elle-même et se redresse en livre (5,8 → 8,0 s)
      var r = io(seg(t, 5800, 8000));
      var bk = out(seg(t, 7000, 7900));
      // 6. le livre s'ouvre et la caméra entre dedans (8,3 → 9,6 s)
      var o = io(seg(t, 8300, 9600));

      if (t < 4900) {
        var rot = [lerp(FR[0] + 140, FR[0], a), lerp(FR[1] + 18, FR[1], a)];
        var k = k0 * Math.pow(k1 / k0, z);
        if (Math.abs(t - lastDraw) > 0) { draw(rot, k, 1 - z); lastDraw = t; }
      }

      // caméra : plongée (rotateX), avance (scale), puis la France pivote et devient livre
      var tilt = lerp(0, 74, p) * (1 - r) + lerp(0, 10, r);      // degrés : 0 → 74 (rase-mer) → 10 (livre debout)
      var yaw = lerp(0, -24, r);                                 // le livre se tourne de 3/4
      var spin = lerp(0, -360, r);                               // la France tourne sur elle-même
      var push = lerp(1, 1.35, p) * (1 - r) + bookScale * r;     // le drone avance, puis recule sur le livre
      push *= lerp(1, 2.2, o);
      var lift = lerp(0, H * 0.18, p) * (1 - r);                 // horizon qui remonte en rase-mer
      plane.style.transform = "translate(" + dx * clamp(z * 1.4) + "px," + (dy * clamp(z * 1.4) + lift) + "px) " +
        "rotateX(" + tilt + "deg) rotateY(" + yaw + "deg) rotateZ(" + spin + "deg) scale(" + push + ")";

      map.style.opacity = String(1 - f);
      fog.style.opacity = String(p * (1 - f) * 0.9);
      frs.forEach(function (s) { s.style.opacity = String(1 - bk); });
      book.style.opacity = String(bk);
      cover.style.transform = "rotateY(" + lerp(0, -165, o) + "deg)";
      // le livre s'ouvre sur le site : la page intérieure, c'est le site, qui pivote et se pose en plein écran
      var g = io(seg(t, 8300, 9900));
      var bgA = 1 - io(seg(t, 8250, 8650));
      bgfill.style.opacity = sky.style.opacity = String(bgA);
      // décor patrimoine : apparaît quand la France se détache ; le phare balaie, éclaire tout en doré,
      // et quand la lumière retombe, la tour Eiffel est là, devant.
      if (her) {
        var hA = io(seg(t, 5200, 6300)), rise = 1 - io(seg(t, 5200, 7000)), drift = seg(t, 7000, 9300);
        her.style.opacity = String(hA * bgA);
        herL.forEach(function (l, i) {
          var depth = [6, 12, 10][i];
          l.style.transform = "translateY(" + (rise * depth) + "vh) scale(" + (1 + drift * 0.025 * (i + 1)) + ")";
        });
        // faisceau : balaie le ciel (5,6 → 6,6 s) puis se tourne vers nous et s'élargit
        var sweep = io(seg(t, 5600, 6600)), face = io(seg(t, 6400, 6900)) * (1 - io(seg(t, 7000, 7900)));
        if (beam) beam.setAttribute("transform", "rotate(" + lerp(lerp(215, 168, sweep) + 30 * io(seg(t, 7000, 9300)), 180, face) + " 35 35) scale(" + lerp(1, 1.4, face) + "," + lerp(1, 5, face) + ")");
        if (lamp) {
          var lr = lamp.getBoundingClientRect();
          flash.style.setProperty("--fx", (lr.left + lr.width / 2) / W * 100 + "%");
          flash.style.setProperty("--fy", (lr.top + lr.height / 2) / H * 100 + "%");
        }
        var fl = io(seg(t, 6550, 6950)) * (1 - io(seg(t, 7000, 7600)));
        flash.style.opacity = String(fl);
        herFront.style.opacity = t < 6950 ? "0" : "1";
      }
      world.style.opacity = String(1 - io(seg(t, 8350, 8800)));
      if (site) {
        var s0 = Math.min(H * 0.46 / H, (H * 0.46 / 1.38) / W * 1.25);
        site.style.opacity = String(seg(t, 8150, 8500));
        site.style.transform = t < 8150 ? "scale(0)" : "perspective(1100px) rotateY(" + lerp(-24, 0, g) + "deg) rotateX(" + lerp(10, 0, g) + "deg) scale(" + lerp(s0, 1, g) + ")";
        site.style.borderRadius = lerp(14, 0, g) + "px";
        site.style.boxShadow = "0 30px 80px rgba(0,0,0," + (0.6 * (1 - g)) + ")";
        site.style.overflow = g < 1 ? "hidden" : "";
      }
      caption.classList.toggle("show", t > 1300 && t < 4300);

      if (t < 9900) requestAnimationFrame(frame); else finish(true);
    }
    requestAnimationFrame(frame);
  }

  function finish(instant) {
    if (done) return;
    done = true;
    document.documentElement.classList.remove("intro-on");
    if (site) { site.style.transform = site.style.opacity = site.style.borderRadius = site.style.boxShadow = site.style.overflow = ""; }
    if (instant) { intro.remove(); return; }
    intro.style.transition = "opacity .6s ease"; intro.style.opacity = "0";
    setTimeout(function () { intro.remove(); }, 650);
  }
})();
