// La misma página sirve para la web y para dentro de la app.
// Dentro de la app existe window.Tienda (puente con Android).
(function () {
  var enApp = typeof window.Tienda !== "undefined";
  if (enApp) document.body.classList.add("en-app");
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
    var acc = d.querySelector(".acciones");

    if (j.estado === "pronto" || (!j.apk && !j.web)) {
      acc.appendChild(boton("Próximamente", "gris"));
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
      return d;
    }
    var instalada = Tienda.versionInstalada(j.paquete); // -1 = no está
    if (instalada >= j.version) {
      acc.appendChild(boton("Jugar", "verde", function () { Tienda.abrir(j.paquete); }));
    } else {
      var texto = instalada < 0 ? "Instalar" : "Actualizar";
      acc.appendChild(boton(texto, "", function () {
        this.textContent = "Descargando…";
        this.disabled = true;
        d.querySelector(".barra").style.display = "block";
        Tienda.descargar(j.id, new URL(j.apk, location.href).href, j.nombre);
      }));
    }
    return d;
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
            descripcion: "Actualízala con un toque para tener todo lo nuevo.",
            paquete: datos.tienda.paquete, version: datos.tienda.version,
            apk: datos.tienda.apk, estado: "listo" });
          aviso.setAttribute("data-id", "tienda");
          lista.insertBefore(aviso, lista.firstChild);
        }
      })
      .catch(function () {
        document.getElementById("lista").innerHTML =
          '<p class="nota">No se pudo cargar la lista. Revisa tu internet.</p>';
      });
  }
  cargar();
})();
