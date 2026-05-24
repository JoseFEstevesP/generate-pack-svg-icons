# Generador de Paquetes de Iconos SVG

Este proyecto proporciona una herramienta poderosa para optimizar y combinar múltiples archivos SVG en un único archivo SVG sprite, utilizando scripts de PowerShell. Ideal para proyectos web que requieren una gestión eficiente de iconos.

## 🚀 Características Principales

- Optimización automática de archivos SVG
- Combinación de múltiples SVGs en un único sprite
- Proceso automatizado mediante scripts de PowerShell
- Compatibilidad con la gestión de paquetes npm
- Eliminación automática de archivos temporales
- Nombrado inteligente de símbolos SVG

## ⚙️ Requisitos Previos

- PowerShell 5.0 o superior
- Node.js (versión 14.0 o superior recomendada)
- npm o pnpm como gestor de paquetes

## 📦 Instalación

1. Clona el repositorio en tu máquina local:

   ```sh
   git clone https://github.com/JoseFEstevesP/generate-pack-svg-icons.git
   cd generate-pack-svg-icons
   ```

2. Instala las dependencias del proyecto:

   ```sh
   npm install
   # O si prefieres usar pnpm
   pnpm install
   ```

## 🛠️ Uso

### Preparación de Archivos

1. Crea una carpeta para tus iconos SVG (por ejemplo, `mis-iconos`)
2. Coloca todos tus archivos SVG en esta carpeta
3. Asegúrate de que los nombres de los archivos sean descriptivos, ya que se usarán como IDs en el sprite final

### Generación del Sprite

1. Ejecuta el script de generación:

   ```sh
   npm run generate
   # O con pnpm
   pnpm generate
   ```

2. Cuando se te solicite, ingresa el nombre de la carpeta que contiene tus iconos SVG
3. El script procesará automáticamente todos los archivos y generará el sprite

### Resultado

- Se creará un nuevo archivo SVG con el nombre de tu carpeta
- Todos los iconos estarán optimizados y combinados en este único archivo
- La carpeta temporal de procesamiento se eliminará automáticamente

## 🔧 Scripts del Proyecto

### 📄 generate.ps1

Este script principal maneja el flujo completo de generación:

- Interacción con el usuario para obtener la carpeta de entrada
- Validación de la existencia de la carpeta y archivos
- Creación y gestión de directorios temporales
- Optimización de SVGs mediante SVGO
- Coordinación con create.ps1 para la generación final
- Limpieza de archivos temporales

### 📄 create.ps1

Script especializado en la creación del sprite:

- Procesamiento de la carpeta de entrada
- Generación de la estructura del sprite SVG
- Manejo de símbolos y IDs únicos
- Escritura del archivo SVG final

## 📚 Estructura del Proyecto

```
generate-pack-svg-icons/
├── create.ps1         # Script de creación de sprite
├── generate.ps1       # Script principal de generación
├── package.json       # Configuración del proyecto
├── svgo.config.js     # Configuración de optimización SVG
└── README.md         # Documentación
```

## ⚡ Optimización

El proyecto utiliza SVGO para optimizar los archivos SVG, realizando las siguientes mejoras:

- Eliminación de metadatos innecesarios
- Minimización de código
- Optimización de paths
- Eliminación de elementos redundantes

## 🤝 Contribución

Las contribuciones son bienvenidas. Para contribuir:

1. Haz fork del proyecto
2. Crea una rama para tu característica (`git checkout -b feature/AmazingFeature`)
3. Realiza tus cambios
4. Commit tus cambios (`git commit -m 'Add: AmazingFeature'`)
5. Push a la rama (`git push origin feature/AmazingFeature`)
6. Abre un Pull Request

## 📝 Notas Importantes

- Asegúrate de que tus SVGs sean válidos antes de procesarlos
- Los nombres de los archivos deben ser únicos
- Evita caracteres especiales en los nombres de los archivos
- Recomendado para proyectos web que requieren múltiples iconos

## 🐛 Solución de Problemas

Si encuentras algún error, verifica:

1. Que los permisos de PowerShell estén correctamente configurados
2. Que todas las dependencias estén instaladas
3. Que los archivos SVG sean válidos
4. Que los nombres de archivo no contengan caracteres especiales

## 📄 Licencia

Este proyecto está licenciado bajo los términos de la licencia MIT.