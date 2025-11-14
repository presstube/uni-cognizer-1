import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

export const COGNIZER_VERSION = packageJson.version;
export const NODE_VERSION = process.version;

console.log(`📦 Cognizer v${COGNIZER_VERSION} (Node ${NODE_VERSION})`);

