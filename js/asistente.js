/* Asistente de la página: el chat de abajo a la derecha.
   Con la IA configurada (ANTHROPIC_API_KEY en las variables del proyecto, ver functions/api/asistente.js) responde con IA usando la carta.
   Sin ella, o abriendo index.html directo, responde solo con la carta: horario, ubicación, pagos,
   recomendaciones y búsqueda de productos. */
(function () {
  "use strict";

  var P = window.paginaCarta;
  if (!P || P.previa) return;   // en el panel (/admin) no aparece
  var C = P.datos();
  var N = C.negocio || {};
  var GUARDADO = "asistente-v1";
  var API = "/api/asistente";
  var modoIA = location.protocol !== "file:";
  var mensajes = [];   // { role, content, productos }
  var ocupado = false;

  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var t = P.sinTildes;
  function leer(k) { try { return JSON.parse(sessionStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function guardar(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  function numeroWsp() {
    var s = (N.sucursales || []).filter(function (x) { return x && x.whatsapp; })[0];
    return (s && s.whatsapp) || N.whatsapp || "";
  }
  function enlaceWsp(texto) { return "https://wa.me/" + numeroWsp() + (texto ? "?text=" + encodeURIComponent(texto) : ""); }
  function nombreCorto() { return String(N.nombre || "el local"); }

  var SVG = {
    chat: '<path d="M4.5 18.5V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H9l-4.5 3.5Z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/>',
    cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
    enviar: '<path d="M4 12 20 4l-6 16-3-7-7-1Z"/>',
    wsp: '<path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6Z"/><path d="M9.2 8.6c.3 2.7 2.4 5 5.2 5.6l1.2-1.3-1.8-1-1 .7c-.9-.5-1.7-1.3-2.2-2.2l.7-1-1-1.8Z"/>',
    menu: '<path d="M5 7h14M5 12h14M5 17h14"/>',
    bolsa: '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  function icono(n) { return '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true">' + SVG[n] + "</svg>"; }

  /* Botones de respuesta rápida. Con "a" hacen una acción del chat; con "q" mandan esa pregunta
     y se responden con la carta (sin gastar IA). */
  var OP = {
    pedir: { t: "🧭 Ayúdame a pedir", a: "pedir" },
    carta: { t: "📖 Ver la carta", a: "carta" },
    top: { t: "🔥 Lo más pedido", q: "Recomiéndame algo" },
    arma: { t: "🥪 Arma lo tuyo", q: "Arma tu sándwich" },
    ingredientes: { t: "🥢 Ingredientes", q: "¿Qué ingredientes hay?" },
    papas: { t: "🍟 Papas fritas", q: "papas fritas" },
    barato: { t: "💸 Algo económico", q: "Algo barato" },
    entrantes: { t: "🥟 Para picar", q: "Para picar" },
    bebidas: { t: "🥤 Bebidas", q: "bebidas" },
    salsas: { t: "🥫 Salsas extra", q: "salsas" },
    pedido: { t: "🛍️ Mi pedido", a: "pedido" },
    delivery: { t: "🛵 Delivery", q: "¿Cuánto cuesta el delivery?" },
    horario: { t: "🕒 Horario", q: "¿A qué hora abren?" },
    pagos: { t: "💳 Formas de pago", q: "¿Cómo puedo pagar?" },
    ubicacion: { t: "📍 Ubicación", q: "¿Dónde están?" },
    cupones: { t: "🎟️ Cupones", q: "¿Tienen cupones?" },
    como: { t: "❓ ¿Cómo pido?", q: "¿Cómo hago un pedido?" },
    modificar: { t: "✏️ Cambiar ingredientes", q: "¿Puedo cambiar ingredientes?" },
    demora: { t: "⏱️ ¿Cuánto demora?", q: "¿Cuánto demora el pedido?" },
    humano: { t: "💬 Hablar con alguien", q: "Quiero hablar con alguien" },
    menu: { t: "☰ Más opciones", a: "menu" },
    reiniciar: { t: "🔄 Empezar de nuevo", a: "reiniciar" }
  };
  var INICIO = [OP.pedir, OP.top, OP.carta, OP.ubicacion, OP.horario, OP.menu];
  var MENU = [OP.pedir, OP.carta, OP.top, OP.arma, OP.papas, OP.barato, OP.entrantes, OP.bebidas, OP.pedido,
    OP.horario, OP.pagos, OP.ubicacion, OP.cupones, OP.como, OP.demora, OP.humano, OP.reiniciar];

  /* ---------- la ventana ---------- */
  var raiz = document.createElement("div");
  raiz.className = "asis";
  raiz.innerHTML =
    '<button class="asis-boton" type="button" data-asis-abrir aria-expanded="false" aria-controls="asis-panel">' +
      '<img src="img/logo-kaos.webp" width="600" height="600" alt="">' +
      '<span class="asis-boton-txt">¿Te ayudo?</span>' +
      '<span class="asis-boton-ico">' + icono("chat") + "</span>" +
    "</button>" +
    '<section class="asis-panel" id="asis-panel" role="dialog" aria-label="Asistente de ' + esc(nombreCorto()) + '" hidden>' +
      '<header class="asis-cab">' +
        '<img src="img/logo-kaos.webp" width="600" height="600" alt="">' +
        '<div class="asis-cab-txt"><b>' + esc(nombreCorto()) + '</b><small data-asis-estado></small></div>' +
        '<button class="asis-x" type="button" data-asis-cerrar aria-label="Cerrar asistente">' + icono("cerrar") + "</button>" +
      "</header>" +
      '<div class="asis-cuerpo" data-asis-cuerpo aria-live="polite"></div>' +
      '<form class="asis-form" data-asis-form>' +
        '<button class="asis-menu" type="button" data-asis-op="a:menu" aria-label="Ver todas las opciones">' + icono("menu") + "</button>" +
        '<label class="oculto" for="asis-texto">Escribe tu pregunta</label>' +
        '<input id="asis-texto" data-asis-texto type="text" maxlength="500" autocomplete="off" enterkeyhint="send" placeholder="Pregúntame lo que quieras…">' +
        '<button type="submit" aria-label="Enviar">' + icono("enviar") + "</button>" +
      "</form>" +
      '<p class="asis-nota">Respuestas automáticas. Tu pedido lo confirma el local por WhatsApp.</p>' +
    "</section>";
  document.body.appendChild(raiz);

  var panel = $(".asis-panel", raiz);
  var cuerpo = $("[data-asis-cuerpo]", raiz);
  var entrada = $("[data-asis-texto]", raiz);

  function pintarEstado() {
    var e = P.estado();
    $("[data-asis-estado]", raiz).innerHTML = e.sinHorario ? "Asistente virtual" :
      '<i class="asis-punto' + (e.abierto ? " asis-punto--on" : "") + '"></i>Asistente virtual · ' + (e.abierto ? "Abierto ahora" : "Cerrado ahora");
  }

  function abrirChat() {
    pintarEstado();
    panel.hidden = false;
    raiz.classList.add("asis--abierto");
    $(".asis-boton", raiz).setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("con-asistente");
    if (P.medir) P.medir("asistente");
    if (!mensajes.length) bienvenida();
    pintar();
    if (window.matchMedia("(min-width: 641px)").matches) entrada.focus();
  }
  function cerrarChat() {
    panel.hidden = true;
    raiz.classList.remove("asis--abierto");
    $(".asis-boton", raiz).setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("con-asistente");
  }

  function bienvenida() {
    var e = P.estado();
    var txt = "¡Hola! Soy el asistente de **" + nombreCorto() + "** 🍔\nTe ayudo a elegir, te cuento precios y horario, y te paso los productos para que los agregues a tu pedido.";
    if (!e.sinHorario && !e.abierto) txt += "\n\nAhora estamos cerrados" + (e.texto ? ": " + e.texto.charAt(0).toLowerCase() + e.texto.slice(1) : "") + ". Igual puedes mirar la carta.";
    txt += "\n\n¿Qué se te antoja hoy? Elige una opción o escríbeme 👇";
    mensajes.push({ role: "assistant", content: txt, inicio: true, opciones: INICIO });
  }

  /* ---------- pintar la conversación ---------- */
  function formato(s) {
    /* Los enlaces con texto se guardan aparte: si no, el autoenlace de las direcciones sueltas
       volvería a entrar dentro del href que se acaba de armar. */
    var guardados = [];
    var h = esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (_, t, u) {
        return "\u0000" + (guardados.push('<a href="' + u + '" target="_blank" rel="noopener">' + t + "</a>") - 1) + "\u0000";
      })
      .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\u0000(\d+)\u0000/g, function (_, i) { return guardados[+i]; });
    return h.split(/\n/).map(function (l) {
      return /^\s*[-•*]\s+/.test(l) ? '<span class="asis-item">' + l.replace(/^\s*[-•*]\s+/, "") + "</span>" : l;
    }).join("<br>").replace(/<br>(<span class="asis-item">)/g, "$1").replace(/(<\/span>)<br>/g, "$1");
  }
  function tarjeta(id) {
    var x = P.producto(id);
    if (!x) return "";
    var p = x.p;
    var foto = P.foto(p);
    return '<div class="asis-prod">' +
      (foto ? '<img src="' + esc(foto) + '" alt="" loading="lazy">' : '<img class="asis-prod-logo" src="img/logo-kaos.webp" alt="">') +
      '<div class="asis-prod-txt"><b>' + esc(p.nombre) + "</b><span>" + P.precio(p) + "</span></div>" +
      P.boton(p) + "</div>";
  }
  function botonOp(o) {
    return '<button type="button" data-asis-op="' + esc(o.a ? "a:" + o.a : o.q ? "q:" + o.q : "t:" + o.t) + '">' + esc(o.t) + "</button>";
  }
  function extrasMsg(m) {
    var h = "";
    if (m.pedido) {
      h += '<button class="asis-cta" type="button" data-abrir-pedido>' + icono("bolsa") + "Ver mi pedido y enviarlo</button>";
    }
    if (m.ir != null && C.secciones[m.ir]) {
      h += '<button class="asis-cta asis-cta--claro" type="button" data-seccion="' + m.ir + '" data-asis-ir>Ver ' + esc(C.secciones[m.ir].nombre.toLowerCase()) + " en la carta" + icono("flecha") + "</button>";
    }
    if (m.wsp) {
      h += '<a class="asis-wsp" href="' + esc(enlaceWsp(m.wsp === true ? "" : m.wsp)) + '" target="_blank" rel="noopener">' + icono("wsp") + "Escribir al WhatsApp</a>";
    }
    return h;
  }
  function pintar() {
    var ultimo = -1;
    mensajes.forEach(function (m, i) { if (m.role === "assistant") ultimo = i; });
    if (ultimo !== mensajes.length - 1) ultimo = -1;   // las opciones solo van bajo la última respuesta
    cuerpo.innerHTML = mensajes.map(function (m, i) {
      var prods = (m.productos || []).map(tarjeta).join("");
      var ops = i === ultimo && !ocupado ? opcionesDe(m) : [];
      return '<div class="asis-msg asis-msg--' + (m.role === "user" ? "yo" : "bot") + '">' +
        '<div class="asis-burbuja">' + formato(m.content) + "</div>" +
        (prods ? '<div class="asis-prods">' + prods + "</div>" : "") +
        extrasMsg(m) +
        (ops.length ? '<div class="asis-ops">' + ops.map(botonOp).join("") + "</div>" : "") +
        "</div>";
    }).join("") + (ocupado ? '<div class="asis-msg asis-msg--bot"><div class="asis-burbuja asis-escribiendo"><i></i><i></i><i></i></div></div>' : "");
    // una respuesta más alta que el chat se muestra desde su comienzo
    var ult = cuerpo.lastElementChild;
    cuerpo.scrollTop = ult && ult.offsetHeight > cuerpo.clientHeight - 20 ? ult.offsetTop - cuerpo.offsetTop - 12 : cuerpo.scrollHeight;
    guardar(GUARDADO, mensajes);
  }
  // si la respuesta no trae opciones, se ofrecen las de siempre (y «Mi pedido» si ya hay algo)
  function opcionesDe(m) {
    var ops = (m.opciones || []).slice();
    if (!ops.length) {
      ops = P.cantidad() ? [OP.pedido, OP.pedir, OP.carta] : [OP.pedir, OP.top, OP.carta];
    }
    if (ops.indexOf(OP.reiniciar) < 0 && !ops.some(function (o) { return o.a === "menu"; })) ops.push(OP.menu);
    return ops;
  }

  /* ---------- preguntar ---------- */
  function enviar(texto, accion) {
    texto = String(texto || "").trim();
    if (!texto || ocupado) return;
    mensajes.push({ role: "user", content: texto.slice(0, 500) });
    ocupado = true;
    pintar();
    (accion ? esperar(responderAccion(accion)) : responder(texto)).then(function (r) {
      ocupado = false;
      if (r.reiniciar) { mensajes = []; bienvenida(); pintar(); return; }
      mensajes.push({ role: "assistant", content: r.texto, productos: r.productos || [], wsp: r.wsp, opciones: r.opciones, pedido: r.pedido, ir: r.ir });
      if (mensajes.length > 40) mensajes = mensajes.slice(-40);
      pintar();
    });
  }
  // a: acción del chat · q: pregunta que se responde con la carta · t: texto libre (va a la IA si está)
  function usarOp(valor, etiqueta) {
    var tipo = valor.slice(0, 2), v = valor.slice(2);
    if (tipo === "a:") enviar(etiqueta.replace(/^[^\wÀ-ÿ¿¡$]+/, ""), v);
    else if (tipo === "q:") enviar(v, "q:" + v);
    else enviar(v);
  }

  function responder(texto) {
    if (!modoIA) return esperar(responderLocal(texto));
    var historia = mensajes.filter(function (m) { return !m.inicio; }).slice(-12).map(function (m) {
      return { role: m.role, content: m.content + (m.productos && m.productos.length ? " " + m.productos.map(function (id) { return "[[" + id + "]]"; }).join(" ") : "") };
    });
    var control = window.AbortController ? new AbortController() : null;
    var reloj = setTimeout(function () { if (control) control.abort(); }, 25000);
    return fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensajes: historia, pedido: P.pedido() }),
      signal: control ? control.signal : undefined
    }).then(function (res) {
      clearTimeout(reloj);
      return res.json().catch(function () { return {}; }).then(function (d) {
        if (res.ok && d.texto) return { texto: d.texto, productos: d.productos, opciones: (d.opciones || []).map(function (x) { return { t: x }; }) };
        if (res.status === 429) return { texto: "Uf, son muchas preguntas seguidas 😅 Espera un ratito o escríbenos directo por WhatsApp.", wsp: true };
        // sin IA configurada (o sin servidor): de aquí en adelante responde con la carta
        if (res.status === 503 || res.status === 404 || res.status === 405) modoIA = false;
        return responderLocal(texto);
      });
    }).catch(function () {
      clearTimeout(reloj);
      return responderLocal(texto);
    });
  }
  function esperar(r) { return new Promise(function (ok) { setTimeout(function () { ok(r); }, 380); }); }

  /* ---------- respuestas con la carta (sin IA) ---------- */
  function disponibles(lista) {
    return lista.filter(function (x) { return x.p.disponible !== false && P.disponibleHoy(x.p); });
  }
  function esExtra(x) { return /extra|salsa|bebest|bebida/.test(t(x.sec.nombre + " " + x.cat.nombre)); }
  function textoEstado() {
    var e = P.estado();
    if (e.sinHorario) return "";
    return (e.abierto ? "Ahora estamos **abiertos**" : "Ahora estamos **cerrados**") + (e.texto ? " (" + e.texto.charAt(0).toLowerCase() + e.texto.slice(1) + ")" : "") + ".";
  }
  function avisoCerrado() {
    var e = P.estado();
    return !e.sinHorario && !e.abierto ? "\n\nOjo: ahora estamos cerrados" + (e.texto ? "; " + e.texto.charAt(0).toLowerCase() + e.texto.slice(1) : "") + "." : "";
  }
  function listaY(a) { return a.length > 1 ? a.slice(0, -1).join(", ") + " y " + a[a.length - 1] : a.join(""); }

  var VACIAS = ["que", "de", "la", "el", "los", "las", "un", "una", "unos", "y", "o", "con", "sin", "para", "por", "me", "mi", "tienen", "tiene", "hay",
    "quiero", "algo", "cual", "cuales", "como", "cuanto", "cuesta", "vale", "precio", "es", "son", "al", "del", "en", "lo", "le", "se", "si", "no", "favor",
    "hola", "porfa", "pf", "dame", "ver", "busco", "rico", "rica", "ustedes", "venden", "puedo", "pedir", "ese", "esa", "este", "esta", "mas"];
  function buscar(q) {
    /* Los números cuentan («combo 6»), aunque sean de una cifra. */
    var palabras = t(q).replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/)
      .filter(function (w) { return w && VACIAS.indexOf(w) < 0 && (w.length > 2 || /^\d+$/.test(w)); })
      .map(function (w) { return /^\d+$/.test(w) ? w : w.replace(/(es|s)$/, "").slice(0, 7); })
      .filter(function (w) { return w.length > 2 || /^\d+$/.test(w); });
    if (!palabras.length) return [];
    return disponibles(P.productos()).map(function (x) {
      var nombre = t(x.p.nombre + " " + x.cat.nombre);
      var resto = t((x.p.detalle || "") + " " + (x.p.opciones || []).join(" ") + " " + (x.p.nota || ""));
      var puntos = 0;
      palabras.forEach(function (w) { if (nombre.indexOf(w) >= 0) puntos += 3; else if (resto.indexOf(w) >= 0) puntos += 1; });
      return { x: x, puntos: puntos };
    }).filter(function (r) { return r.puntos > 0; })
      .sort(function (a, b) { return b.puntos - a.puntos; })
      .map(function (r) { return r.x; });
  }
  function ids(lista, n) { return lista.slice(0, n || 4).map(function (x) { return x.p.id; }); }

  /* ---------- acciones de los botones ---------- */
  function seccion(re) {
    for (var i = 0; i < C.secciones.length; i++) if (re.test(t(C.secciones[i].nombre))) return i;
    return -1;
  }
  function deSeccion(i) { return disponibles(P.productos()).filter(function (x) { return x.sec === C.secciones[i]; }); }
  function opSeccion(re, etiqueta) { var i = seccion(re); return i < 0 ? null : { t: etiqueta, a: "sec:" + i }; }
  function sinNulos(a) { return a.filter(Boolean); }
  var GUSTOS = { pollo: "🍗 Pollo", carne: "🥩 Carne", completo: "🌭 Completos", papas: "🍟 Papas fritas", todo: "🤷 De todo un poco" };
  /* Qué productos pesca cada gusto, buscando en el nombre, el detalle y la categoría. */
  var PALABRAS = {
    pollo: /pollo|\bave\b|nugget/,
    carne: /carne|churrasco|mechada|lomito|\blomo\b|hamburguesa|chorrillana|barros luco/,
    completo: /completo|italiano|hot dog|vienesa|\bas\b|pleto/,
    papas: /papa|salchipapa/,
    todo: /./
  };

  /* Recomienda según cuántos son y qué les gusta: para grupos parte por lo que rinde (combos y chorrillanas). */
  function recomendarPara(n, gusto) {
    var re = PALABRAS[gusto] || PALABRAS.todo;
    var lista = disponibles(P.productos()).filter(function (x) {
      return !esExtra(x) && re.test(t(x.p.nombre + " " + (x.p.detalle || "") + " " + x.cat.nombre));
    });
    if (n > 2) {
      var rinde = lista.filter(function (x) { return /combo|chorrillana/.test(t(x.sec.nombre + " " + x.p.nombre)); });
      lista = rinde.concat(lista.filter(function (x) { return rinde.indexOf(x) < 0; }));
    }
    return lista;
  }

  function responderAccion(a) {
    var partes = a.split(":");
    var todos = disponibles(P.productos());
    switch (partes[0]) {
      case "q":
        return responderLocal(a.slice(2));
      case "menu":
        return { texto: "Esto es todo lo que puedo hacer por ti 👇 Elige una opción o escríbeme lo que necesites.", opciones: MENU };
      case "reiniciar":
        return { reiniciar: true };
      case "carta":
        return { texto: "La carta tiene estas secciones. ¿Cuál quieres ver?",
          opciones: C.secciones.map(function (sec, i) { return deSeccion(i).length ? { t: sec.nombre, a: "sec:" + i } : null; }).filter(Boolean).concat([OP.pedir]) };
      case "sec":
        var i = +partes[1], sec = C.secciones[i];
        if (!sec) return responderAccion("carta");
        var lista = deSeccion(i);
        var cats = (sec.categorias || []).filter(function (c) { return c.nota; }).map(function (c) { return c.nota; });
        return { texto: "**" + sec.nombre + "**" + (lista.length > 6 ? " (te muestro 6 de " + lista.length + ")" : "") + ":" + (cats.length ? "\n" + cats[0] : "") + avisoCerrado(),
          productos: ids(lista, 6), ir: lista.length > 6 ? i : null,
          opciones: sinNulos([OP.carta, i === seccion(/picar/) ? opSeccion(/bebida/, "🥤 Bebidas") : opSeccion(/picar/, "🥟 Para picar"), OP.pedido]) };
      case "pedir":
        return { texto: "¡Vamos! Te ayudo a armar tu pedido en 3 pasos 🍔\n\n**1.** ¿Para cuántas personas es?",
          opciones: [{ t: "🙋 Solo para mí", a: "n:1" }, { t: "👫 2 personas", a: "n:2" }, { t: "👨‍👩‍👧 3 o 4", a: "n:4" }, { t: "👨‍👩‍👧‍👦 5 o 6", a: "n:6" }, { t: "🎉 7 o más", a: "n:8" }] };
      case "n":
        var n = +partes[1];
        return { texto: "**2.** ¿Qué es lo que más les gusta?",
          opciones: Object.keys(GUSTOS).map(function (g) { return { t: GUSTOS[g], a: "g:" + n + ":" + g }; }) };
      case "g":
        var cuantos = +partes[1], gusto = partes[2];
        var recs = recomendarPara(cuantos, gusto);
        var txt = cuantos <= 1 ? "Para ti solo, con " + GUSTOS[gusto].replace(/^\S+\s/, "").toLowerCase() + ", te recomiendo:" :
          "Para " + (cuantos >= 8 ? "7 o más" : cuantos === 4 ? "3 o 4" : cuantos === 6 ? "5 o 6" : cuantos) + " personas te recomiendo:";
        if (cuantos >= 8) txt += "\n\nPara grupos grandes conviene una chorrillana para compartir y sumar papas.";
        txt += avisoCerrado() + "\n\n**3.** Toca **Agregar** en lo que te guste. Después puedes sumar algo más o ver tu pedido para enviarlo.";
        return { texto: txt, productos: ids(recs, 3),
          opciones: sinNulos([opSeccion(/picar/, "🥟 Sumar para picar"), opSeccion(/bebida/, "🥤 Bebidas"), OP.pedido, { t: "🔁 Ver otras opciones", a: "pedir" }]) };
      case "pedido":
        var lineas = P.lineasPedido();
        if (!lineas.length) {
          return { texto: "Tu pedido está vacío por ahora 🛍️ ¿Te ayudo a elegir?", opciones: [OP.pedir, OP.top, OP.carta] };
        }
        return { texto: "Esto llevas en tu pedido:\n" + lineas.map(function (l) { return "- " + l.cant + " × " + l.nombre + " — " + P.plata(l.precio); }).join("\n") +
          "\n\nTotal: **" + P.plata(P.total()) + "** (sin delivery). Abre tu pedido y envíalo por WhatsApp.",
          pedido: true, opciones: sinNulos([opSeccion(/picar/, "🥟 Sumar para picar"), opSeccion(/bebida/, "🥤 Bebidas"), OP.pedir]) };
    }
    return responderLocal(a);
  }

  function deCategoria(re) { return disponibles(P.productos()).filter(function (x) { return re.test(t(x.cat.id + " " + x.cat.nombre)); }); }

  function responderLocal(texto) {
    var q = t(texto);
    var todos = disponibles(P.productos());
    var iArma = seccion(/arma/), iEntr = seccion(/entrant/);

    var personas = /(\d+)\s*(personas?|pers|pax|amig|adult|de nosotros)/.exec(q) || /somos\s*(\d+)/.exec(q) || /para\s*(\d+)\b/.exec(q);
    if (personas) {
      var n = Math.max(1, Math.min(30, +personas[1]));
      var recomendadas = recomendarPara(n, "todo");
      if (recomendadas.length) {
        return { texto: "Para " + n + (n === 1 ? " persona" : " personas") + " te recomiendo:" +
          (n > 3 ? "\n\nPara grupos conviene una chorrillana para compartir y sumar papas." : "") + avisoCerrado(),
          productos: ids(recomendadas, 3),
          opciones: sinNulos([opSeccion(/picar/, "🥟 Sumar para picar"), OP.bebidas, OP.pedido]) };
      }
    }
    if (/mi pedido|que llevo|cuanto llevo|carrito|mi carro|cuanto va|cuanto es el total|ver pedido/.test(q)) return responderAccion("pedido");
    if (/^(la )?(carta|menu)$|ver (la )?(carta|menu)|que (tienen|venden|hay)( para comer)?\??$|secciones/.test(q)) return responderAccion("carta");
    if (/ayuda(me)? a (pedir|elegir)|no se que pedir|arma(me)? (un|el|mi) pedido|quiero pedir|hacer un pedido$/.test(q)) return responderAccion("pedir");
    if (/^(menu|opciones|ayuda)\s*\??$|^que (mas )?puedes hacer|^que sabes/.test(q)) return responderAccion("menu");
    if (/horari|abre|abiert|cierra|atiend|hora |a que hora|que hora|abren|domingo|feriado/.test(q + " ")) {
      var h = P.horario();
      return { texto: [textoEstado(), h ? "Nuestro horario es: " + h.replace(/ · /g, "\n- ").replace(/^/, "\n- ") : "Escríbenos por WhatsApp para confirmar el horario."].filter(Boolean).join("\n"),
        opciones: [OP.ubicacion, OP.horario, OP.pedir] };
    }
    if (/demora|tarda|cuanto (se )?(demor|tard)|tiempo de (entrega|espera)|minutos|cuando llega|rapido/.test(q)) {
      return { texto: "El tiempo depende de cuántos pedidos haya y de tu sector ⏱️ El local te lo confirma por WhatsApp al responder tu pedido. Si estás apurado, pregunta antes de pedir:",
        wsp: "Hola, ¿cuánto se están demorando los pedidos ahora?", opciones: [OP.ubicacion, OP.pedir] };
    }
    if (/deliver|despach|envio|enviar a|reparto|domicilio|llevan|a casa|sector/.test(q)) {
      var s = N.sectoresDelivery || [];
      if (s.length) {
        return { texto: "Sí, hacemos delivery 🛵 El valor depende del sector:\n" + s.map(function (x) {
          return "- **" + x.nombre + "**: " + P.plata(x.precio) + (x.detalle ? " (" + x.detalle + ")" : "");
        }).join("\n") + "\n\nEliges tu sector al enviar el pedido. También puedes retirar gratis en " + (N.direccion || "el local") + ".",
          opciones: [OP.demora, OP.pagos, OP.pedir] };
      }
      if (N.soloRetiro === true) {
        var apps = (N.appsDelivery || []).filter(function (x) { return x && x.nombre && /^https:\/\//i.test(String(x.url || "")); });
        return { texto: "Por aquí los pedidos son para **retirar en el local** 🛍️ Te esperamos en " + (N.direccion || "el local") +
            (N.ciudad ? ", " + N.ciudad : "") + "." +
            (apps.length
              ? "\n\nSi lo quieres a domicilio 🛵 pídenos por " + listaY(apps.map(function (x) { return "[" + x.nombre + "](" + x.url + ")"; })) + "."
              : "\n\nSi repartimos a domicilio por alguna app, pregúntanos por WhatsApp."),
          opciones: [OP.ubicacion, OP.horario, OP.pedir] };
      }
      return { texto: "Consulta el delivery por WhatsApp y te contamos al tiro.", wsp: true };
    }
    if (/pag|transfer|efectivo|tarjeta|debito|credito|edenred|junaeb|cuenta rut/.test(q)) {
      var pr = N.pagosRetiro || [], pd = N.pagosDelivery || [];
      if (pr.length || pd.length) {
        return { texto: (pr.join() === pd.join() ? "Puedes pagar con " + listaY(pr) + ", al retirar o al recibir." :
          [pr.length ? "Al retirar: " + listaY(pr) + "." : "", pd.length ? "Con delivery, al recibir: " + listaY(pd) + "." : ""].filter(Boolean).join("\n")) +
          "\nNo hay pago online: lo eliges al enviar tu pedido por WhatsApp.", opciones: [OP.como, OP.ubicacion, OP.pedir] };
      }
    }
    if (/boleta|factura/.test(q)) {
      return { texto: "Para boleta o factura, pídelo en la nota de tu pedido o escríbenos por WhatsApp y te ayudamos 🧾", wsp: true };
    }
    if (/donde|direcc|ubica|ubicad|retir|local |mapa|como llego/.test(q + " ") && N.direccion) {
      return { texto: "Estamos en **" + [N.direccion, N.ciudad].filter(Boolean).join(", ") + "** 📍\nPuedes retirar ahí tu pedido." + (N.mapa ? "\nMapa: " + N.mapa : ""),
        opciones: [OP.horario, OP.ubicacion, OP.pedir] };
    }
    if (/reserv|mesa|comer (ahi|alla|en el local)|salon|para servir/.test(q)) {
      return { texto: "Eso mejor consúltalo directo con el local por WhatsApp 🙌 Desde aquí puedes armar tu pedido para retirar.", wsp: true, opciones: [OP.ubicacion, OP.pedir] };
    }
    if (/cupon|descuento|codigo|promocion/.test(q) && !/promo(s)? del/.test(q)) {
      var cup = (C.cupones || []).filter(function (c) { return c && c.activo !== false && c.visible !== false; });
      if (cup.length) return { texto: "Tenemos estos cupones:\n" + cup.map(function (c) { return "- **" + c.codigo + "**: " + (c.nombre || (c.tipo === "monto" ? P.plata(c.valor) : c.valor + "%") + " de descuento"); }).join("\n") + "\nLo aplicas en «Mi pedido».", opciones: [OP.pedido, OP.pedir] };
      return { texto: "Por ahora no tenemos cupones activos, pero mira nuestras promos destacadas 😉", productos: ids(todos.filter(function (x) { return x.p.destacado; }), 3) };
    }
    if (/humano|persona real|hablar con|alguien|telefono|numero|llamar|whatsapp|wsp|wasap|reclamo|problema|cancelar|anular|trabaj|empleo/.test(q) && !/como (pido|compro)/.test(q)) {
      return { texto: "¡Claro! Escríbenos directo por WhatsApp" + (N.whatsappVisible ? " al **" + N.whatsappVisible + "**" : "") + " y te atiende alguien del local 🙌", wsp: true };
    }
    if (/como (pido|compro|hago|funciona)|hacer (un|el) pedido|pedido por/.test(q)) {
      return { texto: "Es fácil:\n- Toca **Agregar** en lo que quieras (aquí mismo o en la carta).\n- Abre **Mi pedido** y elige cómo pagas.\n- Toca **Enviar pedido por WhatsApp** y el local te confirma el total.",
        opciones: [OP.pedir, OP.pagos, OP.ubicacion] };
    }
    if (/modific|cambiar|cambio|sacar|quitar|sin (palta|queso|tomate|cebolla|lechuga|mayo|aji)|reemplaz/.test(q)) {
      return { texto: "Sí se puede 👍 Escribe el cambio en la **nota del producto** al agregarlo (por ejemplo «sin tomate»). El local te confirma si tiene costo." +
        (iArma >= 0 ? "\n\nY si lo quieres totalmente a tu gusto, ármalo tú:" : ""),
        productos: iArma >= 0 ? ids(deSeccion(iArma), 3) : [], opciones: [OP.pedir, OP.carta] };
    }
    if (/ingredient|que (lleva|trae)n?|de que (es|son)/.test(q)) {
      /* Lo que lleva cada cosa está en el detalle de la carta: se busca por el nombre que escribió. */
      var conDetalle = buscar(texto).filter(function (x) { return x.p.detalle; });
      if (conDetalle.length) {
        return { texto: conDetalle.slice(0, 3).map(function (x) { return "**" + x.p.nombre + "**: " + x.p.detalle; }).join("\n") + avisoCerrado(),
          productos: ids(conDetalle, 3), opciones: [OP.carta, OP.pedido] };
      }
    }
    if (/arma(r)? (tu|mi|un|el|mis)?|a mi gusto|personaliz/.test(q) && iArma >= 0) {
      /* Lo que se puede armar sale de la carta misma (nombre y detalle de cada producto). */
      var armables = deSeccion(iArma);
      return { texto: "Puedes armarlo como más te guste 👌\n" + armables.map(function (x) {
          return "- **" + x.p.nombre + "**" + (x.p.detalle ? ": " + x.p.detalle.replace(/\.$/, "") : "") + " — " + P.plata(x.p.precio);
        }).join("\n") + "\n\nToca **Agregar** y escribe en la nota lo que quieres que lleve." + avisoCerrado(),
        productos: ids(armables, 4), opciones: [OP.carta, OP.pedido] };
    }
    if (/veg|vegetar|sin carne|sin pescado|sin proteina/.test(q)) {
      /* Sin carne: se descarta todo lo que nombre una proteína, en el nombre o en el detalle. */
      var CARNES = /carne|churrasco|mechada|lomit|\blomo\b|pollo|\bave\b|hamburgues|vienesa|vianesa|salchich|tocino|longaniza|chorrillana|nugget|jamon|camaron|cerdo|mongolian|chapsui|saltado|luco|\bas\b|combo/;
      var veg = todos.filter(function (x) {
        var txt = t(x.p.nombre + " " + (x.p.detalle || "") + " " + x.cat.nombre);
        return !CARNES.test(txt) && /veg|champinon|palta|queso|papa|ensalada|fruta|waffle|jugo/.test(txt);
      });
      return { texto: (veg.length ? "Esto es lo más vegetariano que tenemos 🥑" : "No tenemos un menú vegetariano aparte 🥑") +
          " Si quieres algo sin carne, ármalo a tu gusto o escríbelo en la nota del producto." + avisoCerrado(),
        productos: ids(veg.concat(iArma >= 0 ? deSeccion(iArma) : []), 4), opciones: [OP.carta, OP.pedido] };
    }
    if (/alergi|celiac|gluten|lactosa|intoleran|embaraz/.test(q)) {
      return { texto: "Para alergias, intolerancias o embarazo es mejor confirmarlo directo con el local, así te dicen exactamente qué lleva cada preparación.", wsp: "Hola, tengo una consulta por alergias: " };
    }
    if (/picant|spicy|aji\b/.test(q)) {
      var pic = todos.filter(function (x) { return /spicy|picant|aji\b/.test(t(x.p.nombre + " " + (x.p.detalle || ""))); });
      return { texto: pic.length ? "¿Te gusta el picante? 🌶️ Mira estas opciones:" : "No tenemos platos picantes como tal 🌶️ Pídelo en la nota del producto y el local te dice si puede.", productos: ids(pic, 4), opciones: sinNulos([opSeccion(/salsa/, "🥫 Salsas extra"), OP.pedir]) };
    }
    if (/bebid|bebest|jugo|coca|gaseosa|agua|tomar/.test(q)) {
      var beb = deCategoria(/bebest|bebida/);
      if (beb.length) return { texto: "Para acompañar 🥤", productos: ids(beb, 4), opciones: sinNulos([opSeccion(/salsa/, "🥫 Salsas extra"), OP.pedido]) };
    }
    if (/salsa|soya|teriyaki|jengibre|acevichad/.test(q)) {
      var sal = deCategoria(/salsa/);
      if (sal.length) return { texto: "Estas son las salsas que tenemos (te muestro 6 de " + sal.length + "):", productos: ids(sal, 6), ir: seccion(/salsa|extra/), opciones: [OP.bebidas, OP.pedido] };
    }
    if (/entrant|aperitiv|para picar|picoteo|para compartir/.test(q) && iEntr >= 0) return responderAccion("sec:" + iEntr);
    if (/barat|economic|menos de|presupuesto|luca|poca plata/.test(q)) {
      var tope = /(\d{1,2})\s*(lucas|mil)/.exec(q) || /\$?\s?(\d{1,2})\.?(\d{3})/.exec(q);
      var max = tope ? (tope[2] && /^\d{3}$/.test(tope[2]) ? +(tope[1] + tope[2]) : +tope[1] * 1000) : 0;
      var comida = todos.filter(function (x) { return !esExtra(x) && x.p.precio; }).sort(function (a, b) { return a.p.precio - b.p.precio; });
      var bajo = max ? comida.filter(function (x) { return x.p.precio <= max; }) : comida;
      return { texto: (max ? (bajo.length ? "Con " + P.plata(max) + " te alcanza para:" : "Con " + P.plata(max) + " no alcanza para nada de la carta 😕 Lo más económico es:") : "Lo más económico de la carta:") + avisoCerrado(),
        productos: ids(bajo.length ? bajo : comida, 4), opciones: [{ t: "💸 Hasta $10.000", q: "algo barato menos de 10 lucas" }, { t: "💸 Hasta $20.000", q: "algo barato menos de 20 lucas" }, OP.pedir] };
    }
    if (/recomiend|recomienda|sugier|que (me )?(pido|pedimos|como)|no se que|popular|mas vendid|destac|promo|oferta|antoj|elegir|mejor|rico/.test(q)) {
      var dest = todos.filter(function (x) { return x.p.destacado; });
      return { texto: "¿Te tinca alguna de estas? Son de lo más pedido 🔥" + avisoCerrado() + "\n\nSi me dices para cuántas personas o qué te gusta, te ayudo a elegir.",
        productos: ids(dest.length ? dest : todos, 4), opciones: [OP.pedir, OP.papas, OP.barato] };
    }
    if (/^(hola|buenas|buenos|holi|hey|wena|alo|ola)\b/.test(q) && q.length < 25) {
      return { texto: "¡Hola! 😊 ¿Qué se te antoja? Elige una opción o escríbeme lo que buscas.", opciones: INICIO };
    }
    if (/gracias|vale|ok|bacan|perfecto|genial|listo|chao|adios/.test(q) && q.length < 30) {
      return P.cantidad() ? { texto: "¡De nada! Cuando estés listo, abre tu pedido y envíalo por WhatsApp 🍔", pedido: true } :
        { texto: "¡De nada! Aquí estoy si necesitas algo más 🍔" };
    }
    var hallados = buscar(texto);
    if (hallados.length) {
      return { texto: (hallados.length === 1 ? "Encontré esto:" : "Mira lo que encontré:") + avisoCerrado(), productos: ids(hallados, 4) };
    }
    /* ¿Preguntó por una sección entera ("para picar", "bebidas", "combos")? Se la mostramos. */
    for (var si = 0; si < C.secciones.length; si++) {
      var nsec = t(C.secciones[si].nombre).replace(/\.+$/, "");
      if (nsec.length > 3 && q.indexOf(nsec) >= 0) {
        var dels = deSeccion(si);
        if (dels.length) {
          return { texto: "Esto tenemos en **" + C.secciones[si].nombre + "**:" + avisoCerrado(),
            productos: ids(dels, 4), ir: dels.length > 4 ? si : null, opciones: [OP.carta, OP.pedido] };
        }
      }
    }
    var agotado = P.productos().filter(function (x) {
      return x.p.disponible === false && t(x.p.nombre).split(/\s+/).some(function (w) { return w.length > 3 && q.indexOf(w) >= 0; });
    })[0];
    if (agotado) return { texto: "**" + agotado.p.nombre + "** está agotado por hoy 😕 ¿Te muestro otra opción?", opciones: [OP.top, OP.carta] };
    return { texto: "Mmm, no estoy seguro de eso 🤔 Prueba con una de estas opciones o escríbenos por WhatsApp.", wsp: true, opciones: MENU.slice(0, 6) };
  }

  /* ---------- eventos ---------- */
  raiz.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-asis-abrir")) { if (panel.hidden) abrirChat(); else cerrarChat(); }
    else if (b.hasAttribute("data-asis-cerrar")) cerrarChat();
    else if (b.hasAttribute("data-asis-op")) usarOp(b.getAttribute("data-asis-op"), b.textContent);
    // «Ver … en la carta» y «Ver mi pedido»: el chat se cierra en el celular para que se vea
    else if ((b.hasAttribute("data-asis-ir") || b.hasAttribute("data-abrir-pedido")) && window.matchMedia("(max-width: 640px)").matches) cerrarChat();
  });
  $("[data-asis-form]", raiz).addEventListener("submit", function (e) {
    e.preventDefault();
    var v = entrada.value;
    entrada.value = "";
    enviar(v);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden && !document.querySelector("dialog[open]")) cerrarChat();
  });
  // el estado (abierto/cerrado) de la cabecera se actualiza cada minuto
  setInterval(function () { if (!panel.hidden && !ocupado) pintarEstado(); }, 60000);

  mensajes = (leer(GUARDADO) || []).filter(function (m) { return m && m.content; });
})();
