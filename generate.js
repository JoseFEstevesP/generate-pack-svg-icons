import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { extname, join } from 'path';
import prompts from 'prompts';
import create from './create.js';

const logProgress = message => {
	console.log(`[${new Date().toLocaleTimeString()}] ▶ ${message}`);
};

(async () => {
	const iconsRoot = join(process.cwd(), 'icon');

	if (!existsSync(iconsRoot)) {
		console.log('ℹ️  La carpeta "icon" no existe. Creándola...');
		mkdirSync(iconsRoot);
		console.log('✅ Carpeta "icon" creada exitosamente.');
		console.log(
			'ℹ️  Por favor, coloca tus iconos SVG en subcarpetas dentro de "icon" y vuelve a ejecutar el script.'
		);
		process.exit(0);
	}

	const iconFolders = readdirSync(iconsRoot, { withFileTypes: true })
		.filter(dirent => dirent.isDirectory())
		.map(dirent => ({
			title: dirent.name,
			value: join(iconsRoot, dirent.name),
		}));

	if (iconFolders.length === 0) {
		console.log('❌ No hay subcarpetas con iconos dentro de "icon".');
		console.log(
			'ℹ️  Por favor, crea subcarpetas dentro de "icon" con tus archivos SVG.'
		);
		process.exit(1);
	}

	const { folderPath } = await prompts({
		type: 'select',
		name: 'folderPath',
		message: '📁 Seleccione un pack de iconos:',
		choices: iconFolders,
		initial: 0,
	});

	if (!folderPath) {
		console.log('🚫 Operación cancelada.');
		process.exit(0);
	}

	const tempFolderPath = `${folderPath}-min`;
	mkdirSync(tempFolderPath, { recursive: true });

	const files = readdirSync(folderPath).filter(
		file => extname(file) === '.svg'
	);

	console.log('\n⚙️  Iniciando optimización:');
	console.log(`📂 Carpeta seleccionada: ${folderPath}`);
	console.log(`📄 Total de iconos: ${files.length}\n`);

	files.forEach((file, index) => {
		const input = join(folderPath, file);
		const output = join(tempFolderPath, file);

		try {
			logProgress(`🔄 Optimizando [${index + 1}/${files.length}]: ${file}`);
			execSync(`npx svgo ${input} -o ${output}`, { stdio: 'pipe' });
			logProgress(`✅ Optimizado: ${file}`);
		} catch (error) {
			logProgress(`❌ Error optimizando ${file}: ${error.message}`);
		}
	});

	console.log('\n🎉 Optimización completada!\n');
	await create(tempFolderPath);
	rmSync(tempFolderPath, { recursive: true, force: true });
})();
