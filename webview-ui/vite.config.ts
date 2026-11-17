import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const vendor = path.resolve(__dirname, '../vendor/@connethics');

/**
 * Shared ConnEthics packages, vendored by arazzo-demo/scripts/sync-shared.mjs
 * (checked by `npm run vendor:check` at the repository root):
 * - `@connethics/arazzo-flow`: the graph component (ESM + style.css + elk-worker.js);
 * - `@connethics/arazzo-core`: `workflowToGraph` / types (ESM build, tree-shaken:
 *   the validators stay in the extension host).
 * Their bare imports (react, @xyflow/react, elkjs, html-to-image, yaml) are
 * resolved from this package's node_modules through `dedupe`, since vendor/
 * sits outside webview-ui/.
 */
export const sharedAliases = [
  { find: /^@connethics\/arazzo-flow\/style\.css$/, replacement: `${vendor}/arazzo-flow/dist/style.css` },
  { find: /^@connethics\/arazzo-flow$/, replacement: `${vendor}/arazzo-flow/dist/index.js` },
  { find: /^@connethics\/arazzo-core$/, replacement: `${vendor}/arazzo-core/dist/index.js` },
  // ELK main-thread fallback: instead of a second 1.5 MB copy of ELK (the chunk
  // arazzo-flow would import), reuse the worker script (see src/lib/elk-main-thread.ts).
  { find: /^elkjs\/lib\/elk-worker\.min\.js$/, replacement: path.resolve(__dirname, './src/lib/elk-main-thread.ts') },
  { find: '@', replacement: path.resolve(__dirname, './src') },
];

export const sharedDedupe = ['react', 'react-dom', '@xyflow/react', 'elkjs', 'html-to-image', 'yaml'];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: sharedAliases,
    dedupe: sharedDedupe,
  },
  build: {
    outDir: 'build',
    // Electron (VS Code ≥ 1.90): top-level await is used by the ELK fallback shim.
    target: 'es2022',
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
});
