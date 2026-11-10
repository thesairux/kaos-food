/*
  CARTA
  =====
  Aquí están los datos del local, los colores, el horario y todos los productos con sus precios.
  Lo más fácil es editarla desde el panel (tu-pagina/admin). Para editarla aquí, cambia el texto
  entre comillas o el número y guarda el archivo.

  Reglas rápidas:
  - Los precios van sin punto ni signo: 14500 (no "$14.500").
  - "tema": colores de la marca. "color" es el principal (botones, detalles) y "colorDestacado" el de
    los títulos destacados. Van en formato #rrggbb. Si quedan vacíos, se usan el rojo y el amarillo de la plantilla.
  - Horario: "13:00-22:00" o "cerrado". Para dos turnos: "12:00-15:30, 19:00-23:00".
    Si "horario" queda en null, la página no muestra abierto/cerrado y siempre deja pedir.
  - horarioConfirmado: con false el horario solo se muestra como referencia ("por confirmar"):
    no aparece abierto/cerrado ni se bloquean pedidos. Cámbialo a true cuando esté confirmado.
  - diasCerrados: fechas en que no se atiende aunque el horario diga abierto. Ej: ["2026-12-25"].
  - "textos": los títulos y textos fijos de la página (portada, carta, pasos, pie).
  - Lo que quede vacío ("") no se muestra: por ejemplo, sin "direccion" no aparece la sección Ubicación.
  - "secciones" son los botones grandes de la carta (Promos, Sushi, Hamburguesas…) y cada una tiene
    sus "categorias" (si hay más de una, aparecen como botones chicos).
  - Producto agotado: agrega "disponible": false
  - Producto en la portada (promo destacada): agrega "destacado": true y una "foto".
  - Fotos: guárdalas en la carpeta img/carta/ y escribe la ruta, ej: "img/carta/mi-foto.webp".
    Si una categoría tiene al menos un producto con foto, se muestra en tarjetas; si no, en lista.
  - "detalle" con varias líneas (separadas por \n) se muestra como «Ver qué incluye».
  - "opciones": lo que el cliente elige (ej: ["Simple", "Doble"]).
    Si cada opción tiene otro precio, ponlo en "preciosOpciones".
  - "personalizar": los grupos de "personalizacion" que el cliente elige en ese producto o en toda
    la categoría (ej: ["punto", "agregados"] en las hamburguesas). Un producto con su propio
    "personalizar" no usa el de la categoría.
  - Grupos de "personalizacion":
      "tipo": "elegir" con "min": 1 y "max": 1  → el cliente elige una sí o sí (ej: punto de la carne).
      "tipo": "extra" con "max": 10             → agregados opcionales con precio (ej: tocino +$1.000).
      "porRoll": true                           → se elige en cada roll (proteína, relleno, envoltura).
      "porDefecto": true en una opción          → queda marcada de entrada.
  - "cupones": códigos de descuento (un cupón por pedido).
      "tipo": "porcentaje" (10 = 10%) o "monto" (2000 = $2.000), con su "valor".
      Opcionales: "minimo" (pedido mínimo), "tope" (descuento máximo de un porcentaje),
      "desde" y "hasta" ("2026-12-31"), "dias" (["martes"]), "modo" ("retiro" o "delivery"),
      "aplica" (ids de categorías: el descuento se calcula solo sobre esas), "activo": false (apagado)
      y "visible": false (no aparece en la página; sirve para redes o volantes).
      Ojo: los códigos se pueden ver en este archivo. El local confirma cada cupón en el WhatsApp.
  - "rolls": cuántos rolls arma el cliente en ese producto (20 cortes = 2 rolls de 10).
  - En una opción de "personalizacion", "gratis": 1 significa que la primera de esa opción no se cobra
    y desde la segunda se cobra su precio (ej: la primera envoltura en palta y la primera en queso).
  Cuidado con las comas: cada elemento de una lista va separado por una coma.
*/
window.CARTA = {
  "negocio": {
    "nombre": "Asian Sushi Ovalle",
    "whatsapp": "56958836237",
    "whatsappVisible": "+56 9 5883 6237",
    "facebook": "",
    "instagram": "asiansushiovalle",
    "direccion": "Sergio Peralta 758",
    "sector": "",
    "ciudad": "Ovalle",
    "region": "",
    "mapa": "https://www.google.com/maps/search/?api=1&query=Sergio+Peralta+758%2C+Ovalle",
    "mapaBusqueda": "Sergio Peralta 758, Ovalle, Chile",
    "datosTransferencia": "",
    "sucursales": [],
    "sectoresDelivery": [
      {
        "nombre": "Ovalle",
        "detalle": "Sector parte alta hasta el Hospital y sector parte baja hasta Los Peñones",
        "precio": 2500
      },
      {
        "nombre": "Extremo norte",
        "detalle": "Puertas del Sol, Santa Antonia, Altos de Tuquí, Aires de Tuquí y Huamalata",
        "precio": 3000
      },
      {
        "nombre": "Extremo sur",
        "detalle": "Las Brisas, Los Leíces y La Chimba hasta la escuela",
        "precio": 4000
      }
    ],
    "mapaCentro": {
      "lat": -30.6016,
      "lng": -71.1996
    },
    "pagosDelivery": [
      "Efectivo",
      "Transferencia"
    ],
    "pagosRetiro": [
      "Efectivo",
      "Transferencia"
    ]
  },
  "tema": {
    "color": "#d73b37",
    "colorDestacado": "#ff9a6b"
  },
  "horario": {
    "lunes": "13:30-23:00",
    "martes": "13:30-23:00",
    "miercoles": "13:30-23:00",
    "jueves": "13:30-23:00",
    "viernes": "14:30-00:00",
    "sabado": "14:30-00:00",
    "domingo": "12:30-22:00"
  },
  "horarioConfirmado": true,
  "diasCerrados": [],
  "textos": {
    "portada": {
      "titulo": "¿Pedimos",
      "destacado": "sushi?",
      "bajada": "Tablas, rolls premium, gohan y más. Pide para retiro o delivery y envía tu pedido por WhatsApp."
    },
    "carta": {
      "titulo": "Elige tu",
      "destacado": "antojo",
      "bajada": "Tablas, entrantes, creaciones de la casa, rolls premium, gohan, sushiburger y arma tu roll. Suma lo que quieras al pedido."
    },
    "cupones": {
      "titulo": "Cupones",
      "destacado": "de la semana",
      "bajada": "Toca «Usar cupón» y el descuento se aplica solo en tu pedido. Un cupón por pedido."
    },
    "arma": {
      "titulo": "Arma tu",
      "destacado": "roll"
    },
    "pasos": {
      "titulo": "Haz tu pedido",
      "destacado": "en 3 pasos.",
      "lista": [
        {
          "titulo": "Elige o arma",
          "texto": "Escoge tu tabla, rolls premium o gohan, o arma tu roll como más te guste."
        },
        {
          "titulo": "Retiro o delivery",
          "texto": "Retira en Sergio Peralta 758 o pide delivery: Ovalle $2.500, extremo norte $3.000 y extremo sur $4.000."
        },
        {
          "titulo": "Envía por WhatsApp",
          "texto": "Elige cómo pagas al retirar o al recibir y envía tu pedido: llega directo a nuestro WhatsApp."
        }
      ]
    },
    "ubicacion": {
      "titulo": "Te esperamos"
    },
    "antojo": {
      "titulo": "¿Qué se te",
      "destacado": "antoja hoy?"
    }
  },
  "secciones": [
    {
      "nombre": "Tablas",
      "categorias": [
        {
          "id": "tablas",
          "nombre": "Tablas",
          "nota": "Individuales y familiares. Se permiten como máximo 2 modificaciones en las tablas. Cada modificación tiene costo adicional.",
          "productos": [
            {
              "id": "tabla-20",
              "nombre": "Tabla 20 piezas",
              "precio": 9990,
              "foto": "img/carta/tabla-20.webp",
              "detalle": "Tempura: camarón, queso crema y cebollín.\nPalta: kanikama, queso crema y palmito.",
              "incluye": "1 salsa (soya o teriyaki)"
            },
            {
              "id": "tabla-40",
              "nombre": "Tabla 40 piezas",
              "precio": 18990,
              "foto": "img/carta/tabla-40.webp",
              "detalle": "Sésamo: camarón, pepino y palta.\nPanko: pollo, queso crema y cebollín.\nQueso: champiñón, palta y pimentón.\nPalta: kanikama, queso crema y palmito.",
              "incluye": "3 salsas (soya o teriyaki)",
              "destacado": true
            },
            {
              "id": "tabla-60",
              "nombre": "Tabla 60 piezas",
              "precio": 27990,
              "foto": "img/carta/tabla-60.webp",
              "detalle": "Sésamo: camarón, queso crema y pepino.\nQueso: kanikama, palta y pimentón.\nPalta: champiñón, queso crema y aceituna.\nNori: pollo, albahaca y palmito.\nPanko: pollo, palta y aceituna.\nTempura: camarón, queso crema y cebollín.",
              "incluye": "4 salsas (soya o teriyaki)"
            },
            {
              "id": "tabla-80",
              "nombre": "Tabla 80 piezas",
              "precio": 36990,
              "foto": "img/carta/tabla-80.webp",
              "detalle": "Sésamo: camarón, queso crema y pepino.\nQueso: kanikama, palta y pimentón.\nPalta: champiñón, queso crema y aceituna.\nNori: pollo, albahaca y palmito.\nPanko: pollo, palta y aceituna.\nTempura: pollo, queso crema y cebollín.\nCiboulette: choclito cóctel, palta y queso crema.\nHosomaki panko: camarón y queso crema.",
              "incluye": "5 salsas (soya o teriyaki)"
            }
          ]
        },
        {
          "id": "tablas-especiales",
          "nombre": "Tablas especiales",
          "nota": "Se permiten como máximo 2 modificaciones en las tablas. Cada modificación tiene costo adicional.",
          "productos": [
            {
              "id": "fusion",
              "nombre": "Fusión",
              "precio": 20490,
              "foto": "img/carta/fusion.webp",
              "detalle": "Palta: camarón, queso crema y cebollín.\nQueso: pollo, palta y palmito.\nTempura: camarón, queso crema y cebollín.\nPanko: pollo, palta y palmito.\n+ 8 camarones rebosados en panko y 6 gyozas de variedades mixtas.",
              "nota": "5 piezas por cada envoltura.",
              "incluye": "3 salsas (soya o teriyaki)",
              "destacado": true
            },
            {
              "id": "chicken-lovers",
              "nombre": "Chicken Lovers",
              "precio": 20990,
              "foto": "img/carta/chicken-lovers.webp",
              "detalle": "Panko: pollo, queso crema y cebollín.\nQueso: pollo, pimentón y palta.\nPalta: pollo, queso crema y palta.\n+ 6 tori balls.",
              "nota": "36 piezas.",
              "incluye": "2 salsas (soya o teriyaki) y 1 salsa de pimienta"
            },
            {
              "id": "sake-asian",
              "nombre": "Sake Asian",
              "precio": 22990,
              "foto": "img/carta/sake-asian.webp",
              "detalle": "Salmón: salmón, queso crema y pepino.\nPalta: salmón, palmito y palta.\nPanko: salmón, queso crema y cebollín.\n+ 6 sake balls.",
              "nota": "36 piezas.",
              "incluye": "2 salsas (soya o teriyaki) y 1 salsa de pimienta",
              "destacado": true
            }
          ]
        },
        {
          "id": "tablas-veggie",
          "nombre": "Tablas veggie",
          "nota": "Se permiten como máximo 2 modificaciones en las tablas. Cada modificación tiene costo adicional.",
          "productos": [
            {
              "id": "love-veggie",
              "nombre": "Love Veggie",
              "precio": 22990,
              "foto": "img/carta/love-veggie.webp",
              "detalle": "Ciboulette: palmito, pimentón y palta.\nQueso: palta, pepino y choclito cóctel.\nPanko: champiñón, queso crema y aceitunas.\nNori: pepino, zanahoria y queso crema.\n+ 4 nigiris avocado.",
              "nota": "44 piezas.",
              "incluye": "3 salsas (soya o teriyaki)"
            },
            {
              "id": "asian-veggie",
              "nombre": "Asian Veggie",
              "precio": 20990,
              "foto": "img/carta/asian-veggie.webp",
              "detalle": "Palta: champiñón, queso crema y cebollín.\nSésamo: aceituna, pimentón y pepino.\nTempura: queso, palmito y palta.\n+ 6 seta balls.",
              "nota": "36 piezas.",
              "incluye": "2 salsas (soya y teriyaki) y 1 salsa de pimienta"
            }
          ]
        }
      ]
    },
    {
      "nombre": "Entrantes",
      "categorias": [
        {
          "id": "entrantes",
          "nombre": "Entrantes",
          "productos": [
            {
              "id": "proteinas-rebosadas",
              "nombre": "Proteínas rebosadas",
              "precio": 4990,
              "foto": "img/carta/proteinas.webp",
              "detalle": "En tempura o panko, a elección.",
              "opciones": [
                "Pollo (6 unidades)",
                "Camarones (8 unidades)",
                "Salmón (7 unidades)"
              ],
              "preciosOpciones": {
                "Pollo (6 unidades)": 4990,
                "Camarones (8 unidades)": 5490,
                "Salmón (7 unidades)": 6290
              },
              "incluye": "1 salsa (soya o teriyaki)",
              "personalizar": [
                "rebozado",
                "salsa-incluida"
              ]
            },
            {
              "id": "nigiris",
              "nombre": "Nigiris",
              "precio": 3890,
              "foto": "img/carta/nigiris.webp",
              "detalle": "4 unidades.",
              "opciones": [
                "Avocado (palta)",
                "Ebi (camarón)",
                "Sake (salmón)",
                "Maguro (atún)",
                "Tako (pulpo)"
              ],
              "preciosOpciones": {
                "Avocado (palta)": 3890,
                "Ebi (camarón)": 4490,
                "Sake (salmón)": 4690,
                "Maguro (atún)": 4690,
                "Tako (pulpo)": 6290
              },
              "incluye": "1 salsa (soya o teriyaki)",
              "personalizar": [
                "salsa-incluida"
              ]
            },
            {
              "id": "gyozas",
              "nombre": "Gyozas",
              "precio": 4990,
              "foto": "img/carta/gyozas.webp",
              "detalle": "5 unidades, al vapor en soya o fritas.",
              "opciones": [
                "Pollo",
                "Camarón",
                "Cerdo",
                "Mixtas"
              ],
              "personalizar": [
                "preparacion-gyoza"
              ]
            },
            {
              "id": "sashimi",
              "nombre": "Sashimi",
              "precio": 6990,
              "foto": "img/carta/sashimi.webp",
              "detalle": "Salmón o atún, en 6 o 9 cortes.",
              "opciones": [
                "Salmón, 6 cortes",
                "Salmón, 9 cortes",
                "Atún, 6 cortes",
                "Atún, 9 cortes"
              ],
              "preciosOpciones": {
                "Salmón, 6 cortes": 6990,
                "Salmón, 9 cortes": 9800,
                "Atún, 6 cortes": 6990,
                "Atún, 9 cortes": 9800
              },
              "incluye": "1 salsa (soya o teriyaki)",
              "personalizar": [
                "salsa-incluida"
              ]
            }
          ]
        }
      ]
    },
    {
      "nombre": "Creación de la casa",
      "categorias": [
        {
          "id": "creacion-de-la-casa",
          "nombre": "Creación de la casa",
          "productos": [
            {
              "id": "cangri-balls",
              "nombre": "Cangri balls",
              "precio": 6990,
              "foto": "img/carta/balls.webp",
              "detalle": "Base de jaiba, queso mantecoso y especias, rebosadas en panko.",
              "nota": "5 unidades.",
              "incluye": "1 salsa blanca"
            },
            {
              "id": "sake-balls",
              "nombre": "Sake balls",
              "precio": 6490,
              "foto": "img/carta/balls.webp",
              "detalle": "Base de salmón, bechamel y especias, rebosadas en panko.",
              "nota": "6 unidades.",
              "incluye": "1 salsa de pimienta"
            },
            {
              "id": "seta-balls",
              "nombre": "Seta balls",
              "precio": 6990,
              "foto": "img/carta/balls.webp",
              "detalle": "Base de champiñón, bechamel y especias, rebosadas en panko.",
              "nota": "6 unidades.",
              "incluye": "1 salsa de pimienta"
            },
            {
              "id": "tori-balls",
              "nombre": "Tori balls",
              "precio": 6490,
              "foto": "img/carta/balls.webp",
              "detalle": "Base de pollo, tocino, bechamel y especias, rebosadas en panko.",
              "nota": "6 unidades.",
              "incluye": "1 salsa de pimienta"
            }
          ]
        }
      ]
    },
    {
      "nombre": "Rolls premium",
      "categorias": [
        {
          "id": "rolls-premium",
          "nombre": "Rolls premium",
          "personalizar": [
            "ingrediente-extra",
            "salsa-incluida"
          ],
          "productos": [
            {
              "id": "asian-rolls",
              "nombre": "Asian Rolls",
              "precio": 9990,
              "foto": "img/carta/asian-rolls.webp",
              "detalle": "Camarón, salmón, palta, cebollín y queso crema, envuelto en palta. Cubierto de salsa acevichada y topping de papa hilo camote.",
              "incluye": "1 salsa (soya o teriyaki)",
              "destacado": true
            },
            {
              "id": "ceviche-rolls",
              "nombre": "Ceviche Rolls",
              "precio": 9990,
              "foto": "img/carta/ceviche-rolls.webp",
              "detalle": "Camarón furay, palta y queso crema, envuelto en palta, con topping de ceviche de salmón.",
              "incluye": "1 salsa (soya o teriyaki)"
            },
            {
              "id": "criollo-rolls",
              "nombre": "Criollo Rolls",
              "precio": 7190,
              "foto": "img/carta/criollo-rolls.webp",
              "detalle": "Camarón furay, palta, cebollín y queso crema, envuelto en finas láminas de pollo, frito en tempura. Cubierto de salsa huancaína.",
              "incluye": "1 salsa (soya o teriyaki)"
            },
            {
              "id": "cheese-hot",
              "nombre": "Cheese Hot",
              "precio": 6490,
              "foto": "img/carta/cheese-hot.webp",
              "detalle": "Pollo, champiñón, pimentón y albahaca, envuelto en queso crema y frito en panko.",
              "incluye": "1 salsa (soya o teriyaki)"
            },
            {
              "id": "cheese-toasted",
              "nombre": "Cheese & Toasted",
              "precio": 6490,
              "foto": "img/carta/cheese-toasted.webp",
              "detalle": "Pollo y palta, envuelto en queso crema. Cubierto de salsa unagui con topping de almendras tostadas.",
              "incluye": "1 salsa (soya o teriyaki)"
            },
            {
              "id": "fuji-crunch",
              "nombre": "Fuji Crunch Rolls",
              "precio": 8490,
              "foto": "img/carta/fuji-crunch.webp",
              "detalle": "Pollo, queso crema y palta, frito en panko. Cubierto de salsa fuji y topping de camarón furay.",
              "incluye": "1 salsa (soya o teriyaki)"
            },
            {
              "id": "lomo-salteado",
              "nombre": "Lomo Salteado",
              "precio": 8490,
              "foto": "img/carta/lomo-salteado.webp",
              "detalle": "Carne de lomo salteado, tomate y cebolla morada salteadas, frito en panko. Con topping de papas hilo.",
              "incluye": "1 salsa (soya o teriyaki)"
            },
            {
              "id": "masago-ebi-furay",
              "nombre": "Masago Ebi Furay",
              "precio": 6490,
              "foto": "img/carta/masago-ebi.webp",
              "detalle": "Camarón furay, palta y queso crema, envuelto en masago.",
              "incluye": "1 salsa (soya o teriyaki)"
            },
            {
              "id": "pulpo-al-olivo",
              "nombre": "Pulpo al Olivo",
              "precio": 8490,
              "foto": "img/carta/pulpo-olivo.webp",
              "detalle": "Pulpo, cebollín y queso crema, envuelto en palta. Cubierto de salsa al olivo.",
              "incluye": "1 salsa (soya o teriyaki)"
            },
            {
              "id": "sake-tartar",
              "nombre": "Sake Tartar Rolls",
              "precio": 8490,
              "foto": "img/carta/sake-tartar.webp",
              "detalle": "Camarón, palta y queso crema, frito en panko. Con topping de tartar de salmón spicy, con toques de miel y crunch.",
              "incluye": "1 salsa (soya o teriyaki)"
            },
            {
              "id": "spicy-rolls",
              "nombre": "Spicy Rolls",
              "precio": 7190,
              "foto": "img/carta/spicy-rolls.webp",
              "detalle": "Pollo furay, palta y queso crema, frito en panko. Cubierto de salsa spicy y topping de cebollín al hilo.",
              "incluye": "1 salsa (soya o teriyaki)"
            },
            {
              "id": "triple-plaqueta",
              "nombre": "Triple Plaqueta",
              "precio": 8490,
              "foto": "img/carta/triple-plaqueta.webp",
              "detalle": "Atún, pepino y queso crema, envuelto en palta, camarón y salmón. Cubierto de salsa acevichada.",
              "incluye": "1 salsa (soya o teriyaki)",
              "destacado": true
            },
            {
              "id": "umami-rolls",
              "nombre": "Umami Rolls",
              "precio": 8490,
              "foto": "img/carta/umami-rolls.webp",
              "detalle": "Salmón, cebollín y queso crema, envuelto en atún. Cubierto de salsa umami.",
              "incluye": "1 salsa (soya o teriyaki)"
            }
          ]
        }
      ]
    },
    {
      "nombre": "Gohan y sushiburger",
      "categorias": [
        {
          "id": "gohan-sushiburger",
          "nombre": "Gohan y sushiburger",
          "productos": [
            {
              "id": "gohan",
              "nombre": "Gohan",
              "precio": 7990,
              "foto": "img/carta/gohan.webp",
              "detalle": "Escoge 2 ingredientes base (rebosados o fríos) y 3 ingredientes secundarios.",
              "incluye": "1 salsa (soya o teriyaki)",
              "personalizar": [
                "base-2",
                "preparacion-base",
                "secundarios-3",
                "ingrediente-extra",
                "salsa-incluida"
              ],
              "destacado": true
            },
            {
              "id": "sushi-burger",
              "nombre": "Sushi burger",
              "precio": 8900,
              "foto": "img/carta/sushiburger.webp",
              "detalle": "Escoge 2 ingredientes base (rebosados o fríos) y 3 ingredientes secundarios.",
              "incluye": "2 salsas (soya o teriyaki)",
              "personalizar": [
                "base-2",
                "preparacion-base",
                "secundarios-3",
                "ingrediente-extra"
              ]
            }
          ]
        }
      ]
    },
    {
      "nombre": "Arma tu roll",
      "categorias": [
        {
          "id": "arma-tu-roll",
          "nombre": "Arma tu roll",
          "productos": [
            {
              "id": "roll-con-arroz",
              "nombre": "Arma tu roll con arroz",
              "precio": 5490,
              "foto": "img/carta/arma-roll.webp",
              "detalle": "1 envoltura + 1 ingrediente base + 2 ingredientes secundarios.",
              "incluye": "1 salsa (soya o teriyaki)",
              "personalizar": [
                "ar-envoltura",
                "ar-base",
                "rebosar",
                "ar-secundarios-2",
                "ingrediente-extra",
                "sin-nori",
                "salsa-incluida"
              ]
            },
            {
              "id": "roll-sin-arroz",
              "nombre": "Arma tu roll sin arroz",
              "precio": 6790,
              "foto": "img/carta/sin-arroz.webp",
              "detalle": "1 envoltura + 1 ingrediente base + 4 ingredientes secundarios.",
              "incluye": "1 salsa (soya o teriyaki)",
              "personalizar": [
                "sa-envoltura",
                "ar-base",
                "rebosar",
                "sa-secundarios-4",
                "ingrediente-extra",
                "salsa-incluida"
              ]
            },
            {
              "id": "hosomaki",
              "nombre": "Hosomaki",
              "precio": 4290,
              "detalle": "Envuelto en nori + 1 ingrediente base + 1 ingrediente secundario.",
              "incluye": "1 salsa (soya o teriyaki)",
              "personalizar": [
                "hoso-base",
                "rebosar",
                "hoso-secundario",
                "ingrediente-extra",
                "salsa-incluida"
              ]
            }
          ]
        }
      ]
    },
    {
      "nombre": "Extras",
      "categorias": [
        {
          "id": "salsas",
          "nombre": "Salsas y otros",
          "productos": [
            {
              "id": "acevichada",
              "nombre": "Salsa acevichada",
              "precio": 900
            },
            {
              "id": "fuji",
              "nombre": "Salsa fuji",
              "precio": 900
            },
            {
              "id": "olivo",
              "nombre": "Salsa al olivo",
              "precio": 900
            },
            {
              "id": "soya-teriyaki",
              "nombre": "Soya o teriyaki",
              "precio": 790,
              "opciones": [
                "Soya",
                "Teriyaki"
              ]
            },
            {
              "id": "blanca-pimienta",
              "nombre": "Salsa blanca o de pimienta",
              "precio": 990,
              "opciones": [
                "Salsa blanca",
                "Salsa de pimienta"
              ]
            },
            {
              "id": "spicy",
              "nombre": "Salsa spicy",
              "precio": 900
            },
            {
              "id": "huancaina",
              "nombre": "Salsa huancaína",
              "precio": 900
            },
            {
              "id": "umami",
              "nombre": "Salsa umami",
              "precio": 900
            },
            {
              "id": "jengibre-wasabi",
              "nombre": "Jengibre o wasabi",
              "precio": 790,
              "opciones": [
                "Jengibre",
                "Wasabi"
              ]
            }
          ]
        },
        {
          "id": "bebestibles",
          "nombre": "Bebestibles",
          "productos": [
            {
              "id": "bebida-lata",
              "nombre": "Bebida 220 ml",
              "precio": 1000,
              "foto": "img/carta/bebidas.webp",
              "opciones": [
                "Coca-Cola",
                "Sprite",
                "Fanta"
              ]
            },
            {
              "id": "bebida-grande",
              "nombre": "Bebida 1,5 litros",
              "precio": 2990,
              "foto": "img/carta/bebidas.webp",
              "opciones": [
                "Coca-Cola",
                "Coca-Cola Zero",
                "Sprite",
                "Fanta"
              ]
            }
          ]
        }
      ]
    }
  ],
  "cupones": [],
  "personalizacion": [
    {
      "id": "salsa-incluida",
      "nombre": "Salsa incluida",
      "tipo": "elegir",
      "min": 1,
      "max": 1,
      "opciones": [
        {
          "id": "soya",
          "nombre": "Soya",
          "precio": 0
        },
        {
          "id": "teriyaki",
          "nombre": "Teriyaki",
          "precio": 0
        }
      ]
    },
    {
      "id": "rebozado",
      "nombre": "Rebosado",
      "tipo": "elegir",
      "min": 1,
      "max": 1,
      "opciones": [
        {
          "id": "tempura",
          "nombre": "Tempura",
          "precio": 0
        },
        {
          "id": "panko",
          "nombre": "Panko",
          "precio": 0
        }
      ]
    },
    {
      "id": "preparacion-gyoza",
      "nombre": "Preparación",
      "tipo": "elegir",
      "min": 1,
      "max": 1,
      "opciones": [
        {
          "id": "vapor",
          "nombre": "Al vapor en soya",
          "precio": 0
        },
        {
          "id": "fritas",
          "nombre": "Fritas",
          "precio": 0
        }
      ]
    },
    {
      "id": "base-2",
      "nombre": "Ingredientes base",
      "tipo": "elegir",
      "min": 2,
      "max": 2,
      "opciones": [
        {
          "id": "camaron",
          "nombre": "Camarón",
          "precio": 0
        },
        {
          "id": "salmon",
          "nombre": "Salmón",
          "precio": 0
        },
        {
          "id": "kanikama",
          "nombre": "Kanikama",
          "precio": 0
        },
        {
          "id": "champinon",
          "nombre": "Champiñón",
          "precio": 0
        },
        {
          "id": "pollo",
          "nombre": "Pollo",
          "precio": 0
        },
        {
          "id": "atun",
          "nombre": "Atún",
          "precio": 0
        },
        {
          "id": "lomo-salteado",
          "nombre": "Lomo salteado",
          "precio": 2200
        },
        {
          "id": "pulpo",
          "nombre": "Pulpo",
          "precio": 3290
        }
      ]
    },
    {
      "id": "preparacion-base",
      "nombre": "La base, ¿rebosada o fría?",
      "tipo": "elegir",
      "min": 1,
      "max": 1,
      "opciones": [
        {
          "id": "rebosado",
          "nombre": "Rebosado",
          "precio": 0
        },
        {
          "id": "frio",
          "nombre": "Frío",
          "precio": 0
        }
      ]
    },
    {
      "id": "secundarios-3",
      "nombre": "Ingredientes secundarios",
      "tipo": "elegir",
      "min": 3,
      "max": 3,
      "opciones": [
        {
          "id": "queso-crema",
          "nombre": "Queso crema",
          "precio": 0
        },
        {
          "id": "palta",
          "nombre": "Palta",
          "precio": 0
        },
        {
          "id": "palmito",
          "nombre": "Palmito",
          "precio": 0
        },
        {
          "id": "cebollin",
          "nombre": "Cebollín",
          "precio": 0
        },
        {
          "id": "ciboulette",
          "nombre": "Ciboulette",
          "precio": 0
        },
        {
          "id": "aji-verde",
          "nombre": "Ají verde",
          "precio": 0
        },
        {
          "id": "pepino",
          "nombre": "Pepino",
          "precio": 0
        },
        {
          "id": "pimenton",
          "nombre": "Pimentón",
          "precio": 0
        },
        {
          "id": "aceitunas",
          "nombre": "Aceitunas",
          "precio": 0
        },
        {
          "id": "albahaca",
          "nombre": "Albahaca",
          "precio": 0
        },
        {
          "id": "choclito",
          "nombre": "Choclito cóctel",
          "precio": 0
        },
        {
          "id": "zanahoria",
          "nombre": "Zanahoria",
          "precio": 0
        }
      ]
    },
    {
      "id": "ar-envoltura",
      "nombre": "Envoltura",
      "tipo": "elegir",
      "min": 1,
      "max": 1,
      "opciones": [
        {
          "id": "palta",
          "nombre": "Palta",
          "precio": 0
        },
        {
          "id": "queso-crema",
          "nombre": "Queso crema",
          "precio": 0
        },
        {
          "id": "sesamo",
          "nombre": "Sésamo",
          "precio": 0
        },
        {
          "id": "nori",
          "nombre": "Nori",
          "precio": 0
        },
        {
          "id": "panko",
          "nombre": "Panko",
          "precio": 0
        },
        {
          "id": "tempura",
          "nombre": "Tempura",
          "precio": 0
        },
        {
          "id": "ciboulette",
          "nombre": "Ciboulette",
          "precio": 0
        },
        {
          "id": "masago",
          "nombre": "Masago",
          "precio": 1500
        },
        {
          "id": "salmon",
          "nombre": "Salmón",
          "precio": 2500
        },
        {
          "id": "atun",
          "nombre": "Atún",
          "precio": 2500
        }
      ]
    },
    {
      "id": "ar-base",
      "nombre": "Ingrediente base",
      "tipo": "elegir",
      "min": 1,
      "max": 1,
      "opciones": [
        {
          "id": "kanikama",
          "nombre": "Kanikama",
          "precio": 0
        },
        {
          "id": "champinon",
          "nombre": "Champiñón",
          "precio": 0
        },
        {
          "id": "atun",
          "nombre": "Atún",
          "precio": 0
        },
        {
          "id": "pollo",
          "nombre": "Pollo",
          "precio": 0
        },
        {
          "id": "camaron",
          "nombre": "Camarón",
          "precio": 0
        },
        {
          "id": "salmon",
          "nombre": "Salmón",
          "precio": 0
        },
        {
          "id": "lomo-salteado",
          "nombre": "Lomo salteado",
          "precio": 2200
        },
        {
          "id": "pulpo",
          "nombre": "Pulpo",
          "precio": 3290
        }
      ]
    },
    {
      "id": "ar-secundarios-2",
      "nombre": "Ingredientes secundarios",
      "tipo": "elegir",
      "min": 2,
      "max": 2,
      "opciones": [
        {
          "id": "queso-crema",
          "nombre": "Queso crema",
          "precio": 0
        },
        {
          "id": "palta",
          "nombre": "Palta",
          "precio": 0
        },
        {
          "id": "palmito",
          "nombre": "Palmito",
          "precio": 0
        },
        {
          "id": "pepino",
          "nombre": "Pepino",
          "precio": 0
        },
        {
          "id": "pimenton",
          "nombre": "Pimentón",
          "precio": 0
        },
        {
          "id": "aceitunas",
          "nombre": "Aceitunas",
          "precio": 0
        },
        {
          "id": "cebollin",
          "nombre": "Cebollín",
          "precio": 0
        },
        {
          "id": "ciboulette",
          "nombre": "Ciboulette",
          "precio": 0
        },
        {
          "id": "aji-verde",
          "nombre": "Ají verde",
          "precio": 0
        },
        {
          "id": "albahaca",
          "nombre": "Albahaca",
          "precio": 0
        },
        {
          "id": "choclito",
          "nombre": "Choclito",
          "precio": 0
        },
        {
          "id": "zanahoria",
          "nombre": "Zanahoria",
          "precio": 0
        }
      ]
    },
    {
      "id": "sin-nori",
      "nombre": "Sin nori",
      "tipo": "extra",
      "min": 0,
      "max": 1,
      "opciones": [
        {
          "id": "sin-nori",
          "nombre": "Roll sin nori",
          "precio": 1000
        }
      ]
    },
    {
      "id": "hoso-base",
      "nombre": "Ingrediente base",
      "tipo": "elegir",
      "min": 1,
      "max": 1,
      "opciones": [
        {
          "id": "kanikama",
          "nombre": "Kanikama",
          "precio": 0
        },
        {
          "id": "champinon",
          "nombre": "Champiñón",
          "precio": 0
        },
        {
          "id": "atun",
          "nombre": "Atún",
          "precio": 0
        },
        {
          "id": "pollo",
          "nombre": "Pollo",
          "precio": 0
        },
        {
          "id": "camaron",
          "nombre": "Camarón",
          "precio": 0
        },
        {
          "id": "salmon",
          "nombre": "Salmón",
          "precio": 0
        }
      ]
    },
    {
      "id": "hoso-secundario",
      "nombre": "Ingrediente secundario",
      "tipo": "elegir",
      "min": 1,
      "max": 1,
      "opciones": [
        {
          "id": "queso-crema",
          "nombre": "Queso crema",
          "precio": 0
        },
        {
          "id": "palta",
          "nombre": "Palta",
          "precio": 0
        },
        {
          "id": "palmito",
          "nombre": "Palmito",
          "precio": 0
        },
        {
          "id": "pepino",
          "nombre": "Pepino",
          "precio": 0
        },
        {
          "id": "pimenton",
          "nombre": "Pimentón",
          "precio": 0
        },
        {
          "id": "aceitunas",
          "nombre": "Aceitunas",
          "precio": 0
        },
        {
          "id": "cebollin",
          "nombre": "Cebollín",
          "precio": 0
        },
        {
          "id": "ciboulette",
          "nombre": "Ciboulette",
          "precio": 0
        },
        {
          "id": "aji-verde",
          "nombre": "Ají verde",
          "precio": 0
        },
        {
          "id": "albahaca",
          "nombre": "Albahaca",
          "precio": 0
        },
        {
          "id": "choclito",
          "nombre": "Choclito",
          "precio": 0
        },
        {
          "id": "zanahoria",
          "nombre": "Zanahoria",
          "precio": 0
        }
      ]
    },
    {
      "id": "sa-envoltura",
      "nombre": "Envoltura",
      "tipo": "elegir",
      "min": 1,
      "max": 1,
      "opciones": [
        {
          "id": "palta",
          "nombre": "Palta",
          "precio": 0
        },
        {
          "id": "queso-crema",
          "nombre": "Queso crema",
          "precio": 0
        },
        {
          "id": "nori",
          "nombre": "Nori",
          "precio": 0
        },
        {
          "id": "panko",
          "nombre": "Panko",
          "precio": 0
        },
        {
          "id": "tempura",
          "nombre": "Tempura",
          "precio": 0
        },
        {
          "id": "salmon",
          "nombre": "Salmón",
          "precio": 2500
        },
        {
          "id": "atun",
          "nombre": "Atún",
          "precio": 2500
        }
      ]
    },
    {
      "id": "sa-secundarios-4",
      "nombre": "Ingredientes secundarios",
      "tipo": "elegir",
      "min": 4,
      "max": 4,
      "opciones": [
        {
          "id": "queso-crema",
          "nombre": "Queso crema",
          "precio": 0
        },
        {
          "id": "palta",
          "nombre": "Palta",
          "precio": 0
        },
        {
          "id": "palmito",
          "nombre": "Palmito",
          "precio": 0
        },
        {
          "id": "pepino",
          "nombre": "Pepino",
          "precio": 0
        },
        {
          "id": "pimenton",
          "nombre": "Pimentón",
          "precio": 0
        },
        {
          "id": "aceitunas",
          "nombre": "Aceitunas",
          "precio": 0
        },
        {
          "id": "cebollin",
          "nombre": "Cebollín",
          "precio": 0
        },
        {
          "id": "ciboulette",
          "nombre": "Ciboulette",
          "precio": 0
        },
        {
          "id": "aji-verde",
          "nombre": "Ají verde",
          "precio": 0
        },
        {
          "id": "albahaca",
          "nombre": "Albahaca",
          "precio": 0
        },
        {
          "id": "choclito",
          "nombre": "Choclito",
          "precio": 0
        },
        {
          "id": "zanahoria",
          "nombre": "Zanahoria",
          "precio": 0
        }
      ]
    },
    {
      "id": "ingrediente-extra",
      "nombre": "Ingrediente extra",
      "tipo": "extra",
      "min": 0,
      "max": 3,
      "opciones": [
        {
          "id": "queso-crema",
          "nombre": "Queso crema",
          "precio": 990
        },
        {
          "id": "palta",
          "nombre": "Palta",
          "precio": 990
        },
        {
          "id": "palmito",
          "nombre": "Palmito",
          "precio": 990
        },
        {
          "id": "pepino",
          "nombre": "Pepino",
          "precio": 990
        },
        {
          "id": "pimenton",
          "nombre": "Pimentón",
          "precio": 990
        },
        {
          "id": "aceitunas",
          "nombre": "Aceitunas",
          "precio": 990
        },
        {
          "id": "cebollin",
          "nombre": "Cebollín",
          "precio": 990
        },
        {
          "id": "ciboulette",
          "nombre": "Ciboulette",
          "precio": 990
        },
        {
          "id": "aji-verde",
          "nombre": "Ají verde",
          "precio": 990
        },
        {
          "id": "albahaca",
          "nombre": "Albahaca",
          "precio": 990
        },
        {
          "id": "choclito",
          "nombre": "Choclito",
          "precio": 990
        },
        {
          "id": "zanahoria",
          "nombre": "Zanahoria",
          "precio": 990
        }
      ]
    },
    {
      "id": "rebosar",
      "nombre": "Rebosar el ingrediente base",
      "tipo": "extra",
      "min": 0,
      "max": 1,
      "opciones": [
        {
          "id": "tempura",
          "nombre": "Rebosado en tempura",
          "precio": 990
        },
        {
          "id": "panko",
          "nombre": "Rebosado en panko",
          "precio": 990
        }
      ]
    }
  ],
  "ingredientes": {}
};
