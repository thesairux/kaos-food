"""Crea las copias livianas de las fotos de la carta (img/carta/600/), las que usan las tarjetas.

Uso, desde la carpeta del proyecto:  python3 herramientas/miniaturas.py
Necesita Pillow (pip install pillow). Solo rehace las copias que faltan o que quedaron más viejas que su foto.
"""
import os
from PIL import Image

ANCHO = 600
CARPETA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "img", "carta")
DESTINO = os.path.join(CARPETA, str(ANCHO))

os.makedirs(DESTINO, exist_ok=True)
hechas = 0
for nombre in sorted(os.listdir(CARPETA)):
    if not nombre.endswith(".webp"):
        continue
    origen, copia = os.path.join(CARPETA, nombre), os.path.join(DESTINO, nombre)
    if os.path.exists(copia) and os.path.getmtime(copia) >= os.path.getmtime(origen):
        continue
    with Image.open(origen) as foto:
        if foto.width > ANCHO:
            foto = foto.resize((ANCHO, round(foto.height * ANCHO / foto.width)), Image.LANCZOS)
        foto.save(copia, "WEBP", quality=80, method=6)
    hechas += 1
# copias de fotos que ya no están
for nombre in os.listdir(DESTINO):
    if not os.path.exists(os.path.join(CARPETA, nombre)):
        os.remove(os.path.join(DESTINO, nombre))
print(hechas, "copias nuevas en img/carta/" + str(ANCHO))
