import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';

// Load .env.local
config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({});
