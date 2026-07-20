import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { getRootDir, ensureDirectoryExists, addToOutputHistory } from '../utils/fs-utils.js';
import { processSVGFile, buildSprite } from './svg-processor.js';
import { selectFolder } from '../cli/prompts.js';
import { showBanner } from '../cli/banner.js';

function hr(color = 'gray') {
  return chalk[color](`  ${'─'.repeat(56)}`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function processIcon({ file, filePath, withOptimization }) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rawSize = content.length;
  const result = await processSVGFile(file, content, withOptimization);
  return { ...result, file, rawSize };
}

export async function createSVGPack(options = {}) {
  const {
    packName: cliPackName,
    packPath: cliPackPath,
    svgFiles: cliSvgFiles,
    outputDir: cliOutputDir,
    optimize = true,
    jsonOutput = false,
    watch = false,
    preview = false,
  } = options;

  const isInteractive = !cliPackName;

  if (isInteractive) {
    showBanner();
  }

  let folder;
  if (isInteractive) {
    folder = await selectFolder();
    if (!folder) return;
  } else {
    folder = {
      folderPath: cliPackPath,
      svgFiles: cliSvgFiles,
      outputDir: cliOutputDir || 'output',
    };
  }

  const { folderPath: inputFolder, svgFiles: files } = folder;
  const customOutputDir = folder.outputDir || cliOutputDir || 'output';
  const folderName = path.basename(inputFolder);

  const rootDir = getRootDir();
  const outputDir = path.isAbsolute(customOutputDir)
    ? customOutputDir
    : path.resolve(rootDir, customOutputDir);

  ensureDirectoryExists(outputDir);
  const outputFile = path.join(outputDir, `${folderName}-pack.svg`);

  if (isInteractive) {
    console.log(`\n  ${chalk.bold('Pack:')}      ${chalk.cyan(folderName)}`);
    console.log(`  ${chalk.bold('Iconos:')}    ${chalk.white(files.length)}`);

    if (fs.existsSync(outputFile)) {
      console.log(`  ${chalk.bold('Estado:')}    ${chalk.yellow('Reemplazando pack existente')}`);
      try { fs.unlinkSync(outputFile); } catch { }
    } else {
      console.log(`  ${chalk.bold('Estado:')}    ${chalk.green('Creando nuevo pack')}`);
    }
    console.log(hr() + '\n');
  }

  const svgFiles = files.filter(f => f.toLowerCase().endsWith('.svg'));
  const symbols = [];
  let totalRawSize = 0;
  let totalOptimizedSize = 0;
  let errorCount = 0;

  if (isInteractive) {
    const results = await Promise.allSettled(
      svgFiles.map(file =>
        processIcon({
          file,
          filePath: path.join(inputFolder, file),
          withOptimization: optimize,
        })
      )
    );

    for (let i = 0; i < results.length; i++) {
      const file = svgFiles[i];
      const settled = results[i];

      if (settled.status === 'fulfilled' && settled.value.symbol) {
        const { symbol, rawSize, optimizedSize } = settled.value;
        symbols.push(symbol);
        totalRawSize += rawSize;
        totalOptimizedSize += optimizedSize ?? rawSize;
        const savings = rawSize > 0 ? ((1 - (optimizedSize ?? rawSize) / rawSize) * 100).toFixed(1) : '0.0';
        const diff = optimizedSize !== rawSize ? chalk.green(`(${savings}%)`) : chalk.gray('(sin cambio)');
        console.log(`  ${chalk.green('✓')} ${file.padEnd(28)} ${chalk.gray(`${rawSize}B → ${optimizedSize ?? rawSize}B`)} ${diff}`);
      } else {
        errorCount++;
        const reason = settled.status === 'rejected' ? settled.reason?.message : 'unknown error';
        console.log(`  ${chalk.red('✗')} ${file.padEnd(28)} ${chalk.red(`Error: ${reason}`)}`);
      }
    }
  } else {
    const results = await Promise.allSettled(
      svgFiles.map(file =>
        processIcon({
          file,
          filePath: path.join(inputFolder, file),
          withOptimization: optimize,
        })
      )
    );

    for (const settled of results) {
      if (settled.status === 'fulfilled' && settled.value.symbol) {
        const { symbol, rawSize, optimizedSize } = settled.value;
        symbols.push(symbol);
        totalRawSize += rawSize;
        totalOptimizedSize += optimizedSize ?? rawSize;
      } else {
        errorCount++;
      }
    }
  }

  const svgContent = buildSprite(symbols.filter(Boolean));
  fs.writeFileSync(outputFile, svgContent, 'utf8');

  const finalSize = fs.statSync(outputFile).size;
  const totalSavings = totalRawSize > 0
    ? ((1 - totalOptimizedSize / totalRawSize) * 100).toFixed(1)
    : '0.0';
  const okCount = svgFiles.length - errorCount;

  if (jsonOutput) {
    const json = JSON.stringify({
      name: folderName,
      icons: { total: svgFiles.length, processed: okCount, errors: errorCount },
      size: { raw: totalRawSize, optimized: totalOptimizedSize, final: finalSize },
      savings: totalSavings,
      output: outputFile,
    });
    console.log(json);
  } else if (isInteractive) {
    console.log(hr('green'));
    console.log(`  ${chalk.green.bold('Proceso completado')}`);
    console.log(hr());
    console.log(`  ${chalk.bold('Pack:')}      ${chalk.cyan(folderName)}`);
    console.log(`  ${chalk.bold('Iconos:')}    ${chalk.white(`${okCount} procesados`)}${errorCount > 0 ? chalk.red(`, ${errorCount} con errores`) : ''}`);
    console.log(`  ${chalk.bold('Tamaño:')}    ${chalk.gray(`${formatBytes(totalRawSize)} → ${formatBytes(totalOptimizedSize)}`)} ${chalk.green(`(${totalSavings}%)`)}`);
    console.log(`  ${chalk.bold('Archivo:')}   ${chalk.cyan(outputFile)} (${formatBytes(finalSize)})`);
    console.log(hr('green'));
    console.log();
  } else {
    console.log(`${chalk.green('Pack generado:')} ${chalk.cyan(outputFile)}`);
    console.log(`  ${okCount} iconos procesados${errorCount > 0 ? chalk.red(`, ${errorCount} errores`) : ''} | ${formatBytes(totalRawSize)} → ${formatBytes(totalOptimizedSize)} (${totalSavings}% ahorro)`);
  }

  if (preview && okCount > 0) {
    generatePreview(outputFile, symbols.filter(Boolean), folderName, outputDir);
  }

  addToOutputHistory(customOutputDir);

  if (watch) {
    console.log(chalk.yellow('\nModo observador activo. Esperando cambios... (Ctrl+C para salir)\n'));
    const watcher = chokidar.watch(path.join(inputFolder, '*.svg'), {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300 },
    });

    let isRegenerating = false;
    watcher.on('change', async (changedPath) => {
      if (isRegenerating) return;
      isRegenerating = true;
      const changedFile = path.basename(changedPath);
      console.log(chalk.yellow(`Cambio detectado: ${changedFile}`));

      try {
        const updatedFiles = fs.readdirSync(inputFolder)
          .filter(f => f.toLowerCase().endsWith('.svg'))
          .sort();

        const results = await Promise.allSettled(
          updatedFiles.map(file =>
            processIcon({
              file,
              filePath: path.join(inputFolder, file),
              withOptimization: optimize,
            })
          )
        );

        const updatedSymbols = results
          .filter(r => r.status === 'fulfilled' && r.value.symbol)
          .map(r => r.value.symbol);

        const newContent = buildSprite(updatedSymbols.filter(Boolean));
        fs.writeFileSync(outputFile, newContent, 'utf8');
        const newSize = fs.statSync(outputFile).size;
        console.log(chalk.green(`Pack regenerado: ${formatBytes(newSize)}`));
      } catch (err) {
        console.error(chalk.red(`Error al regenerar: ${err.message}`));
      }
      isRegenerating = false;
    });

    await new Promise(() => {});
  }
}

function generatePreview(outputFile, symbols, folderName, outputDir) {
  const previewFile = path.join(outputDir, `${folderName}-preview.html`);
  const svgFileName = path.basename(outputFile);

  const items = symbols.map(s => {
    const idMatch = s.match(/id='([^']+)'/);
    const id = idMatch ? idMatch[1] : 'unknown';
    return `    <div class="icon-item">
      <svg width="32" height="32"><use href="${svgFileName}#${id}"/></svg>
      <span class="icon-label">${id}</span>
    </div>`;
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Preview - ${folderName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #f8f9fa; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #333; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 1rem; }
    .icon-item { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .icon-label { font-size: 0.75rem; color: #666; word-break: break-all; text-align: center; max-width: 100%; }
    .count { margin-bottom: 1rem; color: #666; font-size: 0.875rem; }
  </style>
</head>
<body>
  <h1>${folderName}</h1>
  <p class="count">${symbols.length} iconos</p>
  <div class="grid">
${items.join('\n')}
  </div>
</body>
</html>`;

  fs.writeFileSync(previewFile, html, 'utf8');
  console.log(`  ${chalk.gray('Preview:')}   ${chalk.cyan(previewFile)}`);
}
