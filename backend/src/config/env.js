import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve o caminho para a raiz do projeto (duas pastas acima de src/config)
const envPath = path.resolve(__dirname, '../../../.env');

dotenv.config({ path: envPath });

console.log(`[ENV] Carregando variáveis de: ${envPath}`);
