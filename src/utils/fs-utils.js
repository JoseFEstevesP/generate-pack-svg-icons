import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CONFIG_FILE = path.join(ROOT_DIR, 'svg-packer-config.json');

export function getRootDir() {
  return ROOT_DIR;
}

export function getConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return { last_used: '', output_history: ['output'] };
  }
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);
    if (!config.output_history) config.output_history = ['output'];
    return config;
  } catch {
    return { last_used: '', output_history: ['output'] };
  }
}

export function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

export function toRelativePath(absPath) {
  return path.relative(ROOT_DIR, absPath);
}

export function addToOutputHistory(dir) {
  const config = getConfig();
  const history = config.output_history || [];
  const entry = path.isAbsolute(dir) ? toRelativePath(dir) : dir;
  const newHistory = [entry, ...history.filter(d => {
    const normalized = path.isAbsolute(d) ? toRelativePath(d) : d;
    return normalized !== entry;
  })].slice(0, 5);

  config.output_history = newHistory;
  saveConfig(config);
}

export function getIconDir() {
  return path.join(ROOT_DIR, 'icon');
}

export function getDefaultOutputDir() {
  const dir = path.join(ROOT_DIR, 'output');
  ensureDirectoryExists(dir);
  return dir;
}

export function getIconFolders() {
  const iconDir = getIconDir();
  if (!fs.existsSync(iconDir)) return [];
  return fs.readdirSync(iconDir, { withFileTypes: true })
    .filter(item => item.isDirectory())
    .map(dir => ({
      name: dir.name,
      path: path.join(iconDir, dir.name),
    }));
}

export function getSVGFiles(folderPath, recursive = false) {
  if (!fs.existsSync(folderPath)) return [];
  if (!recursive) {
    return fs.readdirSync(folderPath)
      .filter(file => file.toLowerCase().endsWith('.svg'))
      .sort();
  }
  const svgs = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.toLowerCase().endsWith('.svg')) {
        svgs.push(path.relative(folderPath, fullPath));
      }
    }
  }
  walk(folderPath);
  return svgs.sort();
}

export function readSVGFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getFileSizeInBytes(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  return fs.statSync(filePath).size;
}
