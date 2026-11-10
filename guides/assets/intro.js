/* Intro cinématique Gwalarn, en un seul plan continu « drone » :
   la Terre tourne, la caméra plonge vers la France, puis bascule jusqu'à raser la mer ;
   la France se détache, tourne sur elle-même et devient un livre ; le décor s'efface sur le site
   et le livre va se poser à sa place, sous le titre de la page d'accueil.
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
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  intro.querySelector(".skip").addEventListener("click", function () { finish(); });
  // Clavier et lecteurs d'écran : seul le bouton « Passer l'intro » est atteignable pendant l'animation,
  // la touche Échap la passe aussi, et le site derrière n'est pas atteignable tant qu'elle joue.
  intro.removeAttribute("aria-hidden");
  Array.prototype.forEach.call(intro.children, function (c) { if (!c.classList.contains("skip")) c.setAttribute("aria-hidden", "true"); });
  if (document.getElementById("site")) document.getElementById("site").inert = true;
  var onKey = function (e) { if (e.key === "Escape") finish(); };
  document.addEventListener("keydown", onKey);

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
  var done = false; var glFree = null;

  // ---------- outils ----------
  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var seg = function (t, a, b) { return clamp((t - a) / (b - a)); };
  var io = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }; // ease in-out
  var out = function (x) { return 1 - Math.pow(1 - x, 3); };
  var lerp = function (a, b, x) { return a + (b - a) * x; };
  // Opacité plancher : un élément « invisible » reste à 0,2 % au lieu de 0, pour que le téléphone
  // le prépare dès le début ; sinon il le prépare au moment où il apparaît, d'où une micro-coupure.
  var vis = function (x) { return String(x < 0.002 ? 0.002 : x); };

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
  plane.style.width = PW + "px"; plane.style.height = PH + "px";
  plane.style.left = (W - PW) / 2 + "px"; plane.style.top = (H - PH) / 2 + "px";
  var ctx = null; // toile 2D : seulement si WebGL 2 n'est pas disponible

  var FR = [-2.4, -46.6];       // rotation qui met la France face à la caméra
  var proj = d3.geoOrthographic().clipAngle(90).precision(1).translate([PW / 2, PH / 2]);
  var path = null, svgPath = d3.geoPath(proj);
  var grat = d3.geoGraticule10(), sphere = { type: "Sphere" };

  fetch(intro.getAttribute("data-geo")).then(function (r) { return r.json(); }).then(start).catch(function (e) { if (window.console) console.warn("intro", e); finish(); });

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
    // Place finale : le livre de la page d'accueil (sous le titre). Mesuré une fois, avant l'animation.
    var heroBook = document.querySelector(".showcase .book"), tgX = 0, tgY = 0, endScale = bookScale;
    if (heroBook) {
      var sr = heroBook.parentNode.getBoundingClientRect();
      tgX = sr.left + sr.width / 2 - W / 2; tgY = sr.top + sr.height / 2 - H / 2;
      endScale = heroBook.offsetHeight / bh;
    }

    // Toile : on coupe la partie du plan qui, en rase-mer, passerait derrière la caméra
    // (hors écran de toute façon). Safari affiche mal ce cas : clignotements, plan qui saute.
    var CH = Math.min(PH, Math.round(cy + H * 0.62 + 30));
    map.style.height = CH + "px";
    var gdpr = Math.min(devicePixelRatio || 1, 1.5);
    map.width = Math.round(PW * gdpr); map.height = Math.round(CH * gdpr);
    var drawGL = null;
    try { drawGL = makeGL(CH, gdpr); } catch (e) { drawGL = null; }
    var edge;
    if (!drawGL) {
      if (map.getContext("webgl2")) { // la toile est déjà prise par WebGL : on la remplace
        var nm = map.cloneNode(false); map.parentNode.replaceChild(nm, map); map = nm;
      }
      map.width = PW * dpr; map.height = CH * dpr;
      ctx = map.getContext("2d"); path = d3.geoPath(proj, ctx);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // fondu des bords de la carte (avant : masque CSS, très coûteux sur iPhone pendant l'animation)
      edge = ctx.createRadialGradient(0, 0, 0.62, 0, 0, 1);
      edge.addColorStop(0, "#000"); edge.addColorStop(1, "rgba(0,0,0,0)");
    }

    // France en relief : tracée une seule fois à sa taille finale, petits calques SVG ;
    // pendant la plongée on les agrandit par transformation (pas de redessin à chaque image).
    var m = 30, fx = fb[0][0] - m, fy = fb[0][1] - m, fw = fb[1][0] - fb[0][0] + 2 * m, fhh = fb[1][1] - fb[0][1] + 2 * m;
    var frD = svgPath(geo.france) || "", frZ = [];
    frs.forEach(function (s) {
      s.setAttribute("viewBox", fx + " " + fy + " " + fw + " " + fhh);
      s.style.left = fx + "px"; s.style.top = fy + "px"; s.style.width = fw + "px"; s.style.height = fhh + "px";
      s.style.transformOrigin = (PW / 2 - fx) + "px " + (PH / 2 - fy) + "px";
      s.firstElementChild.setAttribute("d", frD);
      var mz = /fr-d(\d)/.exec(s.getAttribute("class"));
      frZ.push(mz ? -4 * mz[1] : 0);
    });
    var FR_SHOW = 2600; // avant : la France tourne avec le globe, dessinée dans la toile

    // ---------- globe dessiné par la puce graphique (WebGL 2) ----------
    // La carte du monde est peinte UNE fois dans deux images (monde entier + Europe en détail) ;
    // ensuite, à chaque image, la puce graphique calcule chaque pixel du globe : rien à redessiner
    // côté processeur, donc pas d'à-coups. Si WebGL 2 manque, on garde l'ancien dessin.
    function makeGL(CH, gdpr) {
      var gl;
      try { gl = map.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" }); } catch (e) { gl = null; }
      if (!gl) return null;
      glFree = function () { var x = gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); };
      var BOX = [-32, 38, 28, 76]; // Europe en détail : longitude min/max, latitude min/max
      // carte « à plat » (équirectangulaire) : d3 découpe proprement les terres au méridien 180°
      var D = Math.PI / 180, eq = d3.geoEquirectangular().scale(1).translate([0, 0]).precision(0);
      function paint(w, h, l0, l1, b0, b1, lw) {
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        var x = c.getContext("2d"), sx = w / ((l1 - l0) * D), sy = h / ((b1 - b0) * D);
        x.setTransform(sx, 0, 0, sy, -l0 * D * sx, b1 * D * sy);
        var pth = d3.geoPath(eq, x);
        x.lineJoin = "round";
        x.beginPath(); pth(geo.land); x.fillStyle = "#2f6b55"; x.fill();
        x.strokeStyle = "rgba(255,255,255,.16)"; x.lineWidth = lw / sx; x.stroke();
        x.beginPath(); pth(geo.france); x.fillStyle = "#e9b752"; x.fill();
        x.strokeStyle = "#ffe3a3"; x.lineWidth = lw * 1.6 / sx; x.stroke();
        return c;
      }
      var cW = paint(4096, 2048, -180, 180, -90, 90, 1.2);
      var cR = paint(4096, 2048, BOX[0], BOX[1], BOX[2], BOX[3], 2.2);
      var aniso = gl.getExtension("EXT_texture_filter_anisotropic");
      function tex(c, unit, wrapS) {
        var t = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        c.width = c.height = 1; // libère la mémoire de l'image de départ
      }
      tex(cW, 0, gl.REPEAT); tex(cR, 1, gl.CLAMP_TO_EDGE);
      var vs = "#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
      var fs = [
        "#version 300 es",
        "precision highp float;",
        "uniform sampler2D uW,uR;uniform vec2 uC,uRot;uniform float uK,uDpr,uH,uGrat,uFade;uniform vec4 uBox;out vec4 o;",
        "float line(float v,float step,float wpx){float d=abs(fract(v/step+.5)-.5)*step;float fw=max(fwidth(v),1e-5);return 1.-clamp(d/fw/wpx,0.,1.);}",
        "void main(){",
        " vec2 p=vec2(gl_FragCoord.x,uH*uDpr-gl_FragCoord.y)/uDpr;",
        " vec2 q=(p-uC)/uK;float r=length(q);",
        " float X=q.x,Y=-q.y;float zd=sqrt(max(0.,1.-X*X-Y*Y));",
        " float cd=cos(uRot.y),sd=sin(uRot.y);",
        " float lam=atan(X,zd*cd+Y*sd)-uRot.x;float phi=asin(clamp(Y*cd-zd*sd,-1.,1.));",
        " float lon=degrees(lam);lon=mod(lon+180.,360.)-180.;float lat=degrees(phi);",
        // monde : dérivées corrigées au raccord 180°
        " vec2 uw=vec2((lon+180.)/360.,(90.-lat)/180.);",
        " vec2 dx=dFdx(uw),dy=dFdy(uw);dx.x-=sign(dx.x)*step(.5,abs(dx.x));dy.x-=sign(dy.x)*step(.5,abs(dy.x));",
        " vec4 tw=textureGrad(uW,uw,dx,dy);",
        " vec2 ur=vec2((lon-uBox.x)/(uBox.y-uBox.x),(uBox.w-lat)/(uBox.w-uBox.z));",
        " vec2 rx=dFdx(ur),ry=dFdy(ur);rx.x-=sign(rx.x)*step(.25,abs(rx.x))*(360./(uBox.y-uBox.x));ry.x-=sign(ry.x)*step(.25,abs(ry.x))*(360./(uBox.y-uBox.x));",
        " vec4 tr=textureGrad(uR,ur,rx,ry);",
        " vec2 e=min(ur,1.-ur);float inR=smoothstep(0.,.04,min(e.x,e.y));",
        " vec4 land=mix(tw,tr,inR);",
        // océan : dégradé radial décalé (comme l'ancien dessin)
        " vec2 c0=uC+vec2(-.35,-.4)*uK;float t=clamp((distance(p,c0)-.1*uK)/(1.25*uK),0.,1.);",
        " vec3 sea=mix(vec3(.122,.333,.588),vec3(.024,.09,.184),t);",
        // quadrillage tous les 10°
        " float gl=max(line(lat,10.,.6),abs(lat)<80.?line(lon,10.,.6):0.);",
        " sea=mix(sea,vec3(1.),.09*uGrat*gl);",
        " vec3 col=sea*(1.-land.a)+land.rgb;",
        " float cov=clamp((1.-r)*uK*uDpr+.5,0.,1.);",
        " float ga=r<1.25?.45*clamp((1.25-r)/.33,0.,1.):0.;",
        " vec4 glow=vec4(vec3(.47,.706,1.)*ga,ga);",
        " vec4 c=vec4(col,1.)*cov+glow*(1.-cov);",
        " vec2 h=uC;float ed=length((p-h)/h);c*=mix(1.,1.-clamp((ed-.62)/.38,0.,1.),uFade);",
        " o=c;}"
      ].join("\n");
      function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
      var prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var al = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
      var U = {}; ["uW", "uR", "uC", "uRot", "uK", "uDpr", "uH", "uGrat", "uFade", "uBox"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      gl.uniform1i(U.uW, 0); gl.uniform1i(U.uR, 1);
      gl.uniform2f(U.uC, PW / 2, PH / 2); gl.uniform1f(U.uDpr, gdpr); gl.uniform1f(U.uH, CH);
      gl.uniform4f(U.uBox, BOX[0], BOX[1], BOX[2], BOX[3]);
      gl.viewport(0, 0, map.width, map.height);
      gl.clearColor(0, 0, 0, 0);
      var R = Math.PI / 180;
      return function (rot, k, gratA, fade) {
        gl.uniform2f(U.uRot, rot[0] * R, rot[1] * R); gl.uniform1f(U.uK, k);
        gl.uniform1f(U.uGrat, gratA); gl.uniform1f(U.uFade, fade ? 1 : 0);
        gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
    }

    var T0 = 0, lastDraw = -1;

    function draw(rot, k, gratA, fade, withFr) {
      if (drawGL) { drawGL(rot, k, gratA, fade); return; }
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
      if (withFr) { ctx.beginPath(); path(geo.france); ctx.fillStyle = "#e9b752"; ctx.fill(); ctx.strokeStyle = "#ffe3a3"; ctx.lineWidth = 1.5; ctx.stroke(); }
      if (fade) {
        ctx.save(); ctx.globalCompositeOperation = "destination-in";
        ctx.translate(PW / 2, PH / 2); ctx.scale(PW / 2, PH / 2);
        ctx.fillStyle = edge; ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
      }
    }

    function frame(now) {
      if (done) return;
      var warm = now < 0;
      if (!warm && !T0) T0 = now;
      var t = warm ? 0 : now - T0;
      // lecture de la position du phare AVANT toute écriture de style (sinon le navigateur recalcule la page à chaque image)
      var lr = (her && lamp && t > 6400 && t < 7700) ? lamp.getBoundingClientRect() : null;
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
      // 6. le décor s'efface sur le site et le livre va se poser sous le titre (8,1 → 9,4 s)
      var o = io(seg(t, 8100, 9400));

      if (t < 4900) {
        var rot = [lerp(FR[0] + 140, FR[0], a), lerp(FR[1] + 18, FR[1], a)];
        var k = k0 * Math.pow(k1 / k0, z);
        if (Math.abs(t - lastDraw) > 0) { draw(rot, k, 1 - z, p > 0 || z > 0.6, t < FR_SHOW); lastDraw = t; }
        var sc = k / k1;
        frs.forEach(function (s, i) { s.style.transform = "translateZ(" + frZ[i] + "px) scale(" + sc + ")"; });
      } else if (lastDraw < 4900) {
        lastDraw = 4900;
        frs.forEach(function (s, i) { s.style.transform = "translateZ(" + frZ[i] + "px)"; });
      }

      // caméra : plongée (rotateX), avance (scale), puis la France pivote et devient livre
      var tilt = lerp(0, 74, p) * (1 - r) + lerp(0, 10, r);      // degrés : 0 → 74 (rase-mer) → 10 (livre debout)
      tilt = lerp(tilt, 4, o);                                   // même inclinaison que le livre de l'accueil
      var yaw = lerp(lerp(0, -24, r), -26, o);                   // le livre se tourne de 3/4
      var spin = lerp(0, -360, r);                               // la France tourne sur elle-même
      var push = lerp(1, 1.35, p) * (1 - r) + bookScale * r;     // le drone avance, puis recule sur le livre
      push = lerp(push, endScale, o);
      var lift = lerp(0, H * 0.18, p) * (1 - r);                 // horizon qui remonte en rase-mer
      plane.style.transform = "translate(" + (dx * clamp(z * 1.4) + tgX * o) + "px," + (dy * clamp(z * 1.4) + lift + tgY * o) + "px) " +
        "rotateX(" + tilt + "deg) rotateY(" + yaw + "deg) rotateZ(" + spin + "deg) scale3d(" + push + "," + push + "," + lerp(1, push, o) + ")";
      // en fin de course, même point de vue que le livre de l'accueil (perspective centrée sur lui)
      if (o > 0) { world.style.perspective = lerp(900, 1200, o) + "px"; world.style.perspectiveOrigin = "50% " + lerp(H * 0.35, H / 2 + tgY, o) + "px"; }

      map.style.opacity = String(1 - f);
      fog.style.opacity = String(p * (1 - f) * 0.9);
      var frA = vis(t >= FR_SHOW ? 1 - bk : 0);
      frs.forEach(function (s) { s.style.opacity = frA; });
      book.style.opacity = vis(bk);
      // le décor s'efface et laisse voir le site, déjà en place derrière
      var bgA = 1 - io(seg(t, 8100, 8900));
      bgfill.style.opacity = sky.style.opacity = String(bgA);
      // décor patrimoine : apparaît quand la France se détache ; le phare balaie, éclaire tout en doré,
      // et quand la lumière retombe, la tour Eiffel est là, devant.
      if (her) {
        var hA = io(seg(t, 5200, 6300)), rise = 1 - io(seg(t, 5200, 7000)), drift = seg(t, 7000, 9300);
        her.style.opacity = vis(hA * bgA);
        herL.forEach(function (l, i) {
          var depth = [6, 12, 10][i];
          l.style.transform = "translateY(" + (rise * depth) + "vh) scale(" + (1 + drift * 0.025 * (i + 1)) + ")";
        });
        // faisceau : balaie le ciel (5,6 → 6,6 s) puis se tourne vers nous et s'élargit
        var sweep = io(seg(t, 5600, 6600)), face = io(seg(t, 6400, 6900)) * (1 - io(seg(t, 7000, 7900)));
        if (beam) beam.setAttribute("transform", "rotate(" + lerp(lerp(215, 168, sweep) + 30 * io(seg(t, 7000, 9300)), 180, face) + " 35 35) scale(" + lerp(1, 1.4, face) + "," + lerp(1, 5, face) + ")");
        // l'éclair doré part du phare : on DÉPLACE un grand halo prêt à l'avance (pas de repeinture)
        if (lr) flash.style.transform = "translate(" + (lr.left + lr.width / 2 - FD) + "px," + (lr.top + lr.height / 2 - FD) + "px)";
        var fl = io(seg(t, 6550, 6950)) * (1 - io(seg(t, 7000, 7600)));
        flash.style.opacity = vis(fl);
        herFront.style.opacity = t < 6950 ? "0.002" : "1";
      }
      if (site) site.style.opacity = vis(seg(t, 7900, 8100));
      caption.classList.toggle("show", t > 1300 && t < 4300);

      if (warm) return;
      if (t < 9450) requestAnimationFrame(frame); else finish();
    }
    // halo de l'éclair : carré de 2 diagonales d'écran, centré sur le phare par translation
    var FD = Math.ceil(Math.sqrt(W * W + H * H));
    flash.style.width = flash.style.height = 2 * FD + "px";
    flash.style.transform = "translate(" + (W * 0.9 - FD) + "px," + (H * 0.7 - FD) + "px)";
    // Échauffement : première image dessinée et tout préparé AVANT de lancer le chrono,
    // pour que l'animation démarre sans saut.
    draw([FR[0] + 140, FR[1] + 18], k0, 1, false, true);
    frame(-1);
    requestAnimationFrame(function () { requestAnimationFrame(frame); });
  }

  function finish(instant) {
    if (done) return;
    done = true;
    if (site) site.inert = false;
    if (typeof onKey === "function") document.removeEventListener("keydown", onKey);
    document.documentElement.classList.remove("intro-on");
    var hb = document.querySelector(".showcase .book");
    if (hb && !instant) { hb.style.animation = "none"; void hb.offsetWidth; hb.style.animation = ""; }
    if (site) { site.style.transform = site.style.opacity = site.style.borderRadius = site.style.boxShadow = site.style.overflow = ""; }
    if (frs) frs.forEach(function (s) { s.style.transform = s.style.opacity = ""; });
    var free = function () { if (glFree) try { glFree(); } catch (e) {} };
    if (instant) { intro.remove(); free(); return; }
    intro.style.transition = "opacity .35s ease"; intro.style.opacity = "0";
    setTimeout(function () { intro.remove(); free(); }, 400);
  }
})();
