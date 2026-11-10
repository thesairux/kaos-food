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
  - soloRetiro: con true la página no ofrece delivery y todos los pedidos son para retirar en el local.
  - appsDelivery: las apps donde sí hay delivery, ej:
      [{ "nombre": "Uber Eats", "url": "https://..." }]. Salen como botones en Ubicación y en el pedido.
      Las direcciones tienen que empezar con https://
    Quítalo (o ponlo en false) cuando el local reparta a domicilio y agrega los "sectoresDelivery".
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
    "nombre": "Kaos Food",
    "whatsapp": "56934829829",
    "whatsappVisible": "+56 9 3482 9829",
    "facebook": "https://www.facebook.com/100090883010536/",
    "instagram": "kaos_food",
    "direccion": "José Joaquín Latorre, frente a pasaje Verona",
    "sector": "",
    "ciudad": "La Serena",
    "region": "Coquimbo",
    "mapa": "https://www.google.com/maps/search/?api=1&query=Kaos+Food%2C+Jos%C3%A9+Joaqu%C3%ADn+Latorre%2C+La+Serena",
    "mapaBusqueda": "Kaos Food, José Joaquín Latorre, La Serena, Chile",
    "datosTransferencia": "",
    "sucursales": [],
    "soloRetiro": true,
    "sectoresDelivery": [],
    "pagosDelivery": [],
    "pagosRetiro": [
      "Efectivo",
      "Transferencia"
    ],
    "appsDelivery": [
      {
        "nombre": "Uber Eats",
        "url": "https://www.ubereats.com/cl/store/kaos-food/hDNtRKLVTPmLlzImMUkVSg"
      },
      {
        "nombre": "PedidosYa",
        "url": "https://www.pedidosya.cl/restaurantes/la-serena/kaos-food-ce9059b7-7c51-4a59-affd-37785d16c88a-menu"
      }
    ]
  },
  "tema": {
    "color": "#17797c",
    "colorDestacado": "#ffb020"
  },
  "horario": {
    "lunes": "09:30-00:30",
    "martes": "09:30-00:30",
    "miercoles": "09:30-00:30",
    "jueves": "09:30-00:30",
    "viernes": "09:30-00:30",
    "sabado": "09:30-00:30",
    "domingo": "09:30-00:30"
  },
  "horarioConfirmado": true,
  "diasCerrados": [],
  "textos": {
    "portada": {
      "titulo": "¿Tienes",
      "destacado": "hambre?",
      "bajada": "Sándwiches, completos, papas fritas, colaciones, chorrillanas y jugos naturales. Arma tu pedido y envíalo por WhatsApp."
    },
    "carta": {
      "titulo": "Elige tu",
      "destacado": "antojo",
      "bajada": "Combos, sándwiches, completos, papas fritas, chorrillanas, empanadas, jugos naturales y batidos. Suma lo que quieras al pedido."
    },
    "cupones": {
      "titulo": "Cupones",
      "destacado": "de la semana",
      "bajada": "Toca «Usar cupón» y el descuento se aplica solo en tu pedido. Un cupón por pedido."
    },
    "arma": {
      "titulo": "Arma tu",
      "destacado": "pedido"
    },
    "pasos": {
      "titulo": "Haz tu pedido",
      "destacado": "en 3 pasos.",
      "lista": [
        {
          "titulo": "Elige lo tuyo",
          "texto": "Combos, sándwiches, completos, papas, chorrillanas, jugos y más. Súmalo todo al carro."
        },
        {
          "titulo": "Retiras en el local",
          "texto": "Te esperamos en José Joaquín Latorre, frente a pasaje Verona, La Serena. Abierto todos los días de 09:30 a 00:30. ¿Prefieres delivery? Pídenos por Uber Eats o PedidosYa."
        },
        {
          "titulo": "Envía por WhatsApp",
          "texto": "Elige cómo pagas al retirar y envía tu pedido: llega directo a nuestro WhatsApp."
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
      "nombre": "Combos",
      "categorias": [
        {
          "id": "combos",
          "nombre": "Combos",
          "productos": [
            {
              "id": "combo-1",
              "nombre": "Combo 1",
              "precio": 4500,
              "foto": "img/carta/combo-1.webp",
              "detalle": "Pan con salchicha sureña, tomate, palta y salsas a elección. Incluye papas fritas naturales y bebida de 250 ml."
            },
            {
              "id": "combo-2",
              "nombre": "Combo 2",
              "precio": 7000,
              "foto": "img/carta/combo-2.webp",
              "detalle": "Barros luco (carne de churrasco y queso). Incluye papas fritas naturales y bebida de 250 ml."
            },
            {
              "id": "combo-3",
              "nombre": "Combo 3",
              "precio": 7000,
              "foto": "img/carta/combo-3.webp",
              "detalle": "8 nuggets de pollo. Incluye papas fritas naturales y bebida de 250 ml."
            },
            {
              "id": "combo-4",
              "nombre": "Combo 4",
              "precio": 8000,
              "foto": "img/carta/combo-4.webp",
              "detalle": "Hamburguesa italiana. Incluye papas fritas naturales y bebida de 250 ml.",
              "destacado": true
            },
            {
              "id": "combo-5",
              "nombre": "Combo 5",
              "precio": 9500,
              "detalle": "Cualquier sándwich Kaos (roba choclo, vístima, chamita o calila). Incluye papas fritas naturales y bebida de 250 cc.",
              "opciones": [
                "Roba choclo",
                "Vístima",
                "Chamita",
                "Calila"
              ]
            },
            {
              "id": "combo-6",
              "nombre": "Combo 6",
              "precio": 9000,
              "foto": "img/carta/combo-6.webp",
              "detalle": "Pan de sándwich con carne de churrasco, porotos verdes, tomate, ají verde y salsas a elección. Incluye papas fritas naturales y bebida de 250 ml."
            },
            {
              "id": "combo-7",
              "nombre": "Combo 7",
              "precio": 8000,
              "foto": "img/carta/combo-7.webp",
              "detalle": "Pan de sándwich con carne mechada, palta, tomate y salsas a elección. Incluye papas fritas naturales y bebida de 250 ml."
            },
            {
              "id": "combo-8",
              "nombre": "Combo 8",
              "precio": 8500,
              "foto": "img/carta/combo-8.webp",
              "detalle": "Pan con hamburguesa o churrasco, tocino, pepinillo, salsa cheddar y mayonesa casera. Incluye papas fritas y bebida de 250 cc.",
              "opciones": [
                "Hamburguesa",
                "Churrasco"
              ]
            },
            {
              "id": "combo-9",
              "nombre": "Combo 9",
              "precio": 19000,
              "foto": "img/carta/combo-9.webp",
              "detalle": "Chorrillana para 4 personas (carne, salchicha, longaniza, 4 huevos, cebolla caramelizada y papas fritas). Incluye bebida de 1,5 L.",
              "destacado": true
            },
            {
              "id": "combo-10",
              "nombre": "Combo 10",
              "precio": 8000,
              "foto": "img/carta/combo-10.webp",
              "detalle": "Churrasco italiano con papas fritas y bebida de 250 cc."
            }
          ]
        }
      ]
    },
    {
      "nombre": "Colaciones",
      "categorias": [
        {
          "id": "colaciones",
          "nombre": "Colaciones",
          "productos": [
            {
              "id": "carne-mongoliana",
              "nombre": "Carne Mongoliana",
              "precio": 7000,
              "foto": "img/carta/carne-mongoliana.webp"
            },
            {
              "id": "lomo-saltado",
              "nombre": "Lomo saltado",
              "precio": 7000,
              "foto": "img/carta/lomo-saltado.webp"
            },
            {
              "id": "lomo-a-lo-pobre",
              "nombre": "Lomo a lo pobre",
              "precio": 13000,
              "foto": "img/carta/lomo-a-lo-pobre.webp",
              "detalle": "Lomo vetado, cebolla, huevo y papas fritas."
            },
            {
              "id": "pollo-a-la-plancha",
              "nombre": "Pollo a la plancha",
              "precio": 6500,
              "detalle": "Pollo a la plancha con arroz blanco o primavera y agregado de papas fritas naturales."
            },
            {
              "id": "lomo-a-la-plancha",
              "nombre": "Lomo a la plancha",
              "precio": 11000,
              "foto": "img/carta/lomo-a-la-plancha.webp",
              "detalle": "Lomo a la plancha con arroz y papas fritas."
            },
            {
              "id": "tallarin-saltado",
              "nombre": "Tallarín saltado",
              "precio": 7000,
              "foto": "img/carta/tallarin-saltado.webp",
              "detalle": "Tallarines salteados. Puedes elegir entre tres proteínas: carne, pollo o cerdo.",
              "opciones": [
                "Carne",
                "Pollo",
                "Cerdo"
              ]
            },
            {
              "id": "pollo-asado-al-horno",
              "nombre": "Pollo asado al horno",
              "precio": 6500,
              "foto": "img/carta/pollo-asado-al-horno.webp"
            },
            {
              "id": "chapsui-de-carne-o-pollo",
              "nombre": "Chapsui de carne o pollo",
              "precio": 7000,
              "foto": "img/carta/chapsui-de-carne-o-pollo.webp",
              "detalle": "Chapsui de pollo o carne con arroz chaufa y papas fritas.",
              "opciones": [
                "Carne",
                "Pollo"
              ]
            },
            {
              "id": "pollo-a-la-plancha-con-tallarines-al-pesto",
              "nombre": "Pollo a la plancha con tallarines al pesto",
              "precio": 8000,
              "detalle": "Tallarines al pesto con pollo a la plancha adobado con especias."
            }
          ]
        }
      ]
    },
    {
      "nombre": "Sandwiches",
      "categorias": [
        {
          "id": "ave",
          "nombre": "Ave",
          "productos": [
            {
              "id": "ave-italiana",
              "nombre": "Ave italiana",
              "precio": 6500,
              "foto": "img/carta/ave-italiana.webp",
              "detalle": "Pollo, palta y tomate"
            },
            {
              "id": "ave-roba-choclo",
              "nombre": "Ave roba choclo",
              "precio": 7000,
              "foto": "img/carta/ave-roba-choclo.webp",
              "detalle": "Pollo, lechuga, queso, tocino, choclo y champiñón."
            },
            {
              "id": "ave-chamita",
              "nombre": "Ave chamita",
              "precio": 7000,
              "foto": "img/carta/ave-chamita.webp",
              "detalle": "Pollo, huevo, tocino, lechuga y tomate."
            },
            {
              "id": "ave-vistima",
              "nombre": "Ave vístima",
              "precio": 7000,
              "foto": "img/carta/ave-vistima.webp",
              "detalle": "Pollo, lechuga, tomate, palta, pepinillo y queso"
            },
            {
              "id": "ave-calila",
              "nombre": "Ave calila",
              "precio": 7000,
              "foto": "img/carta/ave-calila.webp",
              "detalle": "Pollo, queso, tocino, cebolla y papas hilo"
            },
            {
              "id": "ave-mojojojo",
              "nombre": "Ave mojojojo",
              "precio": 8000,
              "detalle": "Pan de sándwich con pollo, lechuga, tomate, aros de cebolla, tocino y bastones de queso."
            }
          ]
        },
        {
          "id": "mechada",
          "nombre": "Carne mechada",
          "productos": [
            {
              "id": "mechada-italiana",
              "nombre": "Mechada italiana",
              "precio": 7000,
              "foto": "img/carta/mechada-italiana.webp",
              "detalle": "Carne mechada, palta y tomate"
            },
            {
              "id": "mechada-roba-choclo",
              "nombre": "Mechada roba choclo",
              "precio": 7500,
              "detalle": "Carne mechada, queso, lechuga, tocino, choclo y champiñón."
            },
            {
              "id": "mechada-chamita",
              "nombre": "Mechada chamita",
              "precio": 7500,
              "foto": "img/carta/mechada-chamita.webp",
              "detalle": "Carne mechada, huevo, tocino, lechuga y tomate"
            },
            {
              "id": "mechada-vistima",
              "nombre": "Mechada vístima",
              "precio": 7500,
              "detalle": "Carne mechada, lechuga, palta, tomate, pepinillo y queso"
            },
            {
              "id": "mechada-calila",
              "nombre": "Mechada calila",
              "precio": 7500,
              "detalle": "Carne mechada, queso, tocino, cebolla y papas hilo"
            },
            {
              "id": "mechada-mojojojo",
              "nombre": "Mechada mojojojo",
              "precio": 8500,
              "detalle": "Pan de sándwich con carne mechada, lechuga, tomate, aros de cebolla, tocino y bastones de queso."
            }
          ]
        },
        {
          "id": "churrasco",
          "nombre": "Churrasco",
          "productos": [
            {
              "id": "churrasco-italiano",
              "nombre": "Churrasco italiano",
              "precio": 6500,
              "foto": "img/carta/churrasco-italiano.webp",
              "detalle": "Carne de churrasco, palta y tomate"
            },
            {
              "id": "churrasco-roba-choclo",
              "nombre": "Churrasco roba choclo",
              "precio": 7000,
              "foto": "img/carta/churrasco-roba-choclo.webp",
              "detalle": "Carne de churrasco, queso, lechuga, tocino, choclo y champiñón."
            },
            {
              "id": "churrasco-chamita",
              "nombre": "Churrasco chamita",
              "precio": 7000,
              "detalle": "Carne de churrasco, huevo, tocino, lechuga y tomate"
            },
            {
              "id": "churrasco-vistima",
              "nombre": "Churrasco vístima",
              "precio": 7000,
              "detalle": "Carne de churrasco, lechuga, tomate, palta, pepinillo y queso"
            },
            {
              "id": "churrasco-calila",
              "nombre": "Churrasco calila",
              "precio": 7000,
              "detalle": "Carne de churrasco, queso, tocino, cebolla y papas hilo"
            },
            {
              "id": "churrasco-barros-luco",
              "nombre": "Churrasco barros luco",
              "precio": 5000,
              "foto": "img/carta/churrasco-barros-luco.webp",
              "detalle": "Carne de churrasco y queso"
            },
            {
              "id": "churrasco-chacarero",
              "nombre": "Churrasco chacarero",
              "precio": 7000,
              "foto": "img/carta/churrasco-chacarero.webp",
              "detalle": "Carne de churrasco, porotos verdes, tomate y ají verde."
            },
            {
              "id": "churrasco-mojojojo",
              "nombre": "Churrasco mojojojo",
              "precio": 8000,
              "detalle": "Pan de sándwich con churrasco, lechuga, tomate, aros de cebolla, tocino y bastones de queso."
            }
          ]
        },
        {
          "id": "hamburguesa",
          "nombre": "Hamburguesa",
          "productos": [
            {
              "id": "hamburguesa-italiana",
              "nombre": "Hamburguesa italiana",
              "precio": 6500,
              "detalle": "Hamburguesa, palta y tomate"
            },
            {
              "id": "hamburguesa-roba-choclo",
              "nombre": "Hamburguesa roba choclo",
              "precio": 7000,
              "foto": "img/carta/hamburguesa-roba-choclo.webp",
              "detalle": "Hamburguesa, queso, lechuga, tocino, choclo y champiñón."
            },
            {
              "id": "hamburguesa-chamita",
              "nombre": "Hamburguesa chamita",
              "precio": 7000,
              "detalle": "Hamburguesa, tocino, huevo, lechuga y tomate"
            },
            {
              "id": "hamburguesa-vistima",
              "nombre": "Hamburguesa vístima",
              "precio": 7000,
              "foto": "img/carta/hamburguesa-vistima.webp",
              "detalle": "Hamburguesa, lechuga, tomate, palta, pepinillo y queso."
            },
            {
              "id": "hamburguesa-calila",
              "nombre": "Hamburguesa calila",
              "precio": 7000,
              "detalle": "Hamburguesa, cebolla, queso, tocino y papas hilo"
            },
            {
              "id": "hamburguesa-gran-luco",
              "nombre": "Hamburguesa gran luco",
              "precio": 8500,
              "detalle": "Doble hamburguesa, doble queso y papas hilo."
            },
            {
              "id": "terrible-kaos",
              "nombre": "Terrible Kaos",
              "precio": 12500,
              "foto": "img/carta/terrible-kaos.webp",
              "destacado": true
            },
            {
              "id": "hamburguesa-mojojojo",
              "nombre": "Hamburguesa mojojojo",
              "precio": 8500,
              "detalle": "Hamburguesa casera, lechuga, tomate, aros de cebolla, tocino y bastones de queso."
            }
          ]
        },
        {
          "id": "lomito",
          "nombre": "Lomito",
          "productos": [
            {
              "id": "lomito-italiano",
              "nombre": "Lomito italiano",
              "precio": 6500,
              "detalle": "Carne de lomito, palta y tomate"
            },
            {
              "id": "lomito-roba-choclo",
              "nombre": "Lomito roba choclo",
              "precio": 7000,
              "detalle": "Carne de lomito, queso, lechuga, tocino, choclo y champiñón."
            },
            {
              "id": "lomito-chamita",
              "nombre": "Lomito chamita",
              "precio": 7000,
              "detalle": "Carne de lomito, huevo, tocino, lechuga y tomate"
            },
            {
              "id": "lomito-vistima",
              "nombre": "Lomito vístima",
              "precio": 7000,
              "detalle": "Carne de lomito, lechuga, palta, tomate, pepinillo y queso"
            },
            {
              "id": "lomito-calila",
              "nombre": "Lomito calila",
              "precio": 7000,
              "detalle": "Carne de lomito, queso, tocino, cebolla y papas hilo"
            },
            {
              "id": "lomito-barros-luco",
              "nombre": "Lomito barros luco",
              "precio": 5000,
              "detalle": "Carne de lomito y queso"
            },
            {
              "id": "lomito-chacarero",
              "nombre": "Lomito chacarero",
              "precio": 7000,
              "detalle": "Carne de lomito, porotos verdes, tomate y ají verde."
            },
            {
              "id": "lomito-mojojojo",
              "nombre": "Lomito mojojojo",
              "precio": 8000
            }
          ]
        }
      ]
    },
    {
      "nombre": "Completos y As",
      "categorias": [
        {
          "id": "completos",
          "nombre": "Completos",
          "productos": [
            {
              "id": "italiano",
              "nombre": "Italiano",
              "precio": 2500,
              "foto": "img/carta/italiano.webp",
              "detalle": "Hot dog con vienesa sureña, palta y tomate."
            },
            {
              "id": "completo",
              "nombre": "Completo",
              "precio": 3000,
              "foto": "img/carta/completo.webp",
              "detalle": "Hot dog con vienesa sureña, tomate, palta y chucrut."
            },
            {
              "id": "dinamico",
              "nombre": "Dinámico",
              "precio": 3500,
              "detalle": "Vienesa sureña, palta, tomate, chucrut y salsa americana."
            },
            {
              "id": "papapleto",
              "nombre": "Papapleto",
              "precio": 2500,
              "foto": "img/carta/papapleto.webp",
              "detalle": "Papas fritas, palta y tomate."
            },
            {
              "id": "champipleto",
              "nombre": "Champipleto",
              "precio": 3500,
              "detalle": "Champiñón, palta y tomate."
            }
          ]
        },
        {
          "id": "as",
          "nombre": "As",
          "productos": [
            {
              "id": "as-mechada-italiano",
              "nombre": "As mechada italiano",
              "precio": 4500,
              "detalle": "Carne mechada, tomate y palta"
            },
            {
              "id": "as-mechada-completo",
              "nombre": "As mechada completo",
              "precio": 4500,
              "detalle": "Carne mechada, tomate, palta y chucrut"
            },
            {
              "id": "as-churrasco-italiano",
              "nombre": "As churrasco italiano",
              "precio": 4500,
              "detalle": "Carne de churrasco, tomate y palta"
            },
            {
              "id": "as-churrasco-completo",
              "nombre": "As churrasco completo",
              "precio": 4500,
              "detalle": "Carne de churrasco, palta, tomate y chucrut."
            },
            {
              "id": "as-italiano-papas-bebida-mini",
              "nombre": "As italiano + papas + bebida mini",
              "precio": 6000
            },
            {
              "id": "as-completo-papas-bebida-mini",
              "nombre": "As completo + papas + bebida mini",
              "precio": 6500
            },
            {
              "id": "as-luco",
              "nombre": "As luco",
              "precio": 4000
            }
          ]
        }
      ]
    },
    {
      "nombre": "Arma tu...",
      "categorias": [
        {
          "id": "arma-tu",
          "nombre": "Arma tu...",
          "productos": [
            {
              "id": "arma-tu-sandwich",
              "nombre": "Arma tu sándwich",
              "precio": 7500,
              "detalle": "Elige tu proteína, hasta 4 ingredientes y hasta 2 salsas.",
              "personalizar": [
                "arma-proteina",
                "arma-ingredientes",
                "arma-salsas"
              ]
            },
            {
              "id": "arma-tu-completo",
              "nombre": "Arma tu completo",
              "precio": 5000,
              "detalle": "Elige hasta 4 ingredientes y hasta 2 salsas.",
              "personalizar": [
                "arma-ingredientes",
                "arma-salsas"
              ]
            },
            {
              "id": "arma-tu-as",
              "nombre": "Arma tu as",
              "precio": 5500,
              "detalle": "Elige tu proteína, hasta 4 ingredientes y hasta 2 salsas.",
              "personalizar": [
                "arma-proteina-as",
                "arma-ingredientes",
                "arma-salsas"
              ]
            },
            {
              "id": "arma-tu-fajita",
              "nombre": "Arma tu fajita",
              "precio": 7000,
              "detalle": "Elige tu proteína, hasta 4 ingredientes y hasta 2 salsas.",
              "personalizar": [
                "arma-proteina",
                "arma-ingredientes",
                "arma-salsas"
              ]
            }
          ]
        }
      ]
    },
    {
      "nombre": "Papas fritas",
      "categorias": [
        {
          "id": "papas-fritas",
          "nombre": "Papas fritas",
          "productos": [
            {
              "id": "papas-fritas-medianas",
              "nombre": "Papas fritas medianas",
              "precio": 3500
            },
            {
              "id": "papas-fritas-grandes",
              "nombre": "Papas fritas grandes",
              "precio": 4500
            },
            {
              "id": "salchipapas-medianas",
              "nombre": "Salchipapas medianas",
              "precio": 4000,
              "foto": "img/carta/salchipapas-medianas.webp"
            },
            {
              "id": "salchipapas-grandes",
              "nombre": "Salchipapas grandes",
              "precio": 5000,
              "foto": "img/carta/salchipapas-grandes.webp"
            },
            {
              "id": "papas-cheddar-con-tocino-medianas",
              "nombre": "Papas cheddar con tocino medianas",
              "precio": 4500,
              "foto": "img/carta/papas-cheddar-con-tocino-medianas.webp",
              "destacado": true
            },
            {
              "id": "papas-cheddar-con-tocino-grandes",
              "nombre": "Papas cheddar con tocino grandes",
              "precio": 6000
            },
            {
              "id": "papas-con-champinon-choclo-y-salsa-grandes",
              "nombre": "Papas con champiñón, choclo y salsa grandes",
              "precio": 6000,
              "detalle": "Papas fritas naturales, champiñones naturales, choclo y salsa de ciboulette."
            },
            {
              "id": "papas-con-champinon-choclo-y-salsa-medianas",
              "nombre": "Papas con champiñón, choclo y salsa medianas",
              "precio": 4500,
              "foto": "img/carta/papas-con-champinon-choclo-y-salsa-medianas.webp",
              "detalle": "Papas fritas naturales, champiñones naturales, choclo y salsa de ciboulette."
            },
            {
              "id": "papas-fritas-chicas",
              "nombre": "Papas fritas chicas",
              "precio": 2000
            }
          ]
        }
      ]
    },
    {
      "nombre": "Chorrillanas",
      "categorias": [
        {
          "id": "chorrillanas",
          "nombre": "Chorrillanas",
          "productos": [
            {
              "id": "chorrillana-2-personas",
              "nombre": "Chorrillana 2 personas",
              "precio": 12000,
              "foto": "img/carta/chorrillana-2-personas.webp",
              "detalle": "Papas fritas, longaniza, vienesa, cebolla, churrasco y huevo."
            },
            {
              "id": "chorrillana-4-personas",
              "nombre": "Chorrillana 4 personas",
              "precio": 17000,
              "detalle": "Papas fritas, longaniza, vienesa, cebolla, churrasco y huevo."
            },
            {
              "id": "chorrillana-6-personas",
              "nombre": "Chorrillana 6 personas",
              "precio": 25000,
              "foto": "img/carta/chorrillana-2-personas.webp",
              "detalle": "Papas fritas, longaniza, vienesa, cebolla, churrasco y huevo."
            }
          ]
        }
      ]
    },
    {
      "nombre": "Para picar",
      "categorias": [
        {
          "id": "hand-roll",
          "nombre": "Hand roll",
          "productos": [
            {
              "id": "hand-roll-de-pollo",
              "nombre": "Hand roll de pollo",
              "precio": 3500,
              "foto": "img/carta/hand-roll-de-pollo.webp",
              "detalle": "Hand roll de pollo, queso crema y cebollín en panko."
            },
            {
              "id": "hand-roll-de-camaron",
              "nombre": "Hand roll de camarón",
              "precio": 3500,
              "foto": "img/carta/hand-roll-de-camaron.webp",
              "detalle": "Hand roll de camarón, queso crema y cebollín en panko."
            }
          ]
        },
        {
          "id": "empanadas",
          "nombre": "Empanadas",
          "productos": [
            {
              "id": "empanada-de-queso",
              "nombre": "Empanada de queso",
              "precio": 2500
            },
            {
              "id": "empanada-de-camaron-y-queso",
              "nombre": "Empanada de camarón y queso",
              "precio": 3500
            },
            {
              "id": "empanada-de-pollo-y-queso",
              "nombre": "Empanada de pollo y queso",
              "precio": 3000
            },
            {
              "id": "empanada-de-mechada-y-queso",
              "nombre": "Empanada de mechada y queso",
              "precio": 3500
            },
            {
              "id": "mini-empanadas-gyozas",
              "nombre": "Mini empanadas gyozas",
              "precio": 3000,
              "detalle": "12 mini empanaditas rellenas de verduras, con salsa de soya o teriyaki.",
              "opciones": [
                "Salsa de soya",
                "Salsa teriyaki"
              ]
            }
          ]
        },
        {
          "id": "ensaladas",
          "nombre": "Ensaladas",
          "productos": [
            {
              "id": "ensalada-kaos",
              "nombre": "Ensalada Kaos",
              "precio": 6000,
              "foto": "img/carta/ensalada-kaos.webp"
            },
            {
              "id": "ensalada-cesar",
              "nombre": "Ensalada césar",
              "precio": 5000,
              "detalle": "Lechuga, pollo a la plancha, crutones, queso parmesano y salsa césar o vinagreta.",
              "opciones": [
                "Salsa césar",
                "Vinagreta"
              ]
            }
          ]
        },
        {
          "id": "agregados",
          "nombre": "Agregados",
          "productos": [
            {
              "id": "arrollados-primavera-5-unidades",
              "nombre": "Arrollados primavera (5 unidades)",
              "precio": 3000,
              "detalle": "5 arrollados primavera con salsa de soya o teriyaki.",
              "opciones": [
                "Salsa de soya",
                "Salsa teriyaki"
              ]
            },
            {
              "id": "arrollados-de-jamon-y-queso-5-unidades",
              "nombre": "Arrollados de jamón y queso (5 unidades)",
              "precio": 3500,
              "detalle": "5 arrollados de jamón y queso."
            },
            {
              "id": "bastones-de-queso-6-unidades",
              "nombre": "Bastones de queso (6 unidades)",
              "precio": 3500,
              "detalle": "6 bastones de queso."
            }
          ]
        }
      ]
    },
    {
      "nombre": "Promos con lata",
      "categorias": [
        {
          "id": "promos-lata",
          "nombre": "Promociones con lata",
          "productos": [
            {
              "id": "as-mechada-completo-bebida-en-lata",
              "nombre": "As mechada completo + bebida en lata",
              "precio": 6500
            },
            {
              "id": "as-churrasco-italiano-bebida-en-lata",
              "nombre": "As churrasco italiano + bebida en lata",
              "precio": 6500
            },
            {
              "id": "as-churrasco-completo-bebida-en-lata",
              "nombre": "As churrasco completo + bebida en lata",
              "precio": 6500
            },
            {
              "id": "completo-bebida-en-lata",
              "nombre": "Completo + bebida en lata",
              "precio": 5000
            },
            {
              "id": "italiano-bebida-en-lata",
              "nombre": "Italiano + bebida en lata",
              "precio": 4500
            },
            {
              "id": "italiano-papas-bebida-en-lata",
              "nombre": "Italiano + papas + bebida en lata",
              "precio": 6500
            },
            {
              "id": "completo-papas-bebida-en-lata",
              "nombre": "Completo + papas + bebida en lata",
              "precio": 6500
            }
          ]
        }
      ]
    },
    {
      "nombre": "Bebidas",
      "categorias": [
        {
          "id": "bebidas-agua",
          "nombre": "Agua",
          "productos": [
            {
              "id": "agua-con-gas",
              "nombre": "Agua con gas",
              "precio": 1500,
              "foto": "img/carta/agua-con-gas.webp"
            },
            {
              "id": "agua-sin-gas",
              "nombre": "Agua sin gas",
              "precio": 1500,
              "foto": "img/carta/agua-sin-gas.webp"
            }
          ]
        },
        {
          "id": "bebidas-grandes",
          "nombre": "Grandes",
          "productos": [
            {
              "id": "coca-cola-1-5-l",
              "nombre": "Coca-Cola 1,5 L",
              "precio": 3000
            },
            {
              "id": "pepsi-2-l",
              "nombre": "Pepsi 2 L",
              "precio": 3000
            },
            {
              "id": "kem-pina-2-l",
              "nombre": "Kem Piña 2 L",
              "precio": 3000
            },
            {
              "id": "limon-soda-2-l",
              "nombre": "Limón Soda 2 L",
              "precio": 3000
            }
          ]
        },
        {
          "id": "bebidas-lata",
          "nombre": "Lata",
          "productos": [
            {
              "id": "kem-350-ml",
              "nombre": "Kem 350 ml",
              "precio": 1500
            },
            {
              "id": "limon-soda-350-ml",
              "nombre": "Limón Soda 350 ml",
              "precio": 1500
            },
            {
              "id": "pepsi-350-ml",
              "nombre": "Pepsi 350 ml",
              "precio": 1500
            }
          ]
        },
        {
          "id": "bebidas-mini",
          "nombre": "Mini",
          "productos": [
            {
              "id": "kem-250-ml",
              "nombre": "Kem 250 ml",
              "precio": 1000
            },
            {
              "id": "limon-soda-250-ml",
              "nombre": "Limón Soda 250 ml",
              "precio": 1000
            },
            {
              "id": "pepsi-250-ml",
              "nombre": "Pepsi 250 ml",
              "precio": 1000
            },
            {
              "id": "bilz-250-ml",
              "nombre": "Bilz 250 ml",
              "precio": 1000
            },
            {
              "id": "coca-cola-250-ml",
              "nombre": "Coca-Cola 250 ml",
              "precio": 1000
            },
            {
              "id": "fanta-express",
              "nombre": "Fanta express",
              "precio": 1000
            },
            {
              "id": "coca-cola-zero-250-ml",
              "nombre": "Coca-Cola Zero 250 ml",
              "precio": 1000
            },
            {
              "id": "fanta-220-ml",
              "nombre": "Fanta 220 ml",
              "precio": 1000
            },
            {
              "id": "coca-cola-express",
              "nombre": "Coca-Cola express",
              "precio": 1000
            },
            {
              "id": "sprite-express",
              "nombre": "Sprite express",
              "precio": 1000
            },
            {
              "id": "sprite-220-ml",
              "nombre": "Sprite 220 ml",
              "precio": 1000
            }
          ]
        },
        {
          "id": "te-cafe",
          "nombre": "Té o café",
          "productos": [
            {
              "id": "te",
              "nombre": "Té",
              "precio": 1000
            },
            {
              "id": "cafe",
              "nombre": "Café",
              "precio": 1000
            }
          ]
        }
      ]
    },
    {
      "nombre": "Jugos y batidos",
      "categorias": [
        {
          "id": "jugos-naturales",
          "nombre": "Jugos naturales",
          "productos": [
            {
              "id": "jugo-natural-de-pina",
              "nombre": "Jugo natural de piña",
              "precio": 3000
            },
            {
              "id": "jugo-natural-de-maracuya",
              "nombre": "Jugo natural de maracuyá",
              "precio": 3500
            },
            {
              "id": "jugo-natural-de-frambuesa",
              "nombre": "Jugo natural de frambuesa",
              "precio": 3000
            },
            {
              "id": "jugo-natural-de-melon",
              "nombre": "Jugo natural de melón",
              "precio": 3000
            },
            {
              "id": "jugo-natural-de-frutilla",
              "nombre": "Jugo natural de frutilla",
              "precio": 3000
            },
            {
              "id": "jugo-natural-de-mango",
              "nombre": "Jugo natural de mango",
              "precio": 3000,
              "foto": "img/carta/jugo-natural-de-mango.webp"
            },
            {
              "id": "jugo-natural-de-papaya",
              "nombre": "Jugo natural de papaya",
              "precio": 3000
            },
            {
              "id": "jugo-natural-de-kiwi",
              "nombre": "Jugo natural de kiwi",
              "precio": 3000
            },
            {
              "id": "limonada",
              "nombre": "Limonada",
              "precio": 3000
            },
            {
              "id": "jugo-natural-de-manzana",
              "nombre": "Jugo natural de manzana",
              "precio": 3000
            },
            {
              "id": "jugo-natural-de-mora",
              "nombre": "Jugo natural de mora",
              "precio": 3000
            },
            {
              "id": "jugo-natural-de-damasco",
              "nombre": "Jugo natural de damasco",
              "precio": 3000
            },
            {
              "id": "jugo-natural-de-ciruela",
              "nombre": "Jugo natural de ciruela",
              "precio": 3000
            }
          ]
        },
        {
          "id": "jugos-combinaciones",
          "nombre": "Combinaciones",
          "productos": [
            {
              "id": "limon-menta-y-jengibre",
              "nombre": "Limón, menta y jengibre",
              "precio": 3500
            },
            {
              "id": "jugo-de-berries",
              "nombre": "Jugo de berries",
              "precio": 3500
            }
          ]
        },
        {
          "id": "batidos",
          "nombre": "Batidos",
          "productos": [
            {
              "id": "leche-con-sandia",
              "nombre": "Leche con sandía",
              "precio": 3500
            },
            {
              "id": "leche-con-pina",
              "nombre": "Leche con piña",
              "precio": 3500
            },
            {
              "id": "leche-con-chirimoya",
              "nombre": "Leche con chirimoya",
              "precio": 3500
            },
            {
              "id": "leche-con-maracuya",
              "nombre": "Leche con maracuyá",
              "precio": 4000
            },
            {
              "id": "leche-con-frambuesa",
              "nombre": "Leche con frambuesa",
              "precio": 3500
            },
            {
              "id": "leche-con-melon",
              "nombre": "Leche con melón",
              "precio": 3500
            },
            {
              "id": "leche-con-frutilla",
              "nombre": "Leche con frutilla",
              "precio": 3500
            },
            {
              "id": "leche-con-arandano",
              "nombre": "Leche con arándano",
              "precio": 3500
            },
            {
              "id": "leche-con-mango",
              "nombre": "Leche con mango",
              "precio": 3500
            },
            {
              "id": "leche-con-naranja",
              "nombre": "Leche con naranja",
              "precio": 3500
            },
            {
              "id": "leche-con-durazno",
              "nombre": "Leche con durazno",
              "precio": 3500
            },
            {
              "id": "leche-con-cereza",
              "nombre": "Leche con cereza",
              "precio": 3500
            },
            {
              "id": "leche-con-platano",
              "nombre": "Leche con plátano",
              "precio": 3500
            }
          ]
        },
        {
          "id": "milkshakes",
          "nombre": "Milk shake",
          "productos": [
            {
              "id": "milkshake-de-maracuya",
              "nombre": "Milkshake de maracuyá",
              "precio": 4500
            },
            {
              "id": "milkshake-de-frambuesa",
              "nombre": "Milkshake de frambuesa",
              "precio": 4000
            },
            {
              "id": "milkshake-de-melon",
              "nombre": "Milkshake de melón",
              "precio": 4000
            },
            {
              "id": "milkshake-de-frutilla",
              "nombre": "Milkshake de frutilla",
              "precio": 4000
            },
            {
              "id": "milkshake-de-arandano",
              "nombre": "Milkshake de arándano",
              "precio": 4000
            },
            {
              "id": "milkshake-de-mango",
              "nombre": "Milkshake de mango",
              "precio": 4000
            },
            {
              "id": "milkshake-de-pina",
              "nombre": "Milkshake de piña",
              "precio": 4000
            },
            {
              "id": "milkshake-de-oreo",
              "nombre": "Milkshake de Oreo",
              "precio": 4000
            },
            {
              "id": "milkshake-de-berries",
              "nombre": "Milkshake de berries",
              "precio": 4500
            }
          ]
        },
        {
          "id": "cafe-helado",
          "nombre": "Café helado",
          "productos": [
            {
              "id": "cafe-helado",
              "nombre": "Café helado",
              "precio": 4000
            }
          ]
        }
      ]
    },
    {
      "nombre": "Waffles y postres",
      "categorias": [
        {
          "id": "waffles",
          "nombre": "Waffles y postres",
          "productos": [
            {
              "id": "arma-tu-waffle",
              "nombre": "Arma tu waffle",
              "precio": 4500,
              "detalle": "Un topping, una salsa y una fruta, que puede ser plátano o frutilla."
            },
            {
              "id": "waffle-kaos",
              "nombre": "Waffle Kaos",
              "precio": 8000
            },
            {
              "id": "trozo-de-sandia",
              "nombre": "Trozo de sandía",
              "precio": 1000
            }
          ]
        }
      ]
    }
  ],
  "cupones": [],
  "personalizacion": [
    {
      "id": "arma-proteina",
      "nombre": "Proteína",
      "tipo": "elegir",
      "min": 1,
      "max": 1,
      "opciones": [
        {
          "id": "carne-mechada",
          "nombre": "Carne mechada",
          "precio": 0
        },
        {
          "id": "pollo",
          "nombre": "Pollo",
          "precio": 0
        },
        {
          "id": "churrasco",
          "nombre": "Churrasco",
          "precio": 0
        },
        {
          "id": "hamburguesa",
          "nombre": "Hamburguesa",
          "precio": 0
        },
        {
          "id": "lomito",
          "nombre": "Lomito",
          "precio": 0
        }
      ]
    },
    {
      "id": "arma-proteina-as",
      "nombre": "Proteína",
      "tipo": "elegir",
      "min": 1,
      "max": 1,
      "opciones": [
        {
          "id": "carne-mechada",
          "nombre": "Carne mechada",
          "precio": 0
        },
        {
          "id": "churrasco",
          "nombre": "Churrasco",
          "precio": 0
        }
      ]
    },
    {
      "id": "arma-ingredientes",
      "nombre": "Ingredientes",
      "tipo": "elegir",
      "min": 1,
      "max": 4,
      "opciones": [
        {
          "id": "lechuga",
          "nombre": "Lechuga",
          "precio": 0
        },
        {
          "id": "palta",
          "nombre": "Palta",
          "precio": 0
        },
        {
          "id": "tocino",
          "nombre": "Tocino",
          "precio": 0
        },
        {
          "id": "cebolla",
          "nombre": "Cebolla",
          "precio": 0
        },
        {
          "id": "queso",
          "nombre": "Queso",
          "precio": 0
        },
        {
          "id": "champinon",
          "nombre": "Champiñón",
          "precio": 0
        },
        {
          "id": "huevo",
          "nombre": "Huevo",
          "precio": 0
        },
        {
          "id": "tomate",
          "nombre": "Tomate",
          "precio": 0
        },
        {
          "id": "pepinillo",
          "nombre": "Pepinillo",
          "precio": 0
        },
        {
          "id": "porotos-verdes",
          "nombre": "Porotos verdes",
          "precio": 0
        },
        {
          "id": "chucrut",
          "nombre": "Chucrut",
          "precio": 0
        },
        {
          "id": "salsa-americana",
          "nombre": "Salsa americana",
          "precio": 0
        },
        {
          "id": "choclo",
          "nombre": "Choclo",
          "precio": 0
        },
        {
          "id": "queso-cheddar",
          "nombre": "Queso cheddar",
          "precio": 0
        }
      ]
    },
    {
      "id": "arma-salsas",
      "nombre": "Salsas",
      "tipo": "elegir",
      "min": 0,
      "max": 2,
      "opciones": [
        {
          "id": "salsa-bbq",
          "nombre": "Salsa BBQ",
          "precio": 0
        },
        {
          "id": "salsa-cheddar",
          "nombre": "Salsa cheddar",
          "precio": 0
        },
        {
          "id": "salsa-de-aceituna",
          "nombre": "Salsa de aceituna",
          "precio": 0
        },
        {
          "id": "salsa-de-ajo",
          "nombre": "Salsa de ajo",
          "precio": 0
        },
        {
          "id": "salsa-de-ciboulette",
          "nombre": "Salsa de ciboulette",
          "precio": 0
        },
        {
          "id": "salsa-verde",
          "nombre": "Salsa verde",
          "precio": 0
        },
        {
          "id": "ketchup",
          "nombre": "Ketchup",
          "precio": 0
        },
        {
          "id": "mostaza",
          "nombre": "Mostaza",
          "precio": 0
        },
        {
          "id": "aji",
          "nombre": "Ají",
          "precio": 0
        },
        {
          "id": "mayo-casera",
          "nombre": "Mayo casera",
          "precio": 0
        },
        {
          "id": "salsa-de-merken",
          "nombre": "Salsa de merkén",
          "precio": 0
        },
        {
          "id": "mayo-normal",
          "nombre": "Mayo normal",
          "precio": 0
        }
      ]
    }
  ]
};
