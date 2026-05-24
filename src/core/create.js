import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { getDefaultOutputDir, getRootDir, ensureDirectoryExists } from '../utils/fs-utils.js';
import { processSVGFile, buildSprite } from './svg-processor.js';
import { selectFolder } from '../cli/prompts.js';
import { showBanner } from '../cli/banner.js';

function hr(color = 'gray') {
  return chalk[color](`  ${'─'.repeat(56)}`);
}

export async function createSVGPack() {
  try {
    showBanner();

    const folder = await selectFolder();
    if (!folder) return;

    const { folderPath: inputFolder, svgFiles: files, outputDir: customOutputDir } = folder;
    const folderName = path.basename(inputFolder);

    console.log(`\n  ${chalk.bold('Pack:')}      ${chalk.cyan(folderName)}`);
    console.log(`  ${chalk.bold('Iconos:')}    ${chalk.white(files.length)}`);
    
    const rootDir = getRootDir();
    const outputDir = path.isAbsolute(customOutputDir) 
      ? customOutputDir 
      : path.resolve(rootDir, customOutputDir);
    
    ensureDirectoryExists(outputDir);
    const outputFile = path.join(outputDir, `${folderName}-pack.svg`);

    if (fs.existsSync(outputFile)) {
      console.log(`  ${chalk.bold('Estado:')}    ${chalk.yellow('Reemplazando pack existente')}`);
      try {
        fs.unlinkSync(outputFile);
      } catch (err) {
        // Silently ignore errors if it can't be deleted for some reason, 
        // writeFileSync will still try to overwrite.
      }
    } else {
      console.log(`  ${chalk.bold('Estado:')}    ${chalk.green('Creando nuevo pack')}`);
    }
    
    console.log(hr() + '\n');

    const symbols = [];
    let totalRawSize = 0;
    let totalOptimizedSize = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(inputFolder, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const rawSize = content.length;
      totalRawSize += rawSize;

      process.stdout.write(
        `  ${chalk.gray(`[${i + 1}/${files.length}]`)} ${chalk.yellow('→')} ${file}`
      );

      try {
        const result = await processSVGFile(file, content, true);
        symbols.push(result.symbol);

        const optSize = result.optimizedSize ?? rawSize;
        totalOptimizedSize += optSize;
        const savings = rawSize > 0 ? ((1 - optSize / rawSize) * 100).toFixed(1) : '0.0';
        const diff = optSize !== rawSize ? chalk.green(`(${savings}%)`) : chalk.gray('(sin cambio)');

        process.stdout.write(
          `\r  ${chalk.green('✓')} ${file.padEnd(28)} ${chalk.gray(`${rawSize}B → ${optSize}B`)} ${diff}\n`
        );
      } catch (error) {
        errorCount++;
        symbols.push('');
        process.stdout.write(
          `\r  ${chalk.red('✗')} ${file.padEnd(28)} ${chalk.red(`Error: ${error.message}`)}\n`
        );
      }
    }

    const svgContent = buildSprite(symbols.filter(Boolean));
    fs.writeFileSync(outputFile, svgContent, 'utf8');

    const finalSize = fs.statSync(outputFile).size;
    const totalSavings = totalRawSize > 0
      ? ((1 - totalOptimizedSize / totalRawSize) * 100).toFixed(1)
      : '0.0';

    const okCount = files.length - errorCount;

    console.log(hr('green'));
    console.log(`  ${chalk.green.bold('✔  Proceso completado')}`);
    console.log(hr());
    console.log(`  ${chalk.bold('Pack:')}      ${chalk.cyan(folderName)}`);
    console.log(`  ${chalk.bold('Iconos:')}    ${chalk.white(`${okCount} procesados`)}${errorCount > 0 ? chalk.red(`, ${errorCount} con errores`) : ''}`);
    console.log(`  ${chalk.bold('Tamaño:')}    ${chalk.gray(`${formatBytes(totalRawSize)} → ${formatBytes(totalOptimizedSize)}`)} ${chalk.green(`(${totalSavings}%)`)}`);
    console.log(`  ${chalk.bold('Archivo:')}   ${chalk.cyan(outputFile)} (${formatBytes(finalSize)})`);
    console.log(hr('green'));
    console.log();
  } catch (error) {
    console.error(chalk.red(`\n  Error: ${error.message}`));
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
