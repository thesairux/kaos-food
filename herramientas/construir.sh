#!/bin/sh
# Arma la carpeta dist/ con lo que se publica en Cloudflare Pages.
# En Cloudflare: Build command «sh herramientas/construir.sh» y Build output directory «dist».
# Solo se copian los archivos de la página: los servidores (functions/ y lib/), las cuentas (privado/),
# las pruebas, las herramientas y el README no quedan a la vista de nadie.
set -e
rm -rf dist
mkdir -p dist
cp index.html admin.html carta.js favicon.ico robots.txt _headers site.webmanifest dist/
cp -r css js img dist/
if [ -d fotos ]; then cp -r fotos dist/; fi
echo "Listo: dist/ ($(find dist -type f | wc -l | tr -d ' ') archivos)"
