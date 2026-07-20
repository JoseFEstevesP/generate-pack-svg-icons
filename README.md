# Generador de Paquetes de Iconos SVG

Herramienta para optimizar y combinar múltiples archivos SVG en un único SVG sprite.

## Características

- Optimización automática con SVGO
- Generación de sprite SVG a partir de una carpeta de iconos
- CLI interactiva (Inquirer) y por argumentos
- Procesamiento paralelo para packs grandes
- Modo observador (watch) para regeneración automática
- Preview HTML de todos los iconos
- Soporte para subdirectorios dentro de packs
- Historial de rutas de salida
- Salida JSON machine-readable

## Requisitos

- Node.js 18+
- pnpm (recomendado) o npm

## Instalación

```sh
pnpm install
```

## Uso

### Modo interactivo

```sh
pnpm generate
```

### Modo CLI directo

```sh
pnpm generate --pack adminProject
pnpm generate --pack adminProject --output ../mi-proyecto/assets
pnpm generate --pack adminProject --no-optimize
pnpm generate --pack adminProject --preview
pnpm generate --pack adminProject --watch
pnpm generate --pack adminProject --json
```

### Opciones

| Opción | Alias | Descripción |
|--------|-------|-------------|
| `--pack <nombre>` | `-p` | Nombre del pack a generar |
| `--output <ruta>` | `-o` | Carpeta de salida |
| `--no-optimize` | | Deshabilitar optimización SVGO |
| `--preview` | | Generar preview HTML de los iconos |
| `--watch` | `-w` | Modo observador (regenera al detectar cambios) |
| `--json` | | Salida en formato JSON |
| `--help` | `-h` | Mostrar ayuda |
| `--version` | `-v` | Mostrar versión |

## Estructura

```
generate-pack-svg-icons/
├── src/
│   ├── index.js           # Entry point
│   ├── core/
│   │   ├── generate.js    # CLI argument parsing y orquestación
│   │   ├── create.js      # Generación del sprite
│   │   └── svg-processor.js  # Procesamiento y optimización SVG
│   ├── cli/
│   │   ├── banner.js      # Banner de bienvenida
│   │   └── prompts.js     # Prompts interactivos (Inquirer)
│   └── utils/
│       └── fs-utils.js    # Operaciones de sistema de archivos
├── icon/                  # Carpeta con los packs de iconos (ignorada en git)
├── output/                # Sprites generados (ignorada en git)
├── tests/
├── svgo.config.js
├── eslint.config.js
└── package.json
```

## Scripts

```sh
pnpm generate    # Generar pack SVG
pnpm test        # Ejecutar tests
pnpm lint        # Linter
pnpm format      # Formatear código
```

## Licencia

MIT
