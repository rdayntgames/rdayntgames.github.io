// La misma página sirve para la web y para dentro de la app.
// Dentro de la app existe window.Tienda (puente con Android).
(function () {
  var enApp = typeof window.Tienda !== "undefined";
  if (enApp) document.body.classList.add("en-app");
  // Desde la app 1.5 (versionCode 6) la app ya no instala por dentro (Google Play Protect la marcaba
  // como «dañina»): el juego se baja con el navegador y se instala desde ahí. Las apps viejas siguen igual.
  var versionApp = -1;
  try { if (enApp) versionApp = Tienda.versionTienda(); } catch (e) {}
  var appNavegador = versionApp >= 6;
  // iPhone, iPad (los iPad nuevos dicen «Macintosh» pero tienen pantalla táctil)
  var esIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  if (esIOS) document.body.classList.add("ios");

  function boton(texto, clase, accion) {
    var b = document.createElement(accion ? "button" : "span");
    b.className = "boton " + (clase || "");
    b.textContent = texto;
    if (accion) b.onclick = accion;
    return b;
  }

  // ---- El tráiler de cada juego (se ve encima de la página, sin salir de ella) ----
  // Los videos viven solo en la dirección nueva (la copia vieja de la tienda no los lleva).
  var BASE = location.hostname === "rdayntgames.github.io" ? "https://ntjuegas.github.io/" : "";
  var cerrarAbierto = null;   // si hay un tráiler abierto, esto lo cierra
  // El botón de «atrás» (del navegador o del teléfono) cierra el tráiler en vez de salir de la página.
  window.addEventListener("popstate", function () { if (cerrarAbierto) cerrarAbierto(true); });

  function verTrailer(j) {
    if (cerrarAbierto) return;
    // con el teléfono parado sale el tráiler vertical; acostado o en la computadora, el horizontal
    var vertical = !!j.trailer_vertical && window.innerHeight > window.innerWidth;
    var capa = document.createElement("div");
    capa.className = "trailer-capa" + (vertical ? " vertical" : "");
    capa.innerHTML = '<div class="trailer-caja"><div class="trailer-arriba"><b></b>' +
      '<button type="button" class="trailer-cerrar">✕ Cerrar</button></div>' +
      '<video controls playsinline webkit-playsinline preload="auto"></video></div>';
    capa.querySelector("b").textContent = "Tráiler de " + j.nombre;
    var v = capa.querySelector("video");
    if (enApp) v.setAttribute("controlsList", "nofullscreen");   // (dentro de la app ya llena la pantalla)
    v.poster = BASE + ((vertical && j.trailer_portada_vertical) || j.trailer_portada || "");
    v.src = BASE + (vertical ? j.trailer_vertical : j.trailer);
    var empujado = false;   // (se puso una entrada en el historial pa' que «atrás» lo cierre)
    function tecla(e) { if (e.key === "Escape" || e.key === "Esc") cerrar(false); }
    function cerrar(desdeAtras) {
      if (cerrarAbierto !== cerrar) return;
      cerrarAbierto = null;
      v.pause();
      v.removeAttribute("src");   // (que deje de bajar el video)
      v.load();
      if (capa.parentNode) capa.parentNode.removeChild(capa);
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
      if (!desdeAtras && empujado) history.back();
    }
    cerrarAbierto = cerrar;
    capa.addEventListener("click", function (e) { if (e.target === capa) cerrar(false); });
    capa.querySelector(".trailer-cerrar").onclick = function () { cerrar(false); };
    document.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    document.body.appendChild(capa);
    try { history.pushState({ trailer: j.id }, ""); empujado = true; } catch (e) {}
    var p = v.play();
    if (p && p.catch) p.catch(function () {});   // (si el teléfono no deja que arranque solo, se toca ▶)
  }

  // La foto del juego con el ▶ encima (también abre el tráiler).
  function fotoConTrailer(d, j) {
    var img = d.querySelector("img");
    var marco = document.createElement("button");
    marco.type = "button";
    marco.className = "foto-trailer";
    marco.setAttribute("aria-label", "Ver el tráiler de " + j.nombre);
    img.parentNode.insertBefore(marco, img);
    marco.appendChild(img);
    marco.insertAdjacentHTML("beforeend", '<span class="play" aria-hidden="true">▶</span><span class="etiqueta-trailer">Tráiler del juego</span>');
    marco.onclick = function () { verTrailer(j); };
  }

  function botonTrailer(j) {
    return boton("▶ Ver el tráiler del juego", "rojo", function () { verTrailer(j); });
  }

  function tarjeta(j) {
    var d = document.createElement("div");
    d.className = "juego";
    d.innerHTML =
      '<img alt="" src="' + (j.imagen || "") + '" onerror="this.style.visibility=\'hidden\'">' +
      '<div class="info"><h3></h3><p class="desc"></p><div class="datos"></div>' +
      '<div class="barra"><i></i></div><div class="acciones"></div></div>';
    d.querySelector("h3").textContent = j.nombre;
    d.querySelector(".desc").textContent = j.descripcion || "";
    d.querySelector(".datos").textContent =
      (j.version_texto || "") + (j.tamano ? " · " + j.tamano : "");
    if (j.apk && j.estado !== "pronto" && j.id !== "tienda") {
      // contador de descargas (lo llena ponerCuentas cuando GitHub contesta)
      var c = document.createElement("span");
      c.className = "cuenta";
      c.setAttribute("data-base", baseArchivo(j.apk));
      c.setAttribute("data-antes", d.querySelector(".datos").textContent ? " · " : "");
      d.querySelector(".datos").appendChild(c);
    }
    var acc = d.querySelector(".acciones");
    if (j.trailer) fotoConTrailer(d, j);

    if (j.estado === "pronto" || (!j.apk && !j.web)) {
      acc.appendChild(boton("Próximamente", "gris"));
      if (j.trailer) acc.appendChild(botonTrailer(j));
      return d;
    }
    if (!enApp) {
      // iPhone/iPad no instala APK: solo se juega en el navegador
      if (j.web) {
        var w = document.createElement("a");
        w.className = "boton verde";
        w.href = j.web;
        w.textContent = esIOS ? "Jugar en el navegador" : "Jugar en el navegador (sin instalar)";
        acc.appendChild(w);
      }
      if (j.apk && !esIOS) {
        var a = document.createElement("a");
        a.className = "boton";
        a.href = j.apk;
        a.textContent = "Descargar para Android";
        a.style.marginTop = "8px";
        acc.appendChild(a);
      }
      if (esIOS && !j.web) {
        acc.appendChild(boton("Pronto en iPhone", "gris"));
      }
      if (j.trailer) acc.appendChild(botonTrailer(j));
      return d;
    }
    var instalada = Tienda.versionInstalada(j.paquete); // -1 = no está
    if (instalada >= j.version) {
      acc.appendChild(boton("Jugar", "verde", function () { Tienda.abrir(j.paquete); }));
    } else {
      var texto = instalada < 0 ? "Instalar" : "Actualizar";
      acc.appendChild(boton(texto, "", function () {
        var url = new URL(j.apk, location.href).href;
        if (appNavegador) {
          // app 1.5 o más nueva: lo baja el navegador del teléfono y se instala desde ahí
          var b = this;
          b.textContent = "Bajando en el navegador…";
          b.disabled = true;
          notaInstalar(d, instalada < 0);
          setTimeout(function () { b.textContent = texto; b.disabled = false; }, 8000);
          Tienda.descargar(j.id, url, j.nombre);
          return;
        }
        this.textContent = "Descargando…";
        this.disabled = true;
        d.querySelector(".barra").style.display = "block";
        Tienda.descargar(j.id, url, j.nombre);
      }));
    }
    if (j.trailer) acc.appendChild(botonTrailer(j));
    return d;
  }

  // ---- Contador de descargas ----
  // Los APK viven en GitHub «Releases» y GitHub cuenta cada descarga. Se suman todas las versiones de cada
  // archivo: «DaleConchoRD-0.34.apk» + «DaleConchoRD-0.35.apk»… -> «DaleConchoRD»; la tienda es «NTJuegos».
  var REPOS = ["rdayntgames/rdayntgames.github.io", "ntjuegas/ntjuegas.github.io"];
  var cuentas = null;   // { "DaleConchoRD": 23, ... } cuando ya llegaron

  function baseArchivo(url) {
    var nombre = String(url).split("?")[0].split("/").pop();
    return nombre.replace(/\.apk$/i, "").replace(/-[0-9][0-9.]*$/, "");
  }

  function ponerCuentas() {
    if (!cuentas) return;
    Array.prototype.forEach.call(document.querySelectorAll("[data-base]"), function (el) {
      var n = cuentas[el.getAttribute("data-base")] || 0;
      if (n < 1) { el.textContent = ""; return; }   // (en 0 no se muestra)
      el.textContent = (el.getAttribute("data-antes") || "") + "⬇ " + n.toLocaleString("es-DO") +
        (n === 1 ? " descarga" : " descargas") + (el.getAttribute("data-despues") || "");
    });
  }

  function contarDescargas() {
    var GUARDA = "ntj_descargas", VIGENCIA = 5 * 60 * 1000;   // se vuelve a preguntar cada 5 minutos
    try {
      var g = JSON.parse(localStorage.getItem(GUARDA) || "null");
      if (g && g.n && Date.now() - g.t < VIGENCIA) { cuentas = g.n; ponerCuentas(); return; }
    } catch (e) {}
    Promise.all(REPOS.map(function (repo) {
      return fetch("https://api.github.com/repos/" + repo + "/releases?per_page=100")
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });
    })).then(function (listas) {
      var n = {}, hay = false;
      listas.forEach(function (rels) {
        if (!Array.isArray(rels)) return;
        rels.forEach(function (rel) {
          (rel.assets || []).forEach(function (a) {
            if (!/\.apk$/i.test(a.name)) return;
            var b = baseArchivo(a.name);
            n[b] = (n[b] || 0) + (a.download_count || 0);
            hay = true;
          });
        });
      });
      if (!hay) return;   // (GitHub no contestó: no se muestra nada)
      cuentas = n;
      try { localStorage.setItem(GUARDA, JSON.stringify({ t: Date.now(), n: n })); } catch (e) {}
      ponerCuentas();
    });
  }

  // Debajo del juego: qué hacer cuando el navegador termine de bajarlo (app 1.5 o más nueva).
  function notaInstalar(d, nuevo) {
    var n = d.querySelector(".nota-instalar");
    if (!n) {
      n = document.createElement("p");
      n.className = "nota nota-instalar";
      d.querySelector(".info").appendChild(n);
    }
    n.textContent = "Se está bajando con el navegador. Cuando termine, toca el archivo para " +
      (nuevo ? "instalarlo" : "actualizarlo") + " (si Android pide permiso, actívalo). " +
      "Después vuelve aquí y el botón dirá «Jugar».";
  }

  // Android llama a esto mientras baja: progreso("ntcityrd", 0..100)
  window.progreso = function (id, pct) {
    var t = document.querySelector('[data-id="' + id + '"] .barra i');
    if (t) t.style.width = pct + "%";
  };
  // Android avisa cuando ya se instaló o falló, para refrescar
  window.recargar = function () { cargar(); };

  function cargar() {
    fetch("juegos.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (datos) {
        var lista = document.getElementById("lista");
        lista.innerHTML = "";
        datos.juegos.forEach(function (j) {
          var t = tarjeta(j);
          t.setAttribute("data-id", j.id);
          lista.appendChild(t);
        });
        if (enApp && Tienda.versionTienda() < datos.tienda.version) {
          var aviso = tarjeta({ id: "tienda", nombre: "Hay una versión nueva de NT Juegos",
            descripcion: appNavegador
              ? "Toca «Actualizar»: se baja con el navegador y la instalas encima de esta."
              : "Actualízala con un toque para tener todo lo nuevo.",
            paquete: datos.tienda.paquete, version: datos.tienda.version,
            apk: datos.tienda.apk, estado: "listo" });
          aviso.setAttribute("data-id", "tienda");
          lista.insertBefore(aviso, lista.firstChild);
        }
        ponerCuentas();
      })
      .catch(function () {
        document.getElementById("lista").innerHTML =
          '<p class="nota">No se pudo cargar la lista. Revisa tu internet.</p>';
      });
  }
  cargar();
  contarDescargas();
})();
