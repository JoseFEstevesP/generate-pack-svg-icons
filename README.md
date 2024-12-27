# SVG Icons

Este proyecto permite optimizar y combinar archivos SVG en un solo archivo SVG utilizando scripts de PowerShell.

## Requisitos

- PowerShell
- Node.js
- npm

## Instalación

1. Clona el repositorio:

   ```sh
   git clone https://github.com/JoseFEstevesP/generate-pack-svg-icons.git
   cd generate-pack-svg-icons
   ```

2. Instala las dependencias del proyecto:
   ```sh
   npm install
   ```

## Uso

1. Coloca tus archivos SVG en una carpeta.

2. Ejecuta el script `generate` para optimizar y combinar los archivos SVG:

   ```sh
   npm run generate
   ```

3. El script te pedirá que ingreses el nombre de la carpeta que contiene los iconos SVG. Ingresa el nombre de la carpeta y presiona Enter.

4. El script optimizará los archivos SVG, los combinará en un solo archivo SVG y eliminará la carpeta temporal utilizada para la optimización.

## Scripts

### [generate.ps1](generate.ps1)

Este script realiza las siguientes acciones:

- Solicita al usuario el nombre de la carpeta que contiene los iconos SVG.
- Verifica si la carpeta existe.
- Crea una carpeta temporal para almacenar los archivos SVG optimizados.
- Optimiza los archivos SVG usando `svgo`.
- Ejecuta el script [create.ps1](create.ps1) con los archivos optimizados.
- Elimina la carpeta temporal después de que se haya ejecutado el comando `create`.

### [create.ps1](create.ps1)

Este script realiza las siguientes acciones:

- Toma un parámetro de entrada `$inputFolder` que es la carpeta que contiene los archivos SVG.
- Crea un archivo de salida con el nombre de la carpeta y la extensión `.svg`.
- Escribe el encabezado del archivo SVG en el archivo de salida.
- Para cada archivo SVG en la carpeta de entrada:
  - Obtiene el nombre del archivo sin la extensión.
  - Elimina el atributo `xmlns="http://www.w3.org/2000/svg"`.
  - Reemplaza `<svg` con `<symbol id='nombre_del_archivo'`.
  - Reemplaza `</svg>` con `</symbol>`.
  - Agrega el contenido modificado al archivo de salida.
- Escribe el cierre del archivo SVG en el archivo de salida.

## Agradecimientos

Este proyecto fue posible gracias a la ayuda de GitHub Copilot, una IA que generó los scripts utilizados en este proyecto. Además, el proyecto fue inspirado por un proyecto similar del desarrollador [ManzDev](https://github.com/ManzDev).
