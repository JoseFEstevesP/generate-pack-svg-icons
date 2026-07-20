import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import { fileURLToPath } from 'url';
import { createSVGPack } from './create.js';
import { getIconFolders, getSVGFiles } from '../utils/fs-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

export async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ['pack', 'output'],
    boolean: ['help', 'version', 'no-optimize', 'json', 'watch', 'preview'],
    alias: {
      p: 'pack',
      o: 'output',
      h: 'help',
      v: 'version',
      w: 'watch',
    },
  });

  const iconPath = path.join(ROOT_DIR, 'icon');

  if (!fs.existsSync(iconPath) || !fs.lstatSync(iconPath).isDirectory()) {
    console.error('No se encontró la carpeta "icon" en la raíz del proyecto.');
    process.exit(1);
  }

  const options = {
    packName: argv.pack || null,
    outputDir: argv.output || null,
    optimize: argv['no-optimize'] ? false : true,
    jsonOutput: argv.json || false,
    watch: argv.watch || false,
    preview: argv.preview || false,
  };

  if (options.packName) {
    const folders = getIconFolders();
    const match = folders.find(f => f.name === options.packName);
    if (!match) {
      console.error(`No se encontró un pack llamado "${options.packName}".`);
      console.error('Packs disponibles:', folders.map(f => `"${f.name}"`).join(', '));
      process.exit(1);
    }
    options.packPath = match.path;
    options.svgFiles = getSVGFiles(match.path);

    if (options.svgFiles.length === 0) {
      console.error(`El pack "${options.packName}" no contiene archivos SVG.`);
      process.exit(1);
    }
  }

  await createSVGPack(options);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
}
