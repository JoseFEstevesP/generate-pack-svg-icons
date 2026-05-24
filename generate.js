import { main } from './src/core/generate.js';

try {
  await main();
} catch (error) {
  console.error('Error fatal:', error);
  process.exit(1);
}
