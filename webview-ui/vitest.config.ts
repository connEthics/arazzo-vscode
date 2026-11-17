import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { sharedAliases, sharedDedupe } from './vite.config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: sharedAliases,
        dedupe: sharedDedupe,
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.ts',
    },
});
