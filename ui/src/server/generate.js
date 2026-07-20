import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'
import { processSVGFile, buildSprite } from '../../../src/core/svg-processor.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..')

export function getConfig() {
  const configPath = path.join(ROOT_DIR, 'svg-packer-config.json')
  if (!fs.existsSync(configPath)) {
    return { last_used: '', output_history: ['output'] }
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch {
    return { last_used: '', output_history: ['output'] }
  }
}

export function saveConfig(config) {
  const configPath = path.join(ROOT_DIR, 'svg-packer-config.json')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')
}

function getIconFolders() {
  const iconDir = path.join(ROOT_DIR, 'icon')
  if (!fs.existsSync(iconDir)) return []
  return fs.readdirSync(iconDir, { withFileTypes: true })
    .filter(item => item.isDirectory())
    .map(dir => ({
      name: dir.name,
      path: path.join(iconDir, dir.name),
    }))
}

function getSVGFiles(folderPath) {
  if (!fs.existsSync(folderPath)) return []
  return fs.readdirSync(folderPath)
    .filter(f => f.toLowerCase().endsWith('.svg'))
    .sort()
}

export function listDirectories(dirPath) {
  const target = dirPath || os.homedir()
  const absPath = path.isAbsolute(target) ? target : path.resolve(ROOT_DIR, target)
  if (!fs.existsSync(absPath)) {
    return { ok: false, error: `Directory does not exist: ${absPath}` }
  }
  const entries = fs.readdirSync(absPath, { withFileTypes: true })
  const dirs = entries
    .filter(e => e.isDirectory())
    .map(d => ({ name: d.name, path: path.join(absPath, d.name) }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { ok: true, current: absPath, parent: path.dirname(absPath), dirs }
}

export async function generatePack(packName, outputDir, returnContent = false) {
  const folders = getIconFolders()
  const match = folders.find(f => f.name === packName)
  if (!match) {
    return { ok: false, error: `Pack "${packName}" not found` }
  }

  const svgFiles = getSVGFiles(match.path)
  if (svgFiles.length === 0) {
    return { ok: false, error: `No SVG files in pack "${packName}"` }
  }

  const absOutputDir = path.isAbsolute(outputDir)
    ? outputDir
    : path.resolve(ROOT_DIR, outputDir)

  if (!fs.existsSync(absOutputDir)) {
    fs.mkdirSync(absOutputDir, { recursive: true })
  }

  const outputFile = path.join(absOutputDir, `${packName}-pack.svg`)

  const results = await Promise.allSettled(
    svgFiles.map(async (file) => {
      const content = fs.readFileSync(path.join(match.path, file), 'utf8')
      return processSVGFile(file, content, true)
    })
  )

  const symbols = []
  let totalRaw = 0
  let totalOpt = 0
  let errors = 0

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled' && r.value.symbol) {
      symbols.push(r.value.symbol)
      totalRaw += r.value.rawSize
      totalOpt += r.value.optimizedSize ?? r.value.rawSize
    } else {
      errors++
    }
  }

  const svgContent = buildSprite(symbols.filter(Boolean))

  if (returnContent) {
    const savings = totalRaw > 0
      ? ((1 - totalOpt / totalRaw) * 100).toFixed(1)
      : '0.0'
    return {
      ok: true,
      name: packName,
      content: svgContent,
      icons: { total: svgFiles.length, processed: symbols.length, errors },
      size: { raw: totalRaw, optimized: totalOpt },
      savings,
    }
  }

  fs.writeFileSync(outputFile, svgContent, 'utf8')
  const finalSize = fs.statSync(outputFile).size
  const savings = totalRaw > 0
    ? ((1 - totalOpt / totalRaw) * 100).toFixed(1)
    : '0.0'

  return {
    ok: true,
    name: packName,
    output: outputFile,
    icons: { total: svgFiles.length, processed: symbols.length, errors },
    size: { raw: totalRaw, optimized: totalOpt, final: finalSize },
    savings,
    preview: null,
  }
}
