import inquirer from 'inquirer';
import chalk from 'chalk';
import { getIconFolders, getSVGFiles, getConfig, saveConfig, addToOutputHistory } from '../utils/fs-utils.js';

export async function selectFolder() {
  const folders = getIconFolders();
  const config = getConfig();

  if (folders.length === 0) {
    console.log(chalk.yellow('\nNo se encontraron carpetas en el directorio "icon".'));
    console.log(chalk.gray('Crea una carpeta dentro de ./icon/ con tus archivos SVG e intenta de nuevo.'));
    return null;
  }

  const choices = folders.map(f => {
    const count = getSVGFiles(f.path, true).length;
    const label = count > 0
      ? `${f.name}  ${chalk.gray(`(${count} SVGs`)}`
      : `${f.name}  ${chalk.red('(vacía)')}`;
    return { name: label, value: f.path, short: f.name };
  });

  choices.push(new inquirer.Separator());
  choices.push({ name: ` ${chalk.red('Salir')}`, value: 'cancel' });

  const { selectedFolder } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedFolder',
      message: 'Selecciona un pack de iconos:',
      pageSize: 12,
      choices,
      default: folders.find(f => f.name === config.last_used)?.path,
      prefix: '\u{1F4E6}',
    },
  ]);

  if (selectedFolder === 'cancel') {
    console.log(chalk.yellow('\nOperación cancelada.'));
    return null;
  }

  const selectedFolderName = folders.find(f => f.path === selectedFolder)?.name;
  if (selectedFolderName) {
    config.last_used = selectedFolderName;
    saveConfig(config);
  }

  const svgFiles = getSVGFiles(selectedFolder, true);
  if (svgFiles.length === 0) {
    console.log(chalk.red(`\nLa carpeta "${selectedFolder}" no contiene archivos SVG.`));
    return null;
  }

  const historyChoices = config.output_history.map(h => ({ name: h, value: h }));
  historyChoices.push(new inquirer.Separator());
  historyChoices.push({ name: '\u{1F4C2}  Ingresar otra carpeta...', value: 'other' });

  let { outputDir } = await inquirer.prompt([
    {
      type: 'list',
      name: 'outputDir',
      message: '¿En qué carpeta deseas guardar el pack?',
      choices: historyChoices,
      prefix: '\u{1F4C2}',
    },
  ]);

  if (outputDir === 'other') {
    const { customPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'customPath',
        message: 'Ingresa la ruta de la carpeta:',
        default: 'output',
        validate: input => input.trim().length > 0 || 'La ruta no puede estar vacía.',
      },
    ]);
    outputDir = customPath;
  }

  addToOutputHistory(outputDir);

  return { folderPath: selectedFolder, svgFiles, outputDir };
}
