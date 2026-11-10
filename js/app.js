/* Carta, pedido y envío por WhatsApp.
   Los productos, precios y el horario están en carta.js. */
(function () {
  "use strict";

  if (!window.CARTA) return;
  var C, N;
  // Dentro del panel (/admin) la página se muestra con los cambios sin publicar; en modo edición los
  // botones «Editar» y el + de cada producto abren el panel (los textos y el diseño no se editan).
  var PREVIA = /[?&]preview/.test(location.search) && window.parent !== window;
  var EDITAR = PREVIA && /[?&]edit/.test(location.search);
  var editando = EDITAR;
  var ZONA = "America/Santiago";
  var GUARDADO = "pedido-v1";
  var DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  var DIAS_TXT = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var DIAS_CORTO = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

  /* ---------- utilidades ---------- */
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function plata(n) { return "$" + String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  /* La carta la escribe el panel: lo que no es texto de confianza se limpia antes de usarlo. */
  // enlaces: solo https (javascript:, data: y otros esquemas no se usan)
  function enlaceSeguro(u) { u = String(u == null ? "" : u).trim(); return /^https:\/\//i.test(u) ? u : ""; }
  /* Apps de delivery del local ("appsDelivery" en carta.js): solo las que traen nombre y dirección https. */
  function appsDelivery() {
    return (N.appsDelivery || []).map(function (a) {
      return a && a.nombre ? { nombre: unaLinea(a.nombre, 40), url: enlaceSeguro(a.url) } : null;
    }).filter(function (a) { return a && a.nombre && a.url; });
  }
  function botonApp(a) {
    return '<a class="app-delivery" href="' + esc(a.url) + '" target="_blank" rel="noopener">' +
      esc(a.nombre) + icono("flecha") + "</a>";
  }
  // texto de una línea (p. ej. datos de Photon): sin caracteres de control ni saltos de línea
  function unaLinea(t, max) {
    return String(t == null ? "" : t).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max || 160);
  }
  // número entero dentro de un rango (min/max de los grupos, etc.)
  function entero(v, def, min, max) { var n = Math.floor(Number(v)); if (!isFinite(n)) n = def; return Math.min(max, Math.max(min, n)); }
  // texto dentro de url("…") en un estilo: se escapan comillas, barras y saltos para no salir de la cadena CSS
  function cadenaCss(t) { return String(t).replace(/["\\\n\r\f]/g, function (c) { return "\\" + c.charCodeAt(0).toString(16) + " "; }); }
  function sinTildes(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function minus(s) { s = String(s || ""); return s.charAt(0).toLowerCase() + s.slice(1); }
  function mayus(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  function dos(n) { return (n < 10 ? "0" : "") + n; }
  function leer(clave) { try { return JSON.parse(localStorage.getItem(clave) || "null"); } catch (e) { return null; } }
  function guardar(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ } }
  /* Con "sucursales" en carta.js, el pedido va al WhatsApp de la sucursal elegida; sin elegir, a la primera. */
  /* Analítica (api/estadisticas.js): cuenta visitas, clics y pedidos por día, sin datos de la persona.
     Las del embudo se cuentan una vez por visita (sesión). En el panel no se cuenta nada. */
  function medir(e, datos) {
    if (PREVIA || location.protocol === "file:") return;
    var unaVez = ["visita", "abrir", "asistente"].indexOf(e) >= 0;
    try {
      if (unaVez) { if (sessionStorage.getItem("medido-" + e)) return; sessionStorage.setItem("medido-" + e, "1"); }
    } catch (x) { /* sin almacenamiento: se cuenta igual */ }
    var cuerpo = JSON.stringify(Object.assign({ e: e }, datos || {}));
    try {
      if (navigator.sendBeacon && navigator.sendBeacon("api/estadisticas", new Blob([cuerpo], { type: "application/json" }))) return;
      fetch("api/estadisticas", { method: "POST", headers: { "Content-Type": "application/json" }, body: cuerpo, keepalive: true }).catch(function () {});
    } catch (x) { /* la analítica nunca debe romper la página */ }
  }
  function primeraVez(e) {
    try { if (sessionStorage.getItem("medido-" + e)) return false; sessionStorage.setItem("medido-" + e, "1"); } catch (x) {}
    return true;
  }
  function sucursales() { return (N.sucursales || []).filter(function (s) { return s && s.nombre && s.whatsapp; }); }
  function sucursalElegida() {
    var ss = sucursales();
    var elegida = typeof pedido === "object" && pedido ? pedido.sucursal : "";
    return ss.filter(function (s) { return s.nombre === elegida; })[0] || null;
  }
  function wsp(texto) {
    var s = sucursalElegida() || sucursales()[0];
    return "https://wa.me/" + String((s || N).whatsapp || "").replace(/\D/g, "") + (texto ? "?text=" + encodeURIComponent(texto) : "");
  }

  var ICONOS = {
    mas: '<path d="M12 5v14M5 12h14"/>',
    flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    abajo: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    pausa: '<path d="M9 6v12M15 6v12"/>',
    play: '<path d="M8 5.5v13l10-6.5-10-6.5Z"/>',
    ubicacion: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
    cupon: '<path d="M3.5 7h17v3a2 2 0 0 0 0 4v3h-17v-3a2 2 0 0 0 0-4Z"/><path d="M10 7.5v1.5M10 11.25v1.5M10 15v1.5"/>',
    wsp: '<path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6Z"/><path d="M9.2 8.6c.3 2.7 2.4 5 5.2 5.6l1.2-1.3-1.8-1-1 .7c-.9-.5-1.7-1.3-2.2-2.2l.7-1-1-1.8Z"/>',
    izquierda: '<path d="m15 6-6 6 6 6"/>',
    derecha: '<path d="m9 6 6 6-6 6"/>'
  };
  function icono(nombre) { return '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true">' + ICONOS[nombre] + "</svg>"; }

  /* ---------- índice de la carta ---------- */
  var PRODUCTOS = {};
  var GRUPOS = {};
  var RUTA_CAT = {};
  var CATS = {};
  var CON_HORARIO = false;
  var SOLO_RETIRO = false;
  var HORARIO_ACTIVO = false;
  /* Toma los datos de carta.js, o los que manda el panel en la vista previa. "ruta" dice dónde está
     cada texto dentro de los datos, para que el panel sepa qué se editó. */
  function usarCarta(datos) {
    C = datos;
    N = C.negocio || {};
    /* "soloRetiro": true en carta.js => la página no ofrece delivery (ej: el reparto va por apps). */
    SOLO_RETIRO = N.soloRetiro === true;
    if (SOLO_RETIRO && pedido) pedido.modo = "retiro";   /* en la vista previa del panel el pedido ya existe */
    if (window.aplicarTema) window.aplicarTema(C);
    PRODUCTOS = {};
    GRUPOS = {};
    RUTA_CAT = {};
    CATS = {};
    (C.secciones || []).forEach(function (sec, si) {
      (sec.categorias || []).forEach(function (cat, ci) {
        var ruta = "secciones." + si + ".categorias." + ci;
        RUTA_CAT[cat.id] = ruta;
        CATS[cat.id] = cat;
        (cat.productos || []).forEach(function (p, pi) {
          PRODUCTOS[p.id] = { p: p, cat: cat, sec: sec, ruta: ruta + ".productos." + pi };
        });
      });
    });
    (C.personalizacion || []).forEach(function (g) { GRUPOS[g.id] = g; });
    CON_HORARIO = !!C.horario && Object.keys(C.horario).some(function (k) { return rangos(C.horario[k]).length > 0; });
    // Con "horarioConfirmado": false el horario solo se muestra: no hay abierto/cerrado ni se bloquean pedidos.
    HORARIO_ACTIVO = CON_HORARIO && C.horarioConfirmado !== false;
  }
  usarCarta(window.CARTA);

  function ingrediente(id) { return (C.ingredientes && C.ingredientes[id]) || String(id || "").replace(/-/g, " "); }
  function gruposDe(id) {
    var x = PRODUCTOS[id];
    var lista = x.p.personalizar || x.cat.personalizar || [];
    return lista.map(function (g) { return GRUPOS[g]; }).filter(Boolean);
  }
  function gruposProducto(id) { return gruposDe(id).filter(function (g) { return !g.porRoll; }); }
  function gruposRoll(id) { return gruposDe(id).filter(function (g) { return g.porRoll; }); }
  /* Grupos que se eligen en cada roll (proteína, relleno, envoltura) y grupos de cambios opcionales. */
  function gruposArmado(id) { return gruposRoll(id).filter(function (g) { return g.tipo === "elegir"; }); }
  function gruposCambio(id) { return gruposRoll(id).filter(function (g) { return g.tipo !== "elegir"; }); }
  function rollsDe(id) {
    var p = PRODUCTOS[id].p;
    if (typeof p.rolls === "number" && p.rolls > 0) {
      var lista = [];
      for (var i = 0; i < Math.min(Math.floor(p.rolls), 30); i++) lista.push({});
      return lista;
    }
    if (p.rolls && p.rolls.length) return p.rolls;
    return gruposRoll(id).length ? [{}] : [];
  }
  /* Mínimo y máximo de un grupo según lo elegido: una opción con "suma" ({ "agregados": 1 }) deja elegir
     más en otro grupo (ej: vegetariano lleva 2 agregados). */
  function limites(g, conf) {
    var mas = 0;
    var el = (conf && conf.elecciones) || {};
    Object.keys(el).forEach(function (gid) {
      (el[gid] || []).forEach(function (oid) { var o = opcionDe(gid, oid); if (o && o.suma && o.suma[g.id] > 0) mas += entero(o.suma[g.id], 0, 0, 50); });
    });
    return { min: entero(g.min, 0, 0, 50) + mas, max: entero(g.max, 1, 1, 50) + mas };
  }
  /* Al desmarcar una opción con "suma", lo elegido de más en el otro grupo se quita. */
  function recortarElecciones(id, conf) {
    gruposProducto(id).forEach(function (g) {
      var sel = conf.elecciones[g.id];
      var max = limites(g, conf).max;
      if (sel && sel.length > max) conf.elecciones[g.id] = sel.slice(0, max);
    });
  }
  function tieneOpciones(p) { return !!(p.opciones && p.opciones.length); }
  function unidad(id) { var u = PRODUCTOS[id].p.unidad; return typeof u === "string" && /^[\p{L} ]{1,20}$/u.test(u) ? u : "Roll"; }
  function personalizable(id) { return tieneOpciones(PRODUCTOS[id].p) || gruposDe(id).length > 0; }
  function opcionDe(grupoId, opId) {
    var g = GRUPOS[grupoId];
    return g && (g.opciones || []).filter(function (o) { return o.id === opId; })[0];
  }
  function precioBase(p, opcion) {
    if (opcion && p.preciosOpciones && p.preciosOpciones[opcion] != null) return p.preciosOpciones[opcion];
    return p.precio;
  }
  function precioMinimo(p) {
    var lista = p.preciosOpciones ? Object.keys(p.preciosOpciones).map(function (k) { return p.preciosOpciones[k]; }) : [];
    var min = lista.length ? Math.min.apply(null, lista) : p.precio;
    var varia = lista.some(function (v) { return v !== min; });
    return { valor: min, desde: varia };
  }
  /* Lo elegido en cada roll con lo que se cobra. Con "gratis" en una opción, las primeras de esa opción no se cobran;
     con "gratis" en el grupo, las primeras opciones con precio del grupo. */
  function detalleArmado(id, conf) {
    var armado = conf.armado || [];
    var filas = armado.map(function () { return {}; });
    gruposArmado(id).forEach(function (g) {
      var gratis = g.gratis || 0;
      var usadas = {};
      armado.forEach(function (r, i) {
        var o = r && opcionDe(g.id, r[g.id]);
        if (!o) return;
        var cobro = o.precio || 0;
        var libre = false;
        usadas[o.id] = (usadas[o.id] || 0) + 1;
        if (cobro > 0 && o.gratis && usadas[o.id] <= o.gratis) { cobro = 0; libre = true; }
        else if (cobro > 0 && gratis > 0) { gratis--; cobro = 0; libre = true; }
        filas[i][g.id] = { o: o, cobro: cobro, gratis: libre };
      });
    });
    return filas;
  }
  function precioUnitario(id, conf) {
    var total = precioBase(PRODUCTOS[id].p, conf.opcion);
    detalleArmado(id, conf).forEach(function (f) { Object.keys(f).forEach(function (k) { total += f[k].cobro; }); });
    (conf.cambios || []).forEach(function (c) { var o = opcionDe(c.grupo, c.opcion); if (o) total += o.precio || 0; });
    var el = conf.elecciones || {};
    Object.keys(el).forEach(function (g) {
      el[g].forEach(function (oid) { var o = opcionDe(g, oid); if (o) total += o.precio || 0; });
    });
    return total;
  }
  function nombreLinea(id) {
    var x = PRODUCTOS[id];
    if (sinTildes(x.sec.nombre) === "promos" || sinTildes(x.cat.nombre) === sinTildes(x.p.nombre)) return x.p.nombre;
    // «Tabla 20 piezas» en «Tablas» o «Arma tu roll con arroz» en «Arma tu roll» ya dicen de dónde son
    if (sinTildes(x.p.nombre).indexOf(sinTildes(x.cat.nombre).replace(/s$/, "")) === 0) return x.p.nombre;
    return x.cat.nombre + " · " + x.p.nombre;
  }
  function textoCambio(c) {
    var o = opcionDe(c.grupo, c.opcion);
    var g = GRUPOS[c.grupo];
    var nombre = o ? o.nombre : c.opcion;
    var t;
    if (c.en) t = mayus(minus(nombre)) + " en vez de " + minus(ingrediente(c.en));
    else if (g && g.tipo === "envoltura") t = "Envoltura: " + minus(nombre);
    else if (g && g.tipo === "extra") t = nombre;
    else t = "Agregar " + minus(nombre);
    return t + (o && o.precio ? " +" + plata(o.precio) : "");
  }
  /* Detalle de lo elegido, una línea por cambio. Sirve para el pedido y para el mensaje. */
  function detalleConf(id, conf) {
    var lineas = [];
    var varios = rollsDe(id).length > 1;
    var ga = gruposArmado(id);
    var armado = detalleArmado(id, conf);
    armado.forEach(function (f, i) {
      var partes = ga.filter(function (g) { return f[g.id]; }).map(function (g) {
        var x = f[g.id];
        return g.nombre + ": " + x.o.nombre + (x.cobro ? " +" + plata(x.cobro) : x.gratis ? " (gratis)" : "");
      });
      if (partes.length) lineas.push({ texto: (armado.length > 1 ? unidad(id) + " " + (i + 1) : "Tu " + minus(unidad(id))) + ": " + partes.join(" · "), armado: true });
    });
    (conf.cambios || []).forEach(function (c, i) {
      lineas.push({ texto: (varios ? unidad(id) + " " + (c.roll + 1) + ": " : "") + textoCambio(c), cambio: i, roll: varios ? c.roll + 1 : 0, solo: textoCambio(c) });
    });
    gruposProducto(id).forEach(function (g) {
      if (g.tipo === "texto") {
        var t = (conf.textos || {})[g.id];
        if (t) lineas.push({ texto: g.nombre + ": " + t });
        return;
      }
      var sel = (conf.elecciones || {})[g.id] || [];
      if (!sel.length) return;
      var nombres = sel.map(function (oid) {
        var o = opcionDe(g.id, oid);
        return o ? o.nombre + (o.precio ? " +" + plata(o.precio) : "") : oid;
      });
      lineas.push({ texto: g.nombre + ": " + nombres.join(", ") });
    });
    return lineas;
  }

  /* ---------- horario ---------- */
  function rangos(txt) {
    if (!txt || /cerrad/i.test(txt)) return [];
    return String(txt).split(",").map(function (r) {
      var m = r.trim().match(/^(\d{1,2})[:.](\d{2})\s*(?:-|–|a)\s*(\d{1,2})[:.](\d{2})$/);
      if (!m) return null;
      var a = +m[1] * 60 + +m[2];
      var b = +m[3] * 60 + +m[4];
      if (b <= a) b += 1440;
      return [a, b];
    }).filter(Boolean);
  }
  function hora(min) { min = min % 1440; return dos(Math.floor(min / 60)) + ":" + dos(min % 60); }
  function ahora() {
    var d = new Date();
    try {
      var x = {};
      new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
        .formatToParts(d).forEach(function (p) { x[p.type] = p.value; });
      var dia = new Date(Date.UTC(+x.year, +x.month - 1, +x.day)).getUTCDay();
      return { fecha: x.year + "-" + x.month + "-" + x.day, dia: dia, min: (+x.hour % 24) * 60 + +x.minute };
    } catch (e) {
      return { fecha: d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate()), dia: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
  }
  function fechaMas(fecha, n) {
    var d = new Date(fecha + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function horarioDel(fecha, dia) {
    if ((C.diasCerrados || []).indexOf(fecha) >= 0) return [];
    return rangos((C.horario || {})[DIAS[dia]]);
  }
  function direccionCompleta() { return [N.direccion, N.sector].filter(Boolean).join(", "); }
  function estadoLocal() {
    if (!HORARIO_ACTIVO) return { abierto: true, texto: "", sinHorario: true };
    var t = ahora();
    var i, r;
    var ayer = horarioDel(fechaMas(t.fecha, -1), (t.dia + 6) % 7);
    for (i = 0; i < ayer.length; i++) {
      r = ayer[i];
      if (r[1] > 1440 && t.min < r[1] - 1440) return { abierto: true, texto: "Cerramos a las " + hora(r[1]) };
    }
    var hoy = horarioDel(t.fecha, t.dia);
    for (i = 0; i < hoy.length; i++) {
      r = hoy[i];
      if (t.min >= r[0] && t.min < r[1]) return { abierto: true, texto: "Cerramos a las " + hora(r[1]) };
    }
    for (i = 0; i < hoy.length; i++) {
      if (t.min < hoy[i][0]) return { abierto: false, texto: "Abrimos hoy a las " + hora(hoy[i][0]) };
    }
    for (i = 1; i <= 7; i++) {
      var d = (t.dia + i) % 7;
      var rs = horarioDel(fechaMas(t.fecha, i), d);
      if (rs.length) return { abierto: false, texto: "Abrimos " + (i === 1 ? "mañana" : "el " + DIAS_TXT[d]) + " a las " + hora(rs[0][0]) };
    }
    return { abierto: false, texto: "" };
  }
  function textoRangos(txt, sep) {
    var r = rangos(txt);
    return r.length ? r.map(function (x) { return hora(x[0]) + sep + hora(x[1]); }).join(", ") : "";
  }
  /* Agrupa los días seguidos con el mismo horario, empezando el lunes. */
  function tramosHorario() {
    var tramos = [];
    [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
      var v = textoRangos((C.horario || {})[DIAS[d]], "–");
      var ult = tramos[tramos.length - 1];
      if (ult && ult.v === v) ult.hasta = d; else tramos.push({ desde: d, hasta: d, v: v });
    });
    return tramos;
  }
  function horarioCorto() {
    if (!CON_HORARIO) return "";
    return tramosHorario().map(function (t) {
      return mayus(DIAS_CORTO[t.desde] + (t.hasta !== t.desde ? "–" + DIAS_CORTO[t.hasta] : "")) + " " + (t.v || "cerrado");
    }).join(" · ");
  }
  function horarioLargo() {
    return tramosHorario().map(function (t) {
      var junto = (t.hasta - t.desde + 7) % 7 === 1;   // dos días seguidos: «viernes y sábado»
      var dias = mayus(DIAS_TXT[t.desde]) + (t.hasta !== t.desde ? (junto ? " y " : " a ") + DIAS_TXT[t.hasta] : "");
      return "<b>" + esc(dias) + "</b><span>" + esc(t.v ? t.v.replace(/–/g, " – ") : "Cerrado") + "</span>";
    }).join("");
  }

  var estado = estadoLocal();

  /* ---------- cupones ----------
     Un cupón por pedido. Se valida aquí con las condiciones de carta.js y el pedido llega por
     WhatsApp con el cupón y el descuento, para que el local lo confirme. */
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function codigo(s) { return String(s || "").toUpperCase().replace(/\s+/g, ""); }
  function cuponDe(cod) {
    var k = codigo(cod);
    return k ? (C.cupones || []).filter(function (c) { return c && codigo(c.codigo) === k; })[0] : null;
  }
  function fechaTexto(f) { var p = String(f).split("-"); return +p[2] + " de " + MESES[+p[1] - 1]; }
  function listaY(a) { return a.length > 1 ? a.slice(0, -1).join(", ") + " y " + a[a.length - 1] : a.join(""); }
  // "los martes", "los sábados"
  function diasTexto(dias) {
    return listaY(dias.map(function (d) { var t = DIAS_TXT[DIAS.indexOf(d)]; return t && (/o$/.test(t) ? t + "s" : t); }).filter(Boolean));
  }
  function catsTexto(ids) { return listaY(ids.map(function (id) { return CATS[id] && CATS[id].nombre; }).filter(Boolean)); }
  function valorCupon(c) { return c.tipo === "monto" ? plata(c.valor) : (c.valor || 0) + "%"; }
  function nombreCupon(c) { return c.nombre || valorCupon(c) + " de descuento"; }
  function condicionesCupon(c) {
    var t = [];
    if (c.minimo) t.push("Pedido mínimo " + plata(c.minimo));
    if (c.aplica && c.aplica.length) t.push("Solo en " + catsTexto(c.aplica));
    if (c.modo === "retiro") t.push("Solo retiro en el local");
    else if (c.modo === "delivery") t.push("Solo delivery");
    if (c.dias && c.dias.length) t.push("Solo los " + diasTexto(c.dias));
    if (c.tipo !== "monto" && c.tope) t.push("Hasta " + plata(c.tope) + " de descuento");
    if (c.desde && c.desde > ahora().fecha) t.push("Desde el " + fechaTexto(c.desde));
    if (c.hasta) t.push("Hasta el " + fechaTexto(c.hasta));
    return t;
  }
  /* Si el cupón vale para el pedido de ahora y cuánto descuenta; si no, por qué */
  function evaluarCupon(c) {
    if (!c || c.activo === false) return { ok: false, motivo: "Este cupón ya no está disponible." };
    var t = ahora();
    if (c.desde && t.fecha < c.desde) return { ok: false, motivo: "Este cupón vale desde el " + fechaTexto(c.desde) + "." };
    if (c.hasta && t.fecha > c.hasta) return { ok: false, motivo: "Este cupón venció el " + fechaTexto(c.hasta) + "." };
    if (c.dias && c.dias.length && c.dias.indexOf(DIAS[t.dia]) < 0) return { ok: false, motivo: "Este cupón vale solo los " + diasTexto(c.dias) + "." };
    if (c.modo && c.modo !== pedido.modo) return { ok: false, motivo: c.modo === "retiro" ? "Este cupón es solo para retiro en el local." : "Este cupón es solo para delivery." };
    var sub = subtotal();
    if (c.minimo && sub < c.minimo) return { ok: false, motivo: "Es para pedidos desde " + plata(c.minimo) + ": te faltan " + plata(c.minimo - sub) + "." };
    var base = sub;
    if (c.aplica && c.aplica.length) {
      base = pedido.items.reduce(function (s, it) {
        return s + (c.aplica.indexOf(PRODUCTOS[it.id].cat.id) >= 0 ? precioUnitario(it.id, it.conf) * it.cant : 0);
      }, 0);
      if (!base) return { ok: false, motivo: "Es para " + catsTexto(c.aplica) + ": agrega algo de ahí a tu pedido." };
    }
    var d = c.tipo === "monto" ? Math.min(c.valor || 0, base) : Math.round(base * (c.valor || 0) / 100);
    if (c.tipo !== "monto" && c.tope) d = Math.min(d, c.tope);
    return d > 0 ? { ok: true, descuento: d } : { ok: false, motivo: "Este cupón no tiene descuento." };
  }
  function cuponActual() { return pedido.cupon ? cuponDe(pedido.cupon) : null; }
  function descuento() {
    if (!pedido.cupon || !pedido.items.length) return 0;
    var e = evaluarCupon(cuponActual());
    return e.ok ? e.descuento : 0;
  }

  /* ---------- datos del local en la página ---------- */
  function pintarDatos() {
    var direccionCiudad = [N.direccion, N.sector, N.ciudad].filter(Boolean).join(", ");
    var datos = {
      nombre: N.nombre, direccion: N.direccion, ciudad: N.ciudad, region: N.region,
      "direccion-ciudad": direccionCiudad, horario: horarioCorto(),
      instagram: N.instagram ? "@" + N.instagram : "",
      facebook: enlaceSeguro(N.facebook),
      sector: N.sector || N.ciudad,
      "sector-ciudad": [N.sector, N.ciudad].filter(Boolean).join(", "),
      // con el horario confirmado no se agrega ninguna nota (ni arriba ni en la ubicación)
      "nota-horario": !CON_HORARIO || HORARIO_ACTIVO ? "" : "Horario referencial, por confirmar. Escríbenos por WhatsApp antes de venir.",
      mapa: enlaceSeguro(N.mapa)
    };
    var ss = sucursales();
    $$("[data-dato]").forEach(function (el) {
      var v = datos[el.getAttribute("data-dato")];
      if (v) el.textContent = v;
    });
    // un botón de WhatsApp por sucursal: en la portada con su nombre, en el pie también con el número
    var numeros = ss.length ? ss : N.whatsapp ? [{ nombre: "WhatsApp", whatsapp: N.whatsapp, whatsappVisible: N.whatsappVisible }] : [];
    var botonWsp = function (s, clase, texto) {
      return '<a class="' + clase + '" href="https://wa.me/' + esc(String(s.whatsapp).replace(/\D/g, "")) + '" target="_blank" rel="noopener">' + icono("wsp") + texto + "</a>";
    };
    var portadaWsp = $("[data-portada-wsp]"), pieWsp = $("[data-pie-wsp]");
    if (portadaWsp && numeros.length) {
      portadaWsp.innerHTML = numeros.map(function (s) {
        // con un solo local, el botón muestra el número en vez del nombre de la sucursal
        return botonWsp(s, "wsp-sucursal wsp-sucursal--portada", "<span><small>Pedir por WhatsApp</small><b>" + esc(ss.length ? s.nombre : s.whatsappVisible || s.nombre) + "</b></span>");
      }).join("");
    }
    if (pieWsp && numeros.length) {
      pieWsp.innerHTML = numeros.map(function (s) {
        return botonWsp(s, "wsp-sucursal", "<span><b>" + esc(s.nombre) + "</b><small>" + esc(s.whatsappVisible || "+" + s.whatsapp) + "</small></span>" + icono("flecha"));
      }).join("");
    }
    // apps de delivery ("appsDelivery" en carta.js): el local reparte por ahí, no desde esta página
    var apps = appsDelivery();
    var cajaApps = $("[data-apps-delivery]");
    if (cajaApps) {
      cajaApps.hidden = !apps.length;
      if (apps.length) $("[data-apps-delivery-botones]").innerHTML = apps.map(botonApp).join("");
    }
    // lo que no tiene datos (dirección, horario, Instagram) no se muestra
    $$("[data-si]").forEach(function (el) { el.hidden = !datos[el.getAttribute("data-si")]; });
    $$("[data-wsp]").forEach(function (a) { a.href = wsp(""); });
    if (N.instagram) $$("[data-instagram]").forEach(function (a) { a.href = "https://www.instagram.com/" + N.instagram + "/"; });
    if (enlaceSeguro(N.facebook)) $$("[data-facebook]").forEach(function (a) { a.href = enlaceSeguro(N.facebook); });
    if (enlaceSeguro(N.mapa)) $$("[data-mapa]").forEach(function (a) { a.href = enlaceSeguro(N.mapa); });
    var mapa = $("[data-mapa-embed]");
    if (mapa && N.direccion && !$("#ubicacion").hidden) {
      var busqueda = N.mapaBusqueda || [N.direccion, N.sector, N.ciudad, "Chile"].filter(Boolean).join(", ");
      var src = "https://www.google.com/maps?q=" + encodeURIComponent(busqueda) + "&output=embed";
      if (mapa.getAttribute("src") !== src) mapa.src = src;
    }
    var largo = $("[data-horario-largo]");
    if (largo) largo.innerHTML = horarioLargo();
  }

  /* Títulos y textos fijos de la página ("textos" en carta.js) */
  function valorEn(obj, ruta) {
    return ruta.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, obj);
  }
  function pintarTextos() {
    var T = C.textos || {};
    $$("[data-texto]").forEach(function (el) {
      var v = valorEn(T, el.getAttribute("data-texto"));
      if (typeof v === "string" && el.textContent !== v && document.activeElement !== el) el.textContent = v;
    });
  }

  var estadoOculto = false;
  function pintarEstado() {
    var el = $("[data-estado]");
    if (!el) return;
    el.hidden = estadoOculto || !!estado.sinHorario;
    el.className = "estado" + (estado.abierto ? " abierto" : "");
    el.innerHTML = '<span class="estado-punto" aria-hidden="true"></span><b>' + (estado.abierto ? "Abierto ahora" : "Cerrado ahora") + "</b>" +
      (estado.texto ? '<span class="estado-mas">' + esc(estado.texto) + "</span>" : "") +
      '<button type="button" data-ocultar-estado aria-label="Ocultar estado de apertura">×</button>';
  }

  /* ---------- botones para agregar ---------- */
  /* "dias": ["lunes"] en un producto: se pide solo esos días */
  function disponibleHoy(p) { return !(p.dias && p.dias.length) || p.dias.indexOf(DIAS[ahora().dia]) >= 0; }
  function botonAgregar(p, modo) {
    if (p.disponible === false) return '<span class="estado-pill">Agotado</span>';
    if (!disponibleHoy(p)) return '<span class="estado-pill">Solo los ' + esc(diasTexto(p.dias)) + "</span>";
    if (!estado.abierto) return '<span class="estado-pill">Cerrado</span>';
    var elegir = tieneOpciones(p);
    var texto = modo === "fila" ? (elegir ? "Elegir" : "") : (elegir ? (modo === "destacado" ? "Elegir" : "Elegir opción") : "Agregar");
    var aria = elegir ? "Elegir opción para " + p.nombre : "Agregar " + p.nombre + " al pedido";
    return '<button class="agregar" type="button" data-agregar="' + esc(p.id) + '" aria-label="' + esc(aria) + '">' +
      (texto ? "<span>" + texto + "</span>" : "") + '<span class="mas">' + icono("mas") + "</span></button>";
  }
  function precioLista(p) {
    var m = precioMinimo(p);
    if (!m.valor) return "";
    return (m.desde ? "<small>desde </small>" : "") + plata(m.valor);
  }

  /* ---------- portada: promos destacadas ---------- */
  var carrusel = { lista: [], i: 0, pausado: false, timer: null, ms: 6000, turno: 0 };
  // las fotos de las promos se bajan de antemano, para que al cambiar no quede el cuadro en negro
  var fotosPromo = {};
  var LOGO_PROMO = "img/logo-kaos.webp";   // promo sin foto: se muestra con el logo
  function fotoPromo(p) { return p.foto || LOGO_PROMO; }
  function precargarPromos() {
    carrusel.lista.forEach(function (p) {
      var f = fotoPromo(p);
      if (fotosPromo[f]) return;
      var im = new Image();
      im.src = f;
      fotosPromo[f] = im;
    });
  }
  function pintarDestacados() {
    var caja = $("[data-destacados]");
    if (!caja) return;
    carrusel.lista = Object.keys(PRODUCTOS).map(function (k) { return PRODUCTOS[k].p; })
      .filter(function (p) { return p.destacado && p.disponible !== false && disponibleHoy(p); });
    if (!carrusel.lista.length) { caja.hidden = true; return; }
    if (carrusel.i >= carrusel.lista.length) carrusel.i = 0;
    var p = carrusel.lista[carrusel.i];
    var varias = carrusel.lista.length > 1;
    caja.classList.toggle("pausado", carrusel.pausado);
    // la foto que se estaba viendo queda debajo hasta que la nueva termina de cargar
    var anterior = caja.querySelector(".destacado-foto img.actual");
    var antes = anterior && anterior.classList.contains("lista") ? anterior.getAttribute("src") : "";
    var misma = antes === fotoPromo(p);
    caja.innerHTML =
      '<div class="destacado" aria-roledescription="carrusel" aria-label="Promos destacadas">' +
        (varias ? '<div class="destacado-barras" style="--duracion:' + carrusel.ms + 'ms">' + carrusel.lista.map(function (q, i) {
          return '<button type="button" data-ir="' + i + '" aria-label="Ver promoción ' + (i + 1) + ": " + esc(q.nombre) + '" class="' +
            (i < carrusel.i ? "hecha" : i === carrusel.i ? "activa" : "") + '"><span><i></i></span></button>';
        }).join("") + "</div>" +
        '<button class="destacado-pausa" type="button" data-pausa aria-label="' + (carrusel.pausado ? "Reanudar" : "Pausar") + ' rotación de promociones">' + icono(carrusel.pausado ? "play" : "pausa") + "</button>" +
        '<button class="destacado-flecha anterior" type="button" data-carrusel="-1" aria-label="Promoción anterior">' + icono("izquierda") + "</button>" +
        '<button class="destacado-flecha siguiente" type="button" data-carrusel="1" aria-label="Promoción siguiente">' + icono("derecha") + "</button>" : "") +
        '<div class="destacado-foto' + (p.foto ? "" : " sin-foto") + '">' + (antes && !misma ? '<img class="previa" src="' + esc(antes) + '" alt="" width="1000" height="725">' : "") +
          '<img class="actual' + (misma ? " lista" : "") + '" src="' + esc(fotoPromo(p)) + '" alt="' + (p.foto ? "Foto de " + esc(p.nombre) : "") + '" width="1000" height="725"></div>' +
        '<div class="destacado-panel"' + marcaProducto(p) + ">" +
          '<span class="destacado-etiqueta">Promo destacada</span>' +
          '<h2 class="destacado-nombre">' + esc(p.nombre) + "</h2>" +
          '<span class="destacado-precio">' + plata(precioMinimo(p).valor) + "</span>" +
          botonAgregar(p, "destacado") +
        "</div>" +
      "</div>";
    medirPanelPromo();
    var foto = caja.querySelector(".destacado-foto img.actual"), marco = foto.parentNode;
    var mostrar = function () {
      requestAnimationFrame(function () { foto.classList.add("lista"); marco.classList.remove("esperando"); });
      precargarPromos();
    };
    if (misma) precargarPromos();
    else if (foto.complete && foto.naturalWidth) mostrar();
    else { marco.classList.add("esperando"); foto.addEventListener("load", mostrar); foto.addEventListener("error", mostrar); }
    programarCarrusel();
  }
  // las flechas van al medio de la parte de la foto que no tapa el recuadro blanco
  function medirPanelPromo() {
    var d = $(".destacado"), panel = d && d.querySelector(".destacado-panel");
    if (panel) d.style.setProperty("--alto-panel", panel.offsetHeight + 16 + "px");
  }
  window.addEventListener("resize", medirPanelPromo);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirPanelPromo);
  function programarCarrusel() {
    clearTimeout(carrusel.timer);
    var quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (carrusel.lista.length < 2 || carrusel.pausado || quieto) return;
    var turno = ++carrusel.turno;
    carrusel.timer = setTimeout(function () {
      // si la foto siguiente todavía no llega, espera a que cargue antes de pasar
      var sig = (carrusel.i + 1) % carrusel.lista.length, im = fotosPromo[fotoPromo(carrusel.lista[sig])];
      var pasar = function () {
        if (turno !== carrusel.turno || carrusel.pausado) return;
        carrusel.i = sig;
        pintarDestacados();
      };
      if (!im || im.complete) pasar();
      else { im.addEventListener("load", pasar, { once: true }); im.addEventListener("error", pasar, { once: true }); }
    }, carrusel.ms);
  }

  /* ---------- fotos de la carta ---------- */
  // las tarjetas usan la copia de 600 px que está en img/carta/600/ (herramientas/miniaturas.py)
  var CHICA = /^img\/carta\/([\w.-]+\.webp)$/;
  function fotoChica(src) { var m = CHICA.exec(src || ""); return m ? "img/carta/600/" + m[1] : ""; }
  // mientras baja, el marco muestra un brillo de carga y la foto aparece suave al llegar
  var fotoVista = {};
  function fotoLista(img) {
    img.classList.add("lista");
    if (img.currentSrc && /^(https?:|blob:)/i.test(img.currentSrc)) fotoVista[img.getAttribute("src")] = img.currentSrc;
  }
  function marcarFotos(raiz) {
    $$("img.carga:not(.lista)", raiz).forEach(function (img) { if (img.complete && img.naturalWidth) fotoLista(img); });
  }
  document.addEventListener("load", function (e) {
    if (e.target.matches && e.target.matches("img.carga")) fotoLista(e.target);
  }, true);
  document.addEventListener("error", function (e) {
    var img = e.target;
    if (!img.matches || !img.matches("img.carga")) return;
    // si falta la copia chica vuelve a la foto original; si tampoco está, queda el texto alternativo
    if (img.hasAttribute("srcset")) { img.removeAttribute("sizes"); img.removeAttribute("srcset"); }
    else img.classList.add("lista");
  }, true);

  /* ---------- carta ---------- */
  var vista = { seccion: 0, categoria: null, busqueda: "" };

  function pintarNavegacion() {
    var secs = $("[data-secciones]");
    var cats = $("[data-categorias]");
    secs.innerHTML = C.secciones.map(function (s, i) {
      return '<button class="pildora" type="button" data-seccion="' + i + '" aria-pressed="' + (!vista.busqueda && i === vista.seccion) + '">' + esc(s.nombre) + "</button>";
    }).join("");
    var sec = C.secciones[vista.seccion];
    cats.hidden = !!vista.busqueda || !sec || sec.categorias.length < 2;
    if (cats.hidden) { cats.innerHTML = ""; return; }
    cats.innerHTML = '<button class="pildora" type="button" data-categoria="" aria-pressed="' + !vista.categoria + '">Todas</button>' +
      sec.categorias.map(function (c) {
        return '<button class="pildora" type="button" data-categoria="' + esc(c.id) + '" aria-pressed="' + (vista.categoria === c.id) + '">' + esc(c.nombre) + "</button>";
      }).join("");
  }

  /* Total de piezas solo si todas las líneas son piezas o cortes (ej: "25 piezas frías"; no en un combo con hamburguesas) */
  function sumaPiezas(lineas) {
    var total = 0;
    for (var i = 0; i < lineas.length; i++) {
      var m = lineas[i].match(/^\s*(\d+)\s+(piezas?|cortes?)\b/i);
      if (!m) return 0;
      total += +m[1];
    }
    return total;
  }
  function detalleLista(p) {
    var lineas = String(p.detalle || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    if (lineas.length > 1) {
      var piezas = sumaPiezas(lineas);
      return '<button class="variedades" type="button" aria-expanded="false">Ver qué incluye' +
        (piezas ? " · <b>" + piezas + " piezas</b>" : "") + icono("abajo") + "</button>" +
        '<ul class="variedades-lista" hidden>' + lineas.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul>";
    }
    return lineas.length ? '<p class="fila-detalle"' + rutaDe(p, "detalle") + ">" + esc(lineas[0]) + "</p>" : "";
  }
  /* atributo con la ruta del texto, solo en el modo edición del panel */
  function ruta(r) { return EDITAR ? ' data-e="' + esc(r) + '"' : ""; }
  function rutaDe(p, campo) { return ruta(PRODUCTOS[p.id].ruta + "." + campo); }
  /* en el modo edición, tocar el producto abre su editor en el panel */
  function marcaProducto(p) { return EDITAR ? ' data-p="' + esc(p.id) + '"' : ""; }
  function notaProducto(p) { return p.nota ? '<p class="fila-incluye"' + rutaDe(p, "nota") + ">" + esc(p.nota) + "</p>" : ""; }
  function fila(p) {
    return '<li class="fila' + (p.disponible === false ? " fila--agotada" : "") + '"' + marcaProducto(p) + ">" +
      '<div class="fila-texto"><h4 class="fila-nombre"' + rutaDe(p, "nombre") + ">" + esc(p.nombre) + "</h4>" + detalleLista(p) + notaProducto(p) + "</div>" +
      '<div class="fila-lado"><span class="precio">' + precioLista(p) + "</span>" + botonAgregar(p, "fila") + "</div></li>";
  }
  function tarjeta(p) {
    var chica = fotoChica(p.foto);
    var foto = p.foto
      ? '<div class="tarjeta-foto"><img class="carga" src="' + esc(p.foto) + '"' +
        (chica ? ' srcset="' + esc(chica) + " 600w, " + esc(p.foto) + ' 1000w" sizes="(max-width: 380px) calc(100vw - 56px), (max-width: 640px) calc(50vw - 33px), 300px"' : "") +
        ' alt="Foto de ' + esc(p.nombre) + '" width="1000" height="725" loading="lazy"></div>'
      : '<div class="tarjeta-foto tarjeta-foto--vacia"><img src="img/logo-kaos.webp" alt="" width="600" height="600" loading="lazy"></div>';
    return '<li class="tarjeta' + (p.disponible === false ? " fila--agotada" : "") + '"' + marcaProducto(p) + ">" + foto +
      '<div class="tarjeta-cuerpo"><h4 class="fila-nombre"' + rutaDe(p, "nombre") + ">" + esc(p.nombre) + "</h4>" + detalleLista(p) + notaProducto(p) +
      '<div class="tarjeta-pie"><span class="precio">' + precioLista(p) + "</span>" + botonAgregar(p, "tarjeta") + "</div></div></li>";
  }
  function bloque(cat, productos, titulo) {
    // con "tarjetas": true la categoría va en tarjetas aunque falten las fotos (queda el espacio de la imagen)
    var conFotos = cat.tarjetas || productos.some(function (p) { return p.foto; });
    return '<section class="bloque" id="cat-' + esc(cat.id) + '" aria-label="' + esc(titulo || cat.nombre) + '">' +
      '<header class="bloque-cab"><h3' + ruta(RUTA_CAT[cat.id] + ".nombre") + ">" + esc(titulo || cat.nombre) + "</h3>" +
      (cat.nota ? "<p" + ruta(RUTA_CAT[cat.id] + ".nota") + ">" + esc(cat.nota) + "</p>" : "") + "</header>" +
      (conFotos ? '<ul class="tarjetas">' + productos.map(tarjeta).join("") + "</ul>" : '<ul class="filas">' + productos.map(fila).join("") + "</ul>") +
      "</section>";
  }
  function pintarLista() {
    var lista = $("[data-lista]");
    var html = "";
    if (vista.busqueda) {
      var palabras = sinTildes(vista.busqueda).split(/\s+/).filter(Boolean);
      var hay = 0;
      C.secciones.forEach(function (sec) {
        sec.categorias.forEach(function (cat) {
          var encontrados = cat.productos.filter(function (p) {
            var texto = sinTildes([p.nombre, p.detalle, p.incluye, p.nota, cat.nombre, sec.nombre, (p.opciones || []).join(" ")].join(" "));
            return palabras.every(function (w) { return texto.indexOf(w) >= 0; });
          });
          hay += encontrados.length;
          if (encontrados.length) html += bloque(cat, encontrados);
        });
      });
      if (!hay) {
        html = '<div class="bloque"><p class="bloque-vacio">No encontramos «' + esc(vista.busqueda) + '» en la carta. ' +
          '<a href="' + esc(wsp("Hola, ¿tienen " + vista.busqueda + "?")) + '" target="_blank" rel="noopener">Pregúntanos por WhatsApp</a>.</p></div>';
      }
    } else {
      var sec = C.secciones[vista.seccion];
      sec.categorias.forEach(function (cat) {
        if (vista.categoria && vista.categoria !== cat.id) return;
        if (cat.productos.length) html += bloque(cat, cat.productos);
      });
    }
    lista.innerHTML = html;
    marcarFotos(lista);
  }
  function pintarCarta() { pintarNavegacion(); pintarLista(); }
  /* al cambiar de sección, si ya se bajó, vuelve al mismo lugar que «Ver la carta»: las secciones justo bajo la cabecera */
  function subirALista() {
    var ancla = $("#pedir"), cab = $(".cabecera"), nav = $(".secciones");
    if (!ancla || !cab || !nav) return;
    var margen = parseFloat(getComputedStyle(nav).marginTop) || 0;
    var tope = ancla.getBoundingClientRect().top + window.scrollY + margen - cab.getBoundingClientRect().bottom;
    if (window.scrollY > tope + 1) window.scrollTo({ top: tope, behavior: "smooth" });
  }

  /* ---------- pedido ---------- */
  var pedido = { items: [], nombre: "", modo: "retiro", direccion: "", pago: "", cupon: "", sucursal: "", sector: "" };
  (function cargar() {
    var g = leer(GUARDADO);
    if (!g || typeof g !== "object") return;
    ["nombre", "direccion", "pago", "sucursal", "sector"].forEach(function (k) { if (typeof g[k] === "string") pedido[k] = k === "direccion" ? unaLinea(g[k]) : g[k]; });
    if (typeof g.cupon === "string") pedido.cupon = codigo(g.cupon);
    if (!SOLO_RETIRO && g.modo === "delivery") pedido.modo = "delivery";
    if (Array.isArray(g.items)) {
      pedido.items = g.items.filter(function (it) {
        return it && PRODUCTOS[it.id] && it.cant > 0 && it.conf && typeof it.conf === "object";
      }).map(function (it) {
        return { uid: String(it.uid || Math.random().toString(36).slice(2)), id: it.id, cant: Math.min(99, Math.floor(it.cant)), conf: limpiarConf(it.id, it.conf), nota: String(it.nota || "") };
      });
    }
  })();
  function guardarPedido() {
    guardar(GUARDADO, { items: pedido.items, nombre: pedido.nombre, modo: pedido.modo, direccion: pedido.direccion, pago: pedido.pago, cupon: pedido.cupon, sucursal: pedido.sucursal, sector: pedido.sector });
  }
  /* Descarta opciones que ya no existen en la carta (por si cambió desde la última visita). */
  function limpiarConf(id, conf) {
    var p = PRODUCTOS[id].p;
    var limpia = { cambios: [], elecciones: {}, textos: {} };
    if (conf.opcion && (p.opciones || []).indexOf(conf.opcion) >= 0) limpia.opcion = conf.opcion;
    var nRolls = rollsDe(id).length;
    var grupos = gruposDe(id).map(function (g) { return g.id; });
    (conf.cambios || []).forEach(function (c) {
      if (c && c.roll >= 0 && c.roll < nRolls && grupos.indexOf(c.grupo) >= 0 && opcionDe(c.grupo, c.opcion)) {
        limpia.cambios.push(c.en ? { roll: c.roll, grupo: c.grupo, opcion: c.opcion, en: c.en } : { roll: c.roll, grupo: c.grupo, opcion: c.opcion });
      }
    });
    Object.keys(conf.elecciones || {}).forEach(function (g) {
      if (grupos.indexOf(g) < 0 || !Array.isArray(conf.elecciones[g])) return;
      var ok = conf.elecciones[g].filter(function (o) { return opcionDe(g, o); });
      if (ok.length) limpia.elecciones[g] = ok;
    });
    Object.keys(conf.textos || {}).forEach(function (g) {
      if (grupos.indexOf(g) >= 0 && conf.textos[g]) limpia.textos[g] = String(conf.textos[g]).slice(0, 60);
    });
    var ga = gruposArmado(id);
    if (ga.length) {
      limpia.armado = rollsDe(id).map(function (r, i) {
        var orig = (conf.armado || [])[i] || {};
        var x = {};
        ga.forEach(function (g) {
          var o = opcionDe(g.id, orig[g.id]);
          if (o && o.disponible !== false) x[g.id] = o.id;
        });
        return x;
      });
    }
    return limpia;
  }
  function claveConf(conf) { return JSON.stringify([conf.opcion || "", conf.cambios || [], conf.elecciones || {}, conf.textos || {}, conf.armado || []]); }
  function cantidadTotal() { return pedido.items.reduce(function (s, it) { return s + it.cant; }, 0); }
  function subtotal() { return pedido.items.reduce(function (s, it) { return s + precioUnitario(it.id, it.conf) * it.cant; }, 0); }

  function agregarAlPedido(id, conf) {
    if (!disponibleHoy(PRODUCTOS[id].p)) return;
    var clave = claveConf(conf);
    var igual = pedido.items.filter(function (it) { return it.id === id && !it.nota && claveConf(it.conf) === clave; })[0];
    if (igual) igual.cant = Math.min(99, igual.cant + 1);
    else pedido.items.push({ uid: Math.random().toString(36).slice(2), id: id, cant: 1, conf: conf, nota: "" });
    guardarPedido();
    pintarContador(true);
    avisar("Agregado: <b>" + esc(PRODUCTOS[id].p.nombre) + "</b>");
    medir("agregar", { p: id, primera: primeraVez("agregar") });
  }
  function pintarContador(saltar) {
    var n = cantidadTotal();
    $$("[data-contador]").forEach(function (el) {
      el.textContent = n;
      if (saltar) { el.classList.remove("salta"); void el.offsetWidth; el.classList.add("salta"); }
    });
    $$(".boton-pedido").forEach(function (b) { b.setAttribute("aria-label", "Mi pedido, " + n + (n === 1 ? " producto" : " productos")); });
    var barra = $("[data-barra]");
    barra.hidden = n === 0;
    document.body.classList.toggle("con-barra", n > 0);
    $("[data-barra-total]").textContent = plata(subtotal() - descuento());
  }
  var avisoTimer;
  function avisar(html) {
    var el = $("[data-aviso]");
    el.innerHTML = html;
    el.classList.add("visible");
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { el.classList.remove("visible"); }, 2400);
  }

  /* ---------- ventanas ---------- */
  function abrir(dlg) {
    if (!dlg.open) {
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    }
    document.documentElement.classList.add("con-dialogo");
  }
  function cerrar(dlg) {
    if (dlg.open) { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
  }
  function alCerrar() {
    if (!$$("dialog").some(function (d) { return d.open; })) document.documentElement.classList.remove("con-dialogo");
  }
  $$("dialog").forEach(function (d) {
    d.addEventListener("close", alCerrar);
    // clic fuera de la caja: cierra
    d.addEventListener("click", function (e) { if (e.target === d) cerrar(d); });
  });

  /* ---------- ficha de producto ---------- */
  var ficha = null; // { id, conf, uid, roll, accion }
  var dlgFicha = $("[data-ficha]");
  var cuerpoFicha = $("[data-ficha-cuerpo]");

  function confInicial(id) {
    var p = PRODUCTOS[id].p;
    var conf = { cambios: [], elecciones: {}, textos: {} };
    if (tieneOpciones(p)) conf.opcion = p.opciones[0];
    gruposProducto(id).forEach(function (g) {
      if (g.tipo !== "elegir") return;
      var def = (g.opciones || []).filter(function (o) { return o.porDefecto && o.disponible !== false; }).map(function (o) { return o.id; });
      if (def.length) conf.elecciones[g.id] = def.slice(0, entero(g.max, 1, 1, 50));
    });
    var ga = gruposArmado(id);
    if (ga.length) {
      conf.armado = rollsDe(id).map(function () {
        var x = {};
        ga.forEach(function (g) {
          var def = (g.opciones || []).filter(function (o) { return o.porDefecto && o.disponible !== false; })[0];
          if (def) x[g.id] = def.id;
        });
        return x;
      });
    }
    return conf;
  }
  function abrirFicha(id, uid) {
    var item = uid && pedido.items.filter(function (it) { return it.uid === uid; })[0];
    if (!item) medir("ver", { p: id });
    ficha = { id: id, uid: item ? uid : null, roll: null, accion: null, conf: JSON.parse(JSON.stringify(item ? item.conf : confInicial(id))) };
    pintarFicha();
    abrir(dlgFicha);
    cuerpoFicha.scrollTop = 0;
  }
  function faltante() {
    var conf = ficha.conf;
    var grupos = gruposProducto(ficha.id);
    for (var i = 0; i < grupos.length; i++) {
      var g = grupos[i];
      var min = limites(g, conf).min;
      if (g.tipo === "texto") { if (min && !String((conf.textos || {})[g.id] || "").trim()) return { g: g }; continue; }
      if (((conf.elecciones || {})[g.id] || []).length < min) return { g: g };
    }
    var ga = gruposArmado(ficha.id);
    var rolls = rollsDe(ficha.id);
    for (var r = 0; r < rolls.length; r++) {
      for (var k = 0; k < ga.length; k++) {
        if ((ga[k].min || 0) > 0 && !((conf.armado || [])[r] || {})[ga[k].id]) return { g: ga[k], roll: r };
      }
    }
    return null;
  }
  function pintarPieFicha() {
    var b = $("[data-confirmar]");
    var falta = faltante();
    var total = precioUnitario(ficha.id, ficha.conf);
    b.setAttribute("aria-disabled", falta ? "true" : "false");
    if (falta) {
      b.innerHTML = (falta.g.tipo === "texto" ? "Escribe " : "Elige ") + esc(minus(falta.g.nombre)) +
        (falta.roll != null && rollsDe(ficha.id).length > 1 ? " del roll " + (falta.roll + 1) : "");
    }
    else b.innerHTML = (ficha.uid ? "Guardar cambios por" : "Agregar por") + " <b>" + plata(total) + "</b> " + icono("flecha");
  }
  function grupoHtml(g) {
    var conf = ficha.conf;
    if (g.tipo === "texto") {
      return '<label class="grupo"><span class="grupo-titulo">' + esc(g.nombre) + (g.min ? "" : " <small>Opcional</small>") + "</span>" +
        '<input class="texto-libre" type="text" maxlength="60" data-texto="' + esc(g.id) + '" value="' + esc((conf.textos || {})[g.id] || "") + '" placeholder="Escribe tu elección"></label>';
    }
    var sel = (conf.elecciones || {})[g.id] || [];
    var lim = limites(g, conf);
    var max = lim.max;
    var unica = g.tipo === "elegir" && max === 1;
    var ayuda = g.tipo === "extra" || !lim.min ? "Opcional" + (!unica && max > 1 && (g.opciones || []).length > max ? ", hasta " + max : "") : (lim.min === max ? "Elige " + max : "Elige de " + lim.min + " a " + max);
    return '<fieldset class="grupo"><legend>' + esc(g.nombre) + " <small>" + esc(ayuda) + "</small></legend>" +
      (g.opciones || []).map(function (o) {
        var marcado = sel.indexOf(o.id) >= 0;
        var bloqueado = o.disponible === false || (!unica && !marcado && sel.length >= max);
        return '<label class="eleccion' + (marcado ? " sel" : "") + (bloqueado ? " no" : "") + '">' +
          '<input type="' + (unica ? "radio" : "checkbox") + '" name="g-' + esc(g.id) + '" data-grupo="' + esc(g.id) + '" value="' + esc(o.id) + '"' +
          (marcado ? " checked" : "") + (bloqueado ? " disabled" : "") + ">" +
          '<span class="eleccion-nombre">' + esc(o.nombre) + (o.disponible === false ? " (agotado)" : "") + "</span>" +
          (o.precio ? '<span class="eleccion-precio">+' + plata(o.precio) + "</span>" : "") + "</label>";
      }).join("") + "</fieldset>";
  }
  /* Acciones posibles sobre un roll: agregar, reemplazar un ingrediente, cambiar envoltura o un extra (ej. sin nori). */
  function accionesRoll(i) {
    var roll = rollsDe(ficha.id)[i];
    var cambios = ficha.conf.cambios.filter(function (c) { return c.roll === i; });
    var acciones = [];
    gruposCambio(ficha.id).forEach(function (g) {
      if (g.tipo === "agregar") {
        var hechos = cambios.filter(function (c) { return c.grupo === g.id && !c.en; }).length;
        acciones.push({ id: "agregar:" + g.id, texto: "Agregar", lleno: g.max && hechos >= g.max });
        if ((g.opciones || []).some(function (o) { return o.reemplazo; })) {
          (roll.relleno || []).forEach(function (ing) {
            if (cambios.some(function (c) { return c.en === ing; })) return;
            acciones.push({ id: "en:" + g.id + ":" + ing, texto: "En vez de " + minus(ingrediente(ing)) });
          });
        }
      } else if (g.tipo === "envoltura") {
        acciones.push({ id: "envoltura:" + g.id, texto: "Cambiar envoltura" });
      } else if (g.tipo === "extra") {
        (g.opciones || []).forEach(function (o) {
          if (o.disponible === false || cambios.some(function (c) { return c.grupo === g.id && c.opcion === o.id; })) return;
          acciones.push({ id: "extra:" + g.id + ":" + o.id, texto: o.nombre, directo: true });
        });
      }
    });
    return acciones;
  }
  function opcionesAccion(i, accion) {
    var partes = accion.split(":");
    var g = GRUPOS[partes[1]];
    var roll = rollsDe(ficha.id)[i];
    var cambios = ficha.conf.cambios.filter(function (c) { return c.roll === i && c.grupo === g.id; });
    var ops = (g.opciones || []).filter(function (o) { return o.disponible !== false; });
    if (partes[0] === "agregar") {
      ops = ops.filter(function (o) { return !cambios.some(function (c) { return !c.en && c.opcion === o.id; }); });
      return { pregunta: "¿Qué le agregas?", ops: ops };
    }
    if (partes[0] === "en") {
      ops = ops.filter(function (o) { return o.reemplazo && o.ingrediente !== partes[2]; });
      return { pregunta: "¿Qué le pones en vez de " + minus(ingrediente(partes[2])) + "?", ops: ops };
    }
    ops = ops.filter(function (o) { return !o.ingrediente || o.ingrediente !== roll.envoltura; });
    return { pregunta: "¿Con qué lo envuelves?", ops: ops };
  }
  function rollHtml(roll, i, total, p) {
    var abierto = ficha.roll === i;
    var cambios = ficha.conf.cambios.map(function (c, k) { return { c: c, k: k }; }).filter(function (x) { return x.c.roll === i; });
    var texto = roll.texto || (total === 1 ? p.detalle || "" : "");
    var html = '<div class="roll' + (abierto ? " abierto" : "") + '">' +
      '<p class="roll-titulo"><b>' + (total > 1 ? esc(unidad(ficha.id)) + " " + (i + 1) : "Tu " + esc(minus(unidad(ficha.id)))) + "</b> " + esc(texto) + "</p>";
    var ga = gruposArmado(ficha.id);
    if (ga.length) {
      var elegido = (ficha.conf.armado || [])[i] || {};
      var cobros = detalleArmado(ficha.id, ficha.conf)[i] || {};
      html += '<div class="armado">' + ga.map(function (g) {
        var x = cobros[g.id];
        return '<label class="armado-campo"><span>' + esc(g.nombre) + "</span>" +
          '<select data-armado="' + i + '" data-grupo-roll="' + esc(g.id) + '"' + (elegido[g.id] ? "" : ' class="vacio"') + ">" +
          '<option value="">Elige…</option>' + (g.opciones || []).filter(function (o) { return o.disponible !== false; }).map(function (o) {
            return '<option value="' + esc(o.id) + '"' + (elegido[g.id] === o.id ? " selected" : "") + ">" + esc(o.nombre) + (o.precio ? " (+" + plata(o.precio) + ")" : "") + "</option>";
          }).join("") + "</select>" +
          (x && x.gratis ? '<small class="armado-gratis">Gratis</small>' : x && x.cobro ? "<small>+" + plata(x.cobro) + "</small>" : "") +
          "</label>";
      }).join("") + "</div>";
      var completo = ga.every(function (g) { return elegido[g.id]; });
      var faltan = (ficha.conf.armado || []).some(function (r, k) { return k !== i && ga.some(function (g) { return !(r || {})[g.id]; }); });
      if (total > 1 && completo && faltan) html += '<button class="copiar" type="button" data-copiar="' + i + '">Repetir ' + (unidad(ficha.id) === "Roll" ? "este roll" : "esta " + esc(minus(unidad(ficha.id)))) + ' en los que faltan</button>';
    }
    if (cambios.length) {
      html += '<ul class="roll-cambios">' + cambios.map(function (x) {
        return "<li><span>" + esc(textoCambio(x.c)) + '</span><button class="quitar" type="button" data-quitar-cambio="' + x.k + '" aria-label="Quitar: ' + esc(textoCambio(x.c)) + '">' + icono("x") + "</button></li>";
      }).join("") + "</ul>";
    }
    if (!abierto) {
      var acciones = accionesRoll(i);
      if (acciones.some(function (a) { return !a.lleno; })) html += '<button class="roll-boton" type="button" data-roll="' + i + '">+ Agregar o cambiar</button>';
      return html + "</div>";
    }
    var lista = accionesRoll(i);
    html += '<div class="editor"><p class="editor-pregunta">¿Qué quieres hacer?</p><div class="chips">' + lista.map(function (a) {
      return '<button class="chip" type="button" data-accion="' + esc(a.id) + '" aria-pressed="' + (ficha.accion === a.id) + '"' + (a.lleno ? " disabled" : "") + ">" + esc(a.texto) + "</button>";
    }).join("") + "</div>";
    if (ficha.accion && ficha.accion.indexOf("extra:") !== 0) {
      var o = opcionesAccion(i, ficha.accion);
      html += '<p class="editor-pregunta">' + esc(o.pregunta) + '</p><div class="chips">' + o.ops.map(function (op) {
        return '<button class="chip" type="button" data-elegir="' + esc(op.id) + '">' + esc(op.nombre) + (op.precio ? " · +" + plata(op.precio) : "") + "</button>";
      }).join("") + "</div>";
    }
    return html + '<button class="editor-cancelar" type="button" data-roll-cerrar>Cancelar</button></div></div>';
  }
  function pintarFicha() {
    var x = PRODUCTOS[ficha.id];
    var p = x.p;
    var rolls = rollsDe(ficha.id);
    var lineasEnRolls = rolls.length > 1 && rolls.every(function (r) { return r.texto; });
    var html = "";
    // de fondo, la foto que ya se vio en la tarjeta, mientras llega la grande
    if (p.foto) {
      var fondo = fotoVista[p.foto] ? ' style="background-image:url(&quot;' + esc(cadenaCss(fotoVista[p.foto])) + '&quot;)"' : "";
      html += '<div class="ficha-foto"' + fondo + '><img class="carga" src="' + esc(p.foto) + '" alt="Foto de ' + esc(p.nombre) + '" width="1000" height="725"></div>';
    }
    html += '<h2 class="ficha-titulo" id="ficha-titulo">' + esc(p.nombre) + "</h2>";
    if (p.detalle && !lineasEnRolls && !(rolls.length === 1 && !rolls[0].texto && gruposRoll(ficha.id).length)) {
      html += '<p class="ficha-detalle">' + esc(p.detalle) + "</p>";
    }
    if (p.nota) html += '<p class="ficha-nota">' + esc(p.nota) + "</p>";
    if (p.incluye) html += '<div class="incluye"><p class="incluye-titulo">Incluye</p><p>' + icono("check") + esc(p.incluye) + "</p></div>";
    if (tieneOpciones(p)) {
      html += '<fieldset class="grupo"><legend>Elige una opción</legend>' + p.opciones.map(function (o) {
        var marcado = ficha.conf.opcion === o;
        return '<label class="eleccion' + (marcado ? " sel" : "") + '"><input type="radio" name="opcion" data-opcion value="' + esc(o) + '"' + (marcado ? " checked" : "") + ">" +
          '<span class="eleccion-nombre">' + esc(o) + "</span>" +
          (p.preciosOpciones && p.preciosOpciones[o] != null ? '<span class="eleccion-precio">' + plata(p.preciosOpciones[o]) + "</span>" : "") + "</label>";
      }).join("") + "</fieldset>";
    }
    gruposProducto(ficha.id).forEach(function (g) { html += grupoHtml(g); });
    if (rolls.length) {
      var ga = gruposArmado(ficha.id);
      if (ga.length) {
        var ayudas = [x.cat.ayuda].concat(ga.map(function (g) { return g.ayuda; })).filter(Boolean);
        html += '<div class="rolls"><h3>' + (rolls.length > 1 ? "Arma tus " + rolls.length + " " + esc(minus(unidad(ficha.id))) + "s" : "Arma tu " + esc(minus(unidad(ficha.id)))) + "</h3>" +
          (ayudas.length ? '<p class="rolls-ayuda">' + ayudas.map(esc).join(" ") + "</p>" : "");
      } else {
        var tipos = gruposCambio(ficha.id).map(function (g) { return g.tipo; });
        var puede = [];
        if (tipos.indexOf("agregar") >= 0) puede.push("agregar o cambiar ingredientes");
        if (tipos.indexOf("envoltura") >= 0) puede.push("cambiar la envoltura");
        html += '<div class="rolls"><h3>¿Quieres cambiar algo?</h3><p class="rolls-ayuda">Opcional.' +
          (puede.length ? " " + (rolls.length > 1 ? "En cada roll puedes " : "Puedes ") + puede.join(" y ") + ";" : "") +
          " cada cambio se cobra a precio de carta.</p>";
      }
      html += rolls.map(function (r, i) { return rollHtml(r, i, rolls.length, p); }).join("") + "</div>";
    }
    // al volver a pintar, el foco queda en el mismo campo
    var activo = document.activeElement;
    var foco = activo && cuerpoFicha.contains(activo) && activo.getAttribute("data-armado") != null
      ? '[data-armado="' + activo.getAttribute("data-armado") + '"][data-grupo-roll="' + activo.getAttribute("data-grupo-roll") + '"]' : null;
    var scroll = cuerpoFicha.scrollTop;
    cuerpoFicha.innerHTML = html;
    marcarFotos(cuerpoFicha);
    cuerpoFicha.scrollTop = scroll;
    if (foco && $(foco, cuerpoFicha)) $(foco, cuerpoFicha).focus({ preventScroll: true });
    pintarPieFicha();
  }
  function confirmarFicha() {
    var falta = faltante();
    if (falta) {
      var campo = falta.roll != null
        ? $('[data-armado="' + falta.roll + '"][data-grupo-roll="' + falta.g.id + '"]', cuerpoFicha)
        : $('[data-grupo="' + falta.g.id + '"], [data-texto="' + falta.g.id + '"]', cuerpoFicha);
      if (campo) { campo.scrollIntoView({ block: "center", behavior: "smooth" }); campo.focus({ preventScroll: true }); }
      return;
    }
    var conf = limpiarConf(ficha.id, ficha.conf);
    if (ficha.uid) {
      pedido.items.forEach(function (it) { if (it.uid === ficha.uid) it.conf = conf; });
      guardarPedido();
      pintarContador(false);
      pintarPedido();
    } else {
      agregarAlPedido(ficha.id, conf);
    }
    cerrar(dlgFicha);
  }

  cuerpoFicha.addEventListener("change", function (e) {
    var t = e.target;
    if (!ficha) return;
    if (t.hasAttribute("data-opcion")) { ficha.conf.opcion = t.value; pintarFicha(); return; }
    if (t.hasAttribute("data-armado")) {
      var r = +t.getAttribute("data-armado");
      if (!ficha.conf.armado) ficha.conf.armado = [];
      var elegido = ficha.conf.armado[r] = ficha.conf.armado[r] || {};
      if (t.value) elegido[t.getAttribute("data-grupo-roll")] = t.value;
      else delete elegido[t.getAttribute("data-grupo-roll")];
      pintarFicha();
      return;
    }
    var gid = t.getAttribute("data-grupo");
    if (gid) {
      var g = GRUPOS[gid];
      var unica = g.tipo === "elegir" && limites(g, ficha.conf).max === 1;
      var sel = (ficha.conf.elecciones[gid] || []).slice();
      if (unica) sel = [t.value];
      else if (t.checked) { if (sel.indexOf(t.value) < 0) sel.push(t.value); }
      else sel = sel.filter(function (v) { return v !== t.value; });
      if (sel.length) ficha.conf.elecciones[gid] = sel; else delete ficha.conf.elecciones[gid];
      recortarElecciones(ficha.id, ficha.conf);
      pintarFicha();
    }
  });
  cuerpoFicha.addEventListener("input", function (e) {
    var gid = e.target.getAttribute("data-texto");
    if (!gid || !ficha) return;
    ficha.conf.textos[gid] = e.target.value;
    pintarPieFicha();
  });
  cuerpoFicha.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !ficha) return;
    if (b.hasAttribute("data-copiar")) {
      var base = ficha.conf.armado[+b.getAttribute("data-copiar")];
      ficha.conf.armado.forEach(function (r) {
        Object.keys(base).forEach(function (g) { if (!r[g]) r[g] = base[g]; });
      });
      pintarFicha();
    } else if (b.hasAttribute("data-roll")) {
      ficha.roll = +b.getAttribute("data-roll");
      var primera = accionesRoll(ficha.roll).filter(function (a) { return !a.lleno && !a.directo; })[0];
      ficha.accion = primera ? primera.id : null;
      pintarFicha();
    } else if (b.hasAttribute("data-roll-cerrar")) {
      ficha.roll = null; ficha.accion = null; pintarFicha();
    } else if (b.hasAttribute("data-accion")) {
      var accion = b.getAttribute("data-accion");
      if (accion.indexOf("extra:") === 0) {
        var pe = accion.split(":");
        ficha.conf.cambios.push({ roll: ficha.roll, grupo: pe[1], opcion: pe[2] });
        ficha.roll = null; ficha.accion = null;
      } else {
        ficha.accion = accion;
      }
      pintarFicha();
    } else if (b.hasAttribute("data-elegir")) {
      var partes = ficha.accion.split(":");
      var cambio = { roll: ficha.roll, grupo: partes[1], opcion: b.getAttribute("data-elegir") };
      if (partes[0] === "en") cambio.en = partes[2];
      if (partes[0] === "envoltura") {
        var r = ficha.roll;
        ficha.conf.cambios = ficha.conf.cambios.filter(function (c) { return !(c.roll === r && c.grupo === partes[1]); });
      }
      ficha.conf.cambios.push(cambio);
      ficha.roll = null; ficha.accion = null;
      pintarFicha();
    } else if (b.hasAttribute("data-quitar-cambio")) {
      ficha.conf.cambios.splice(+b.getAttribute("data-quitar-cambio"), 1);
      pintarFicha();
    }
  });
  $("[data-confirmar]").addEventListener("click", confirmarFicha);

  /* ---------- ventana del pedido ---------- */
  var dlgPedido = $("[data-pedido]");
  var cuerpoPedido = $("[data-pedido-cuerpo]");
  var piePedido = $("[data-pedido-pie]");
  var avisados = {};   // campos que el cliente intentó enviar vacíos: solo ahí sale el aviso en rojo

  function lineaHtml(it) {
    var x = PRODUCTOS[it.id];
    var unit = precioUnitario(it.id, it.conf);
    var detalle = detalleConf(it.id, it.conf);
    var editable = personalizable(it.id);
    var conCambios = !!(detalle.length || (it.conf.opcion && x.p.opciones.length > 1));
    return '<li class="linea" data-uid="' + esc(it.uid) + '">' +
      '<div class="linea-cab"><div><h3 class="linea-nombre">' + esc(nombreLinea(it.id)) + (it.conf.opcion ? " <small>· " + esc(it.conf.opcion) + "</small>" : "") + "</h3>" +
      '<p class="linea-unitario">' + plata(unit) + " c/u</p></div>" +
      '<span class="linea-total">' + plata(unit * it.cant) + "</span></div>" +
      (detalle.length ? '<ul class="linea-cambios">' + detalle.map(function (d) {
        return "<li><span>" + esc(d.texto) + "</span>" + (d.cambio != null ? '<button class="quitar" type="button" data-quitar-linea="' + d.cambio + '" aria-label="Quitar: ' + esc(d.texto) + '">' + icono("x") + "</button>" : "") + "</li>";
      }).join("") + "</ul>" : "") +
      (editable ? '<button class="linea-editar" type="button" data-editar>' + (conCambios ? "Editar" : "Personalizar") + "</button>" : "") +
      '<div class="linea-pie"><div class="cantidad">' +
        '<button type="button" data-menos aria-label="' + (it.cant === 1 ? "Quitar " : "Uno menos de ") + esc(x.p.nombre) + '">−</button>' +
        '<span aria-live="polite">' + it.cant + "</span>" +
        '<button type="button" data-mas aria-label="Uno más de ' + esc(x.p.nombre) + '">+</button></div>' +
        '<label class="campo"><span>¿Algo que debamos saber?</span>' +
        '<input type="text" data-nota maxlength="140" placeholder="Deja una nota (opcional)" value="' + esc(it.nota) + '"></label>' +
      "</div></li>";
  }
  var cuponMsg = "";
  function cuponHtml() {
    if (pedido.cupon) {
      var c = cuponActual();
      var e = evaluarCupon(c);
      return '<div class="cupon-pedido' + (e.ok ? " ok" : "") + '"><div><b>' + icono("cupon") + esc(pedido.cupon) + "</b>" +
        "<span>" + esc(e.ok ? nombreCupon(c) + ": −" + plata(e.descuento) : e.motivo) + "</span></div>" +
        '<button type="button" data-quitar-cupon aria-label="Quitar el cupón ' + esc(pedido.cupon) + '">Quitar</button></div>';
    }
    // siempre visible: un código que no exista (o esté pausado en el panel) simplemente no se aplica
    return '<div class="campo"><label class="campo-titulo" for="cupon-codigo">¿Tienes un cupón?</label><div class="cupon-fila">' +
      '<input type="text" id="cupon-codigo" data-cupon-codigo maxlength="30" autocapitalize="characters" autocomplete="off" spellcheck="false" enterkeyhint="done" placeholder="Escribe el código">' +
      '<button class="cupon-aplicar" type="button" data-aplicar-cupon>Aplicar</button></div>' +
      '<span class="campo-ayuda' + (cuponMsg ? " falta" : "") + '">' + esc(cuponMsg) + "</span></div>";
  }
  function aplicarCupon(cod) {
    var c = cuponDe(cod);
    if (!c || c.activo === false) return { ok: false, motivo: codigo(cod) ? "No encontramos ese cupón. Revisa que esté bien escrito." : "Escribe el código del cupón." };
    pedido.cupon = codigo(c.codigo);
    cuponMsg = "";
    guardarPedido();
    pintarContador(false);
    pintarCupones();
    return { ok: true, c: c };
  }
  function formularioHtml() {
    var html = '<div class="formulario">' +
      '<label class="campo"><span class="campo-titulo">Tu nombre, para el pedido</span>' +
      '<input type="text" data-campo="nombre" autocomplete="given-name" maxlength="60" placeholder="Ej: Ana" value="' + esc(pedido.nombre) + '">' +
      '<span class="campo-ayuda" data-ayuda="nombre"></span></label>';
    var ss = sucursales();
    if (ss.length > 1) {
      html += '<fieldset class="campo"><legend class="campo-titulo">¿A qué sucursal pides?</legend><div class="dos">' +
        ss.map(function (s) {
          var sel = pedido.sucursal === s.nombre;
          return '<label class="radio-tarjeta' + (sel ? " sel" : "") + '"><input type="radio" name="sucursal" value="' + esc(s.nombre) + '"' + (sel ? " checked" : "") + "> " + esc(s.nombre) + "</label>";
        }).join("") +
        '</div><span class="campo-ayuda" data-ayuda="sucursal"></span></fieldset>';
    }
    /* Con "soloRetiro" no se pregunta nada: todos los pedidos son para retirar en el local. */
    if (!SOLO_RETIRO) {
      html += '<fieldset class="campo"><legend class="campo-titulo">¿Retiras o te lo llevamos?</legend><div class="dos">' +
          '<label class="radio-tarjeta' + (pedido.modo === "retiro" ? " sel" : "") + '"><input type="radio" name="modo" value="retiro"' + (pedido.modo === "retiro" ? " checked" : "") + "> Retiro en el local</label>" +
          '<label class="radio-tarjeta' + (pedido.modo === "delivery" ? " sel" : "") + '"><input type="radio" name="modo" value="delivery"' + (pedido.modo === "delivery" ? " checked" : "") + "> Delivery" + (sectores().length ? " · desde " + plata(Math.min.apply(null, sectores().map(function (s) { return s.precio; }))) : "") + "</label>" +
        "</div></fieldset>";
    }
    var suc = sucursalElegida();
    if (pedido.modo === "retiro" && suc) {
      html += '<div class="retiro-info"><b>Retiras en la sucursal ' + esc(suc.nombre) + "</b>" +
        "<span>" + esc(suc.direccion ? suc.direccion + (N.ciudad ? ", " + N.ciudad : "") : "Te confirmamos la dirección y la hora de retiro por WhatsApp.") + "</span>" +
        (enlaceSeguro(suc.mapa) || suc.direccion ? '<a href="' + esc(enlaceSeguro(suc.mapa) || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([suc.direccion, N.ciudad, "Chile"].filter(Boolean).join(", "))) + '" target="_blank" rel="noopener">Ver cómo llegar</a>' : "") + "</div>";
    } else if (pedido.modo === "retiro") {
      html += '<div class="retiro-info">' + (N.direccion
        ? "<b>Retiras en " + esc(direccionCompleta()) + "</b>" + (CON_HORARIO ? "<span>" + esc(horarioCorto()) + (HORARIO_ACTIVO ? "" : " (por confirmar)") + "</span>" : "")
        : "<b>Retiro en el local</b><span>Te confirmamos la dirección y la hora de retiro por WhatsApp.</span>") +
        (enlaceSeguro(N.mapa) ? '<a href="' + esc(enlaceSeguro(N.mapa)) + '" target="_blank" rel="noopener">Ver cómo llegar</a>' : "") + "</div>";
      /* El local no reparte desde la página: si alguien quiere delivery, va por las apps. */
      var appsPedido = appsDelivery();
      if (appsPedido.length) {
        html += '<p class="apps-pedido"><span>¿Prefieres delivery? Pídenos por</span>' +
          appsPedido.map(botonApp).join("") + "</p>";
      }
    } else {
      var zonas = sectores();
      if (zonas.length) {
        html += '<fieldset class="campo"><legend class="campo-titulo">¿A qué sector?</legend><div class="sectores">' + zonas.map(function (s) {
          var sel = pedido.sector === s.nombre;
          return '<label class="radio-tarjeta radio-sector' + (sel ? " sel" : "") + '"><input type="radio" name="sector" value="' + esc(s.nombre) + '"' + (sel ? " checked" : "") + ">" +
            "<span><b>" + esc(s.nombre) + "</b>" + (s.detalle ? "<small>" + esc(s.detalle) + "</small>" : "") + "</span><em>" + plata(s.precio) + "</em></label>";
        }).join("") + '</div><span class="campo-ayuda" data-ayuda="sector"></span></fieldset>';
      }
      html += '<div class="campo"><label class="campo-titulo" for="direccion-entrega">Dirección de entrega</label>' +
        '<input type="text" id="direccion-entrega" data-campo="direccion" autocomplete="street-address" maxlength="160" placeholder="Ej: Vicuña Mackenna 150, depto 2" value="' + esc(pedido.direccion) + '">' +
        '<span class="campo-ayuda" data-ayuda="direccion"></span></div>';
    }
    html += pagoHtml();
    if (pedido.pago === "Transferencia" && N.datosTransferencia) html += '<p class="transferencia">' + esc(N.datosTransferencia) + "</p>";
    html += cuponHtml();   // el cupón va al final, debajo de cómo pagas
    return html + "</div>";
  }
  function faltaPedido() {
    var noHoy = pedido.items.filter(function (it) { return !disponibleHoy(PRODUCTOS[it.id].p); })[0];
    if (noHoy) return { campo: "items", texto: "«" + PRODUCTOS[noHoy.id].p.nombre + "» es solo los " + diasTexto(PRODUCTOS[noHoy.id].p.dias), ayuda: "" };
    if (!pedido.nombre.trim()) return { campo: "nombre", texto: "Falta tu nombre", ayuda: "Escribe tu nombre para poder enviar el pedido." };
    if (sucursales().length > 1 && !sucursalElegida()) return { campo: "sucursal", texto: "Elige tu sucursal", ayuda: "Elige la sucursal: el pedido llega a su WhatsApp." };
    if (pedido.modo === "delivery" && sectores().length && !sectorElegido()) return { campo: "sector", texto: "Elige tu sector", ayuda: "Elige el sector de tu dirección: así sabemos el valor del delivery." };
    if (pedido.modo === "delivery" && !pedido.direccion.trim()) return { campo: "direccion", texto: "Falta tu dirección de entrega", ayuda: "Escribe tu dirección para poder enviar el pedido." };
    if (!pedido.pago) return { campo: "pago", texto: "Elige cómo pagas", ayuda: "Elige cómo pagas para poder enviar el pedido." };
    return null;
  }
  function pintarAyudas() {
    var falta = faltaPedido();
    var normal = { nombre: "Así sabemos a nombre de quién dejarlo.", direccion: "", pago: "", sucursal: "", sector: "" };
    $$("[data-ayuda]", cuerpoPedido).forEach(function (el) {
      var campo = el.getAttribute("data-ayuda");
      var mal = falta && falta.campo === campo && avisados[campo];
      el.textContent = mal ? falta.ayuda : normal[campo];
      el.classList.toggle("falta", !!mal);
    });
  }
  function pintarPiePedido() {
    if (!pedido.items.length) { piePedido.innerHTML = ""; return; }
    var falta = faltaPedido();
    var sub = subtotal();
    var desc = descuento();
    var sector = sectorElegido();
    var despacho = costoDelivery();
    var html = '<div class="totales">';
    if (desc || sector) {
      html += "<div><span>Subtotal</span><span>" + plata(sub) + "</span></div>" +
        (desc ? '<div class="descuento"><span>Cupón ' + esc(pedido.cupon) + "</span><span>−" + plata(desc) + "</span></div>" : "") +
        (sector ? "<div><span>Delivery " + esc(sector.nombre) + "</span><span>" + plata(despacho) + "</span></div>" : "") +
        "<div><span>Total referencial</span><b>" + plata(sub - desc + despacho) + "</b></div>";
    } else {
      html += "<div><span>Subtotal referencial</span><b>" + plata(sub) + "</b></div>";
    }
    html += "</div>" +
      '<p class="pedido-aviso">Te confirmamos disponibilidad y total por WhatsApp.' + (estado.abierto ? "" : " Ahora estamos cerrados: te respondemos apenas abramos.") + "</p>";
    if (falta) html += '<button class="boton boton--grande" type="button" aria-disabled="true" data-falta="' + falta.campo + '">' + esc(falta.texto) + "</button>";
    else html += '<a class="boton boton--grande" href="' + esc(wsp(mensaje())) + '" target="_blank" rel="noopener" data-enviar>Enviar pedido por WhatsApp ' + icono("flecha") + "</a>";
    piePedido.innerHTML = html;
  }
  function pintarPedido() {
    var n = cantidadTotal();
    $("[data-pedido-cuenta]").textContent = n ? "(" + n + ")" : "";
    if (!pedido.items.length) {
      cuerpoPedido.innerHTML = '<div class="vacio"><b>Tu pedido está vacío.</b><span>Elige algo de la carta y aparecerá aquí.</span>' +
        '<a class="boton" href="#pedir" data-ir-carta>Ver la carta ' + icono("flecha") + "</a></div>";
      pintarPiePedido();
      return;
    }
    var scroll = cuerpoPedido.scrollTop;
    cuerpoPedido.innerHTML = '<ul class="lineas">' + pedido.items.map(lineaHtml).join("") + "</ul>" +
      '<button class="pedido-vaciar" type="button" data-vaciar>Vaciar pedido</button>' + formularioHtml();
    cuerpoPedido.scrollTop = scroll;
    pintarAyudas();
    pintarPiePedido();
  }
  function itemDe(el) {
    var li = el.closest("[data-uid]");
    var uid = li && li.getAttribute("data-uid");
    return pedido.items.filter(function (it) { return it.uid === uid; })[0];
  }
  function cambioPedido() { guardarPedido(); pintarContador(false); pintarPedido(); }

  cuerpoPedido.addEventListener("click", function (e) {
    var el = e.target.closest("button, a");
    if (!el) return;
    var it = itemDe(el);
    if (el.hasAttribute("data-mas") && it) { it.cant = Math.min(99, it.cant + 1); cambioPedido(); }
    else if (el.hasAttribute("data-menos") && it) {
      it.cant -= 1;
      if (it.cant < 1) pedido.items = pedido.items.filter(function (x) { return x !== it; });
      cambioPedido();
    } else if (el.hasAttribute("data-quitar-linea") && it) {
      it.conf.cambios.splice(+el.getAttribute("data-quitar-linea"), 1);
      cambioPedido();
    } else if (el.hasAttribute("data-editar") && it) {
      abrirFicha(it.id, it.uid);
    } else if (el.hasAttribute("data-vaciar")) {
      // se confirma con un segundo toque, sin ventanas del navegador
      if (el.getAttribute("data-vaciar") === "seguro") { pedido.items = []; cambioPedido(); return; }
      el.setAttribute("data-vaciar", "seguro");
      el.textContent = "Toca otra vez para vaciar el pedido";
      setTimeout(function () {
        if (el.isConnected) { el.setAttribute("data-vaciar", ""); el.textContent = "Vaciar pedido"; }
      }, 4000);
    } else if (el.hasAttribute("data-ir-carta")) {
      cerrar(dlgPedido);
    } else if (el.hasAttribute("data-aplicar-cupon")) {
      var r = aplicarCupon($("[data-cupon-codigo]", cuerpoPedido).value);
      if (!r.ok) cuponMsg = r.motivo;
      pintarPedido();
      if (!r.ok) $("[data-cupon-codigo]", cuerpoPedido).focus();
    } else if (el.hasAttribute("data-quitar-cupon")) {
      pedido.cupon = "";
      cambioPedido();
      pintarCupones();
    }
  });
  cuerpoPedido.addEventListener("input", function (e) {
    var t = e.target;
    if (t.hasAttribute("data-nota")) {
      var it = itemDe(t);
      if (it) it.nota = t.value;
    } else if (t.getAttribute("data-campo")) {
      pedido[t.getAttribute("data-campo")] = t.value;
      pintarAyudas();
    } else return;
    guardarPedido();
    pintarPiePedido();
  });
  cuerpoPedido.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "modo") { pedido.modo = t.value; if (pedido.pago && pagosDisponibles().indexOf(pedido.pago) < 0) pedido.pago = ""; cambioPedido(); }
    else if (t.name === "sucursal") { pedido.sucursal = t.value; cambioPedido(); pintarDatos(); }
    else if (t.name === "pago") { pedido.pago = t.value; cambioPedido(); }
    else if (t.name === "sector") { pedido.sector = t.value; cambioPedido(); }
  });
  cuerpoPedido.addEventListener("keydown", function (e) {
    var t = e.target;
    if (e.key !== "Enter") return;
    if (!t.hasAttribute("data-cupon-codigo")) return;
    e.preventDefault();
    $("[data-aplicar-cupon]", cuerpoPedido).click();
  });
  piePedido.addEventListener("click", function (e) {
    var b = e.target.closest("[data-falta]");
    if (!b) return;
    var campo = b.getAttribute("data-falta");
    avisados[campo] = true;
    pintarAyudas();
    var input = campo === "items" ? $(".lineas", cuerpoPedido)
      : $(campo === "pago" || campo === "sucursal" || campo === "sector" ? 'input[name="' + campo + '"]' : '[data-campo="' + campo + '"]', cuerpoPedido);
    if (input) { input.scrollIntoView({ block: "center", behavior: "smooth" }); input.focus({ preventScroll: true }); }
  });

  /* formas de pago */
  function pagosDisponibles() {
    var l = pedido.modo === "delivery" ? N.pagosDelivery : N.pagosRetiro;
    return l && l.length ? l : N.pagos && N.pagos.length ? N.pagos : ["Efectivo", "Transferencia"];
  }
  function pagoHtml() {
    if (pedido.pago && pagosDisponibles().indexOf(pedido.pago) < 0) pedido.pago = "";
    return '<fieldset class="campo"><legend class="campo-titulo">¿Cómo pagas?</legend><div class="dos">' +
      pagosDisponibles().map(function (m) {
        var sel = pedido.pago === m;
        return '<label class="radio-tarjeta' + (sel ? " sel" : "") + '"><input type="radio" name="pago" value="' + esc(m) + '"' + (sel ? " checked" : "") + "> " + esc(m) + "</label>";
      }).join("") +
      '</div><span class="campo-ayuda" data-ayuda="pago"></span></fieldset>';
  }

  /* delivery por sectores ("sectoresDelivery" en carta.js): el cliente elige el suyo y su valor se suma */
  function sectores() { return (N.sectoresDelivery || []).filter(function (s) { return s && s.nombre && typeof s.precio === "number"; }); }
  function sectorElegido() {
    if (pedido.modo !== "delivery") return null;
    return sectores().filter(function (s) { return s.nombre === pedido.sector; })[0] || null;
  }
  function costoDelivery() { var s = sectorElegido(); return s ? s.precio : 0; }

  /* ---------- mensaje de WhatsApp ---------- */
  function mensaje() {
    var l = [];
    l.push("Hola, quiero hacer un pedido:");
    l.push("Nombre: " + pedido.nombre.trim());
    var suc = sucursalElegida();
    if (suc) l.push("Sucursal: " + suc.nombre);
    if (pedido.modo === "retiro" && suc) {
      l.push("Modalidad: Retiro en la sucursal" + (suc.direccion ? " (" + suc.direccion + ")" : ""));
    } else if (pedido.modo === "retiro") {
      l.push("Modalidad: Retiro en el local" + (N.direccion ? " (" + direccionCompleta() + ")" : ""));
    } else {
      l.push("Modalidad: Delivery");
      if (sectorElegido()) l.push("Sector: " + sectorElegido().nombre);
      l.push("Dirección: " + unaLinea(pedido.direccion));
    }
    if (pedido.pago) l.push("Pago: " + pedido.pago + (pedido.modo === "delivery" ? " al recibir" : " al retirar"));
    l.push("");
    pedido.items.forEach(function (it, i) {
      var p = PRODUCTOS[it.id].p;
      var unit = precioUnitario(it.id, it.conf);
      l.push((i + 1) + ") " + it.cant + " × " + nombreLinea(it.id) + " — " + plata(unit * it.cant));
      if (it.cant > 1) l.push("   Precio unitario: " + plata(unit));
      if (it.conf.opcion) l.push("   Opción: " + it.conf.opcion);
      if (p.incluye) l.push("   Incluye: " + p.incluye);
      var rolls = rollsDe(it.id);
      if (rolls.length > 1 && it.conf.cambios.length) {
        rolls.forEach(function (r, k) { if (r.texto) l.push("   Roll " + (k + 1) + ": " + r.texto); });
      }
      detalleConf(it.id, it.conf).forEach(function (d) {
        if (d.cambio == null) l.push("   " + d.texto);
        else if (d.armado) l.push("   " + d.texto);
        else l.push("   Cambio" + (d.roll ? " en roll " + d.roll : "") + ": " + d.solo);
      });
      if (it.nota.trim()) l.push("   Nota: " + it.nota.trim());
    });
    l.push("");
    var sub = subtotal();
    var desc = descuento();
    var despacho = costoDelivery();
    if (desc || despacho) {
      l.push("Subtotal: " + plata(sub));
      if (desc) l.push("Cupón " + pedido.cupon + " (" + nombreCupon(cuponActual()) + "): −" + plata(desc));
      if (despacho) l.push("Delivery " + sectorElegido().nombre + ": " + plata(despacho));
      l.push("Total referencial: " + plata(sub - desc + despacho));
    } else {
      l.push("Subtotal referencial: " + plata(sub));
    }
    l.push("¿Me confirman disponibilidad, precio vigente y total?");
    return l.join("\n");
  }

  /* ---------- eventos generales ---------- */
  // clics a WhatsApp: el botón «Enviar pedido» cuenta como pedido enviado (con su total referencial)
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me/"]');
    if (!a) return;
    if (a.hasAttribute("data-enviar")) medir("enviar", { n: subtotal() - descuento() + costoDelivery() });
    else medir("wsp");
  }, true);
  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, a");
    if (!t) return;
    if (t.hasAttribute("data-agregar")) {
      var id = t.getAttribute("data-agregar");
      if (!PRODUCTOS[id]) return;
      if (personalizable(id)) abrirFicha(id, null);
      else agregarAlPedido(id, { cambios: [], elecciones: {}, textos: {} });
    } else if (t.hasAttribute("data-abrir-pedido")) {
      medir("abrir");
      cuponMsg = "";
      avisados = {};
      pintarPedido();
      abrir(dlgPedido);
    } else if (t.hasAttribute("data-cerrar")) {
      cerrar(t.closest("dialog"));
    } else if (t.hasAttribute("data-seccion")) {
      vista.seccion = +t.getAttribute("data-seccion");
      vista.categoria = null;
      if (vista.busqueda) { vista.busqueda = ""; $("[data-buscar]").value = ""; }
      pintarCarta();
      subirALista();
    } else if (t.hasAttribute("data-ir-seccion")) {
      vista.seccion = +t.getAttribute("data-ir-seccion");
      vista.categoria = null;
      pintarCarta();
    } else if (t.hasAttribute("data-categoria")) {
      vista.categoria = t.getAttribute("data-categoria") || null;
      pintarCarta();
      subirALista();
    } else if (t.classList.contains("variedades")) {
      var abierta = t.getAttribute("aria-expanded") === "true";
      t.setAttribute("aria-expanded", String(!abierta));
      t.nextElementSibling.hidden = abierta;
      var fila = t.closest(".fila");
      if (fila) fila.classList.toggle("abierta", !abierta);
    } else if (t.hasAttribute("data-usar-cupon")) {
      var r = aplicarCupon(t.getAttribute("data-usar-cupon"));
      if (r.ok) {
        var e = evaluarCupon(r.c);
        avisar("Cupón <b>" + esc(pedido.cupon) + "</b> " + (!pedido.items.length ? "listo: se descuenta en tu pedido."
          : e.ok ? "aplicado: −" + plata(e.descuento) + "." : "guardado. " + esc(e.motivo)));
      }
    } else if (t.hasAttribute("data-ocultar-estado")) {
      estadoOculto = true;
      pintarEstado();
    } else if (t.hasAttribute("data-pausa")) {
      carrusel.pausado = !carrusel.pausado;
      pintarDestacados();
    } else if (t.hasAttribute("data-ir")) {
      carrusel.i = +t.getAttribute("data-ir");
      pintarDestacados();
    } else if (t.hasAttribute("data-carrusel")) {
      var paso = t.getAttribute("data-carrusel"), total = carrusel.lista.length;
      carrusel.i = (carrusel.i + +paso + total) % total;
      pintarDestacados();
      // el botón se vuelve a dibujar: queda enfocado para seguir con el teclado
      var mismo = $('[data-carrusel="' + paso + '"]');
      if (mismo) mismo.focus({ preventScroll: true });
    }
  });

  var buscarTimer;
  $("[data-buscar]").addEventListener("input", function (e) {
    clearTimeout(buscarTimer);
    var valor = e.target.value;
    buscarTimer = setTimeout(function () {
      vista.busqueda = valor.trim();
      pintarCarta();
    }, 150);
  });

  // sombra bajo la barra de secciones cuando queda pegada arriba
  var nav = $(".secciones");
  function revisarNav() {
    var alto = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--alto-cabecera")) || 84;
    nav.classList.toggle("pegada", nav.getBoundingClientRect().top <= alto + 1);
  }
  window.addEventListener("scroll", revisarNav, { passive: true });

  // revisa cada minuto si el local abrió o cerró
  setInterval(function () {
    var nuevo = estadoLocal();
    if (nuevo.abierto !== estado.abierto || nuevo.texto !== estado.texto) {
      var cambioApertura = nuevo.abierto !== estado.abierto;
      estado = nuevo;
      pintarEstado();
      if (cambioApertura) { pintarDestacados(); pintarLista(); if (dlgPedido.open) pintarPiePedido(); }
    }
  }, 60000);

  /* ---------- sección "arma tu roll": opciones a la vista ---------- */
  function pintarArmado() {
    var caja = $("[data-armado-info]");
    if (!caja) return;
    var encontrado = null;
    C.secciones.forEach(function (sec, si) {
      sec.categorias.forEach(function (cat) {
        if (encontrado) return;
        var ga = (cat.personalizar || []).map(function (g) { return GRUPOS[g]; })
          .filter(function (g) { return g && g.porRoll && g.tipo === "elegir"; });
        if (ga.length) encontrado = { si: si, cat: cat, ga: ga };
      });
    });
    var seccion = caja.closest("section");
    seccion.hidden = !encontrado;
    $$('a[href="#arma"]').forEach(function (a) { a.hidden = !encontrado; });
    if (!encontrado) return;
    $("[data-armado-ayuda]").textContent = encontrado.cat.ayuda || "";
    $("[data-armado-ir]").setAttribute("data-ir-seccion", encontrado.si);
    caja.innerHTML = encontrado.ga.map(function (g) {
      return '<div class="arma-grupo"><h3>' + esc(g.nombre + (/[aeiouáéíóú]$/i.test(g.nombre) ? "s" : "es")) + "</h3>" +
        "<ul>" + (g.opciones || []).filter(function (o) { return o.disponible !== false; }).map(function (o) {
          return "<li>" + esc(o.nombre) + (o.precio ? " <small>" + (o.gratis ? "1ª gratis, luego +" : "+") + plata(o.precio) + "</small>" : "") + "</li>";
        }).join("") + "</ul>" + (g.ayuda ? '<p class="arma-promo">' + esc(g.ayuda) + "</p>" : "") + "</div>";
    }).join("");
  }

  /* ---------- sección de cupones ---------- */
  function pintarCupones() {
    var caja = $("[data-cupones]");
    if (!caja) return;
    var hoy = ahora().fecha;
    var lista = (C.cupones || []).map(function (c, i) { return { c: c, i: i }; }).filter(function (x) {
      return x.c && x.c.codigo && x.c.activo !== false && x.c.visible !== false && !(x.c.hasta && x.c.hasta < hoy);
    });
    caja.closest("section").hidden = !lista.length;
    $$('a[href="#cupones"]').forEach(function (a) { a.hidden = !lista.length; });
    caja.innerHTML = lista.map(function (x) {
      var c = x.c;
      var cod = codigo(c.codigo);
      var cond = condicionesCupon(c);
      var usado = pedido.cupon === cod;
      return '<li class="cupon' + (usado ? " usado" : "") + '">' +
        '<div class="cupon-valor"><b' + (valorCupon(c).length > 5 ? ' class="largo"' : "") + ">" + esc(valorCupon(c)) + "</b><span>de descuento</span></div>" +
        '<div class="cupon-cuerpo"><h3' + ruta("cupones." + x.i + ".nombre") + ">" + esc(nombreCupon(c)) + "</h3>" +
        (cond.length ? '<p class="cupon-cond">' + esc(cond.join(" · ")) + "</p>" : "") +
        '<div class="cupon-pie"><span class="cupon-codigo">' + esc(cod) + "</span>" +
        (usado ? '<span class="cupon-listo">' + icono("check") + "En tu pedido</span>"
          : '<button class="cupon-usar" type="button" data-usar-cupon="' + esc(cod) + '">Usar cupón</button>') +
        "</div></div></li>";
    }).join("");
  }

  /* ---------- inicio ---------- */
  function pintarTodo() {
    pintarDatos();
    pintarTextos();
    pintarArmado();
    pintarCupones();
    pintarEstado();
    pintarDestacados();
    pintarCarta();
    pintarContador(false);
  }
  if (EDITAR) carrusel.pausado = true;
  pintarTodo();
  revisarNav();

  /* Lo que usa el asistente (js/asistente.js): la carta con su stock y horario, y el pedido. */
  medir("visita");
  window.paginaCarta = {
    previa: PREVIA,
    medir: medir,
    datos: function () { return C; },
    producto: function (id) { return PRODUCTOS[id] || null; },
    productos: function () { return Object.keys(PRODUCTOS).map(function (id) { return PRODUCTOS[id]; }); },
    estado: function () { return estadoLocal(); },
    horario: horarioCorto,
    disponibleHoy: disponibleHoy,
    diasTexto: diasTexto,
    boton: function (p) { return botonAgregar(p, "destacado"); },
    precio: precioLista,
    foto: function (p) { return p.foto ? (fotoChica(p.foto) || p.foto) : ""; },
    plata: plata,
    sinTildes: sinTildes,
    pedido: function () {
      return pedido.items.map(function (it) { return it.cant + " × " + nombreLinea(it.id); }).join(", ");
    },
    lineasPedido: function () {
      return pedido.items.map(function (it) { return { cant: it.cant, nombre: nombreLinea(it.id), precio: precioUnitario(it.id, it.conf) * it.cant }; });
    },
    cantidad: cantidadTotal,
    total: function () { return subtotal() - descuento(); }
  };
  document.dispatchEvent(new Event("pagina-lista"));

  /* ---------- vista previa y edición desde el panel (/admin) ---------- */
  if (!PREVIA) return;
  var alPanel = function (msg) { window.parent.postMessage(msg, location.origin); };
  // [zona, partes del panel que abre su botón, texto del botón, otras partes del panel que muestran esta zona]
  // el diseño y los textos de la página no se editan desde el panel: solo la carta, el stock, las promos y los datos del local
  var ZONAS = [["#inicio", "promos", "Editar promos"], ["#carta", "carta", "Editar carta y precios", "stock"],
    ["#cupones", "cupones", "Editar cupones"], ["#arma", "armado", "Editar opciones para elegir"],
    ["#ubicacion", "negocio horario", "Editar dirección y horario"], [".pie", "negocio", "Editar datos del local"]];
  function marcarEditables() {
    document.documentElement.classList.toggle("editando", editando);
    $$(".editar-chip").forEach(function (c) { c.hidden = !editando; });
    if (!editando) return;
    ZONAS.forEach(function (z) {
      var zona = $(z[0]);
      if (!zona || zona.querySelector(":scope > .editar-chip")) return;
      zona.setAttribute("data-grupo", z[1] + (z[3] ? " " + z[3] : ""));
      var b = document.createElement("button");
      b.type = "button";
      b.className = "editar-chip";
      b.setAttribute("data-abrir-grupos", z[1]);
      b.innerHTML = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/></svg>' + z[2];
      zona.appendChild(b);
    });
  }
  if (EDITAR) {
    // en edición los botones no piden ni abren enlaces: los de cada producto abren su editor en el panel
    document.addEventListener("click", function (e) {
      if (!editando) return;
      var chip = e.target.closest("[data-abrir-grupos]");
      var agregar = e.target.closest("[data-agregar]");
      if (e.target.closest("[data-usar-cupon]")) {
        e.preventDefault(); e.stopPropagation();
        alPanel({ type: "pagina-abrir", grupos: ["cupones"] });
        return;
      }
      if (chip || agregar) {
        e.preventDefault(); e.stopPropagation();
        alPanel(chip ? { type: "pagina-abrir", grupos: chip.getAttribute("data-abrir-grupos").split(" ") }
          : { type: "pagina-abrir", grupos: ["carta"], producto: agregar.getAttribute("data-agregar") });
        return;
      }
      var prod = e.target.closest("[data-p]");
      if (prod && !e.target.closest(".variedades")) {
        e.preventDefault(); e.stopPropagation();
        alPanel({ type: "pagina-abrir", grupos: ["carta"], producto: prod.getAttribute("data-p") });
        return;
      }
      if (e.target.closest("a, [data-abrir-pedido]")) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }
  window.addEventListener("message", function (e) {
    if (e.origin !== location.origin || !e.data) return;
    var d = e.data;
    if (d.type === "pagina-vista" && d.carta && typeof d.carta === "object") {
      usarCarta(d.carta);
      estado = estadoLocal();
      pedido.items = pedido.items.filter(function (it) { return PRODUCTOS[it.id]; });
      if (vista.seccion >= C.secciones.length) { vista.seccion = 0; vista.categoria = null; }
      pintarTodo();
      if (EDITAR) marcarEditables();
    }
    if (d.type === "pagina-modo") { editando = !!d.editar; marcarEditables(); }
    if (d.type === "pagina-ir" && /^[a-z]+$/.test(d.grupo)) {
      var zona = $('[data-grupo~="' + d.grupo + '"]');
      if (zona) zona.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  if (EDITAR) marcarEditables();
  alPanel({ type: "pagina-lista" });

})();
