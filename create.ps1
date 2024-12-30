param (
    [string]$inputFolder
)

# Solicitar la ruta del archivo de salida
$outputDirectory = Read-Host "Ingrese la ruta completa donde se guardará el archivo (sin incluir el nombre del archivo)"

# Construir la ruta del archivo de salida usando el nombre de la carpeta y la extensión .svg
$outputFile = Join-Path -Path $outputDirectory -ChildPath "$($inputFolder).svg"

# Verificar si el archivo ya existe y preguntar si desea reemplazarlo
if (Test-Path $outputFile) {
    $respuesta = Read-Host "El archivo ya existe. ¿Desea reemplazarlo? (s/n)"
    if ($respuesta -ne 's') {
        Write-Host "Operación cancelada."
        exit
    }
}

# Crear el archivo de salida y escribir el encabezado SVG
@"
<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg">
"@ | Out-File -FilePath $outputFile -Encoding utf8

# Reemplazar 'svg' con 'symbol', eliminar 'xmlns', y agregar 'id' en cada archivo SVG
Get-ChildItem -Path $inputFolder -Filter *.svg | ForEach-Object {
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
    $content = Get-Content -Path $_.FullName
    
    # Eliminar atributos width y height
    $content = $content -replace 'width="[^"]*"\s*|height="[^"]*"\s*', ''
    
    # Reemplazar xmlns y svg por symbol
    $content = $content -replace 'xmlns="http://www.w3.org/2000/svg"', ''
    $content = $content -replace '<svg', "<symbol id='$fileName'"
    $content = $content -replace '</svg>', '</symbol>'
    
    $content | Out-File -FilePath $outputFile -Append -Encoding utf8
}

# Escribir el cierre del archivo SVG
'</svg>' | Out-File -FilePath $outputFile -Append -Encoding utf8

Write-Host "El archivo SVG ha sido creado exitosamente en: $outputFile"
