import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from 'fs';
import { basename, extname, join } from 'path';
import prompts from 'prompts';

const CONFIG_FILE = './svg-packer-config.json';
const MAX_HISTORY = 5;

const loadHistory = () => {
	try {
		if (existsSync(CONFIG_FILE)) {
			const data = readFileSync(CONFIG_FILE, 'utf8');
			return JSON.parse(data).history || [];
		} else {
			writeFileSync(CONFIG_FILE, '{"history": []}', 'utf8');
		}
	} catch (error) {
		console.log('⚠️  Error cargando historial:', error.message);
	}
	return [];
};

const saveToHistory = newPath => {
	try {
		const history = loadHistory()
			.filter(p => p !== newPath)
			.slice(0, MAX_HISTORY - 1);

		writeFileSync(
			CONFIG_FILE,
			JSON.stringify(
				{
					history: [newPath, ...history],
				},
				null,
				2
			),
			'utf8'
		);
	} catch (error) {
		console.log('⚠️  Error guardando historial:', error.message);
	}
};

export default async inputFolder => {
	const history = loadHistory();
	const folderName = basename(inputFolder);
	const initialSuggestion = join(process.cwd(), 'icon', folderName);

	if (!existsSync(initialSuggestion)) {
		mkdirSync(initialSuggestion, { recursive: true });
	}

	const { outputDirectory } = await prompts({
		type: 'text',
		name: 'outputDirectory',
		message: '📂 Ruta para guardar el archivo SVG:',
		initial: history[0] || initialSuggestion,
		validate: value => !!value.trim() || 'La ruta no puede estar vacía',
	});

	if (!outputDirectory) {
		console.log('🚫 Operación cancelada');
		process.exit(0);
	}

	if (outputDirectory !== initialSuggestion) {
		saveToHistory(outputDirectory);
	}

	const outputFile = join(outputDirectory, `${folderName}.svg`);

	if (existsSync(outputFile)) {
		const { respuesta } = await prompts({
			type: 'confirm',
			name: 'respuesta',
			message: '⚠️  El archivo existe. ¿Reemplazar?',
			initial: false,
		});

		if (!respuesta) {
			console.log('🚫 Operación cancelada');
			process.exit(0);
		}
	}

	console.log('\n🔨 Procesando iconos...');
	let svgContent = `<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg">\n`;

	const files = readdirSync(inputFolder)
		.filter(file => extname(file) === '.svg')
		.sort();

	for (const [index, file] of files.entries()) {
		const filePath = join(inputFolder, file);
		const fileName = basename(file, '.svg');
		let content = readFileSync(filePath, 'utf8');

		console.log(`🔄 Procesando [${index + 1}/${files.length}]: ${fileName}`);

		content = content
			.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '')
			.replace(/<svg/g, `<symbol id='${fileName}'`)
			.replace(/<\/svg>/g, '</symbol>');

		svgContent += content + '\n';
	}

	svgContent += '</svg>';
	writeFileSync(outputFile, svgContent, 'utf8');

	console.log(`\n✅ Archivo creado: ${outputFile}`);
	console.log(`📦 Total de iconos incluidos: ${files.length}`);
};
