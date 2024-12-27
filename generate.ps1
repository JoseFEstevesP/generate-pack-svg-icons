# Solicitar el nombre de la carpeta
$folderPath = Read-Host "Ingrese el nombre de la carpeta que contiene los iconos SVG"

# Verificar si la carpeta existe
if (-Not (Test-Path -Path $folderPath -PathType Container)) {
    Write-Host "La carpeta no existe. Por favor, intente de nuevo."
    exit
}

# Crear una carpeta temporal para los archivos optimizados
$tempFolderPath = ".\$folderPath-min"
New-Item -ItemType Directory -Path $tempFolderPath -Force

# Optimizar los archivos SVG (usando svgo, asegúrate de tenerlo instalado)
Get-ChildItem -Path $folderPath -Filter *.svg | ForEach-Object {
    $inputFile = $_.FullName
    $outputFile = "$tempFolderPath\$($_.Name)"
    svgo $inputFile -o $outputFile
}

# Ejecutar el script create con los archivos optimizados
.\create.ps1 -inputFolder $tempFolderPath

# Eliminar la carpeta temporal
Remove-Item -Path $tempFolderPath -Recurse -Force