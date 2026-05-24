import { main } from './core/generate.js';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  SVG Packer - Generador de Paquetes SVG

  Uso:
    npm run generate        Generar pack desde el menú interactivo

  Opciones:
    --help, -h             Mostrar esta ayuda
    --version, -v          Mostrar versión

  Flujo:
    1. Selecciona un pack de iconos de la carpeta ./icon/
    2. Los SVG se optimizan automáticamente con SVGO
    3. El sprite se genera en ./output/{nombre-del-pack}-pack.svg
  `);
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  const fs = await import('fs');
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  console.log(`SVG Packer v${packageJson.version}`);
  process.exit(0);
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
