import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: [
    './src/main/features/*/schema.ts',
    './src/main/features/*/*-schema.ts',
    './src/main/bus/schema.ts',
  ],
  out: './drizzle',
});
