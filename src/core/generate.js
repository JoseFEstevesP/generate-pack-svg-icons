import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSVGPack } from './create.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

export async function main() {
  const iconPath = path.join(ROOT_DIR, 'icon');

  if (!fs.existsSync(iconPath) || !fs.lstatSync(iconPath).isDirectory()) {
    console.error('❌ No se encontró la carpeta "icon" en la raíz del proyecto.');
    process.exit(1);
  }

  await createSVGPack();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
}
