import { main } from './core/generate.js';

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
