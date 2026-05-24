import figlet from 'figlet';
import chalk from 'chalk';

function box(text) {
  const lines = text.split('\n');
  const width = Math.max(...lines.map(l => l.length));
  const top = chalk.cyan(`╔${'═'.repeat(width + 2)}╗`);
  const bottom = chalk.cyan(`╚${'═'.repeat(width + 2)}╝`);
  const middle = lines.map(l => chalk.cyan('║ ') + l + ' '.repeat(width - l.length) + chalk.cyan(' ║'));
  return [top, ...middle, bottom].join('\n');
}

export function showBanner() {
  const title = figlet.textSync('SVG Packer', { horizontalLayout: 'full' });
  console.log('\n' + box(title) + '\n');
  console.log(chalk.gray(`  ${'·'.repeat(50)}`));
  console.log(`  ${chalk.yellow('Generador de Paquetes SVG')} ${chalk.cyan('v2.0')}`);
  console.log(chalk.gray(`  ${'·'.repeat(50)}\n`));
}
