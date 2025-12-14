#!/bin/bash
# Script para empaquetar HelloWorld Launcher en ZIP
# Uso: ./package.sh

echo "================================================"
echo "  HelloWorld Launcher - Empaquetado en ZIP"
echo "================================================"
echo ""

# Leer version desde version.json
version_file="version.json"
if [[ -f "$version_file" ]]; then
    version=$(jq -r '.version' "$version_file")
    echo "Versión detectada: v$version"
else
    echo "No se encontró version.json"
    read -p "Ingresa la versión manualmente (ej: 1.0.0): " version
fi

echo ""

# Compilar con PyInstaller
echo "Compilando con PyInstaller..."
pyinstaller launcher.spec

if [[ $? -ne 0 ]]; then
    echo "Error al compilar"
    exit 1
fi

echo "Compilación exitosa"
echo ""

# Crear nombre del ZIP
zip_name="HelloWorld-Launcher-v$version.zip"

# Eliminar ZIP anterior si existe
if [[ -f "$zip_name" ]]; then
    echo "Eliminando ZIP anterior..."
    rm -f "$zip_name"
fi

# Crear ZIP
echo "Creando $zip_name..."
sleep 2
zip -r "$zip_name" dist/*

if [[ -f "$zip_name" ]]; then
    zip_size=$(du -m "$zip_name" | cut -f1)
    echo "ZIP creado exitosamente"
    echo "  Tamaño: ${zip_size} MB"
    echo "  Ubicación: $(pwd)/$zip_name"
else
    echo "Error al crear ZIP"
    exit 1
fi

echo ""
echo "================================================"
echo "  Empaquetado completado"
echo "================================================"
echo ""
echo "Próximos pasos:"
echo "1. Sube $zip_name a GitHub Releases"
echo "2. Crea un release con tag v$version"
echo "3. Distribuye a tus usuarios!"
echo ""
