param (
    [string]$inputFolder
)

$outputFile = "$inputFolder.svg"

# Crear el archivo de salida y escribir el encabezado SVG
@"
<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg">
"@ | Out-File -FilePath $outputFile -Encoding utf8

# Reemplazar 'svg' con 'symbol', eliminar 'xmlns' y agregar 'id' en cada archivo SVG
Get-ChildItem -Path $inputFolder -Filter *.svg | ForEach-Object {
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
    $content = Get-Content -Path $_.FullName
    $content = $content -replace 'xmlns="http://www.w3.org/2000/svg"', ''
    $content = $content -replace '<svg', "<symbol id='$fileName'"
    $content = $content -replace '</svg>', '</symbol>'
    $content | Out-File -FilePath $outputFile -Append -Encoding utf8
}

# Escribir el cierre del archivo SVG
'</svg>' | Out-File -FilePath $outputFile -Append -Encoding utf8