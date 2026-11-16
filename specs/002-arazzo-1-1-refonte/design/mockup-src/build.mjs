/**
 * Build mono-fichier des maquettes : esbuild (JS + CSS), worker ELK inline (texte → Blob URL),
 * puis un seul HTML autonome, ouvrable hors ligne. Usage : `node build.mjs [sortie.html]`.
 */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const out = resolve(process.argv[2] ?? 'dist/graph-mockups.html');

const rawPlugin = {
  name: 'raw',
  setup(b) {
    b.onResolve({ filter: /\?raw$/ }, (args) => ({
      path: require.resolve(args.path.replace(/\?raw$/, ''), { paths: [args.resolveDir] }),
      namespace: 'raw',
    }));
    b.onLoad({ filter: /.*/, namespace: 'raw' }, async (args) => ({
      contents: await readFile(args.path, 'utf8'),
      loader: 'text',
    }));
  },
};

const t0 = Date.now();
const res = await build({
  entryPoints: ['src/app/main.tsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['chrome110', 'firefox115', 'safari16'],
  jsx: 'automatic',
  write: false,
  outdir: 'dist/tmp',
  loader: { '.svg': 'dataurl' },
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  plugins: [rawPlugin],
  metafile: true,
  logLevel: 'warning',
});
const js = res.outputFiles.find((f) => f.path.endsWith('.js')).text;
const css = res.outputFiles.find((f) => f.path.endsWith('.css')).text;
const safeJs = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const safeCss = css.replace(/<\/style/gi, '<\\/style');
const tpl = await readFile('index.html', 'utf8');
const html = tpl
  .replace('<!--CSS-->', () => `<style>${safeCss}</style>`)
  .replace('<!--JS-->', () => `<script>${safeJs}</script>`);
await mkdir(dirname(out), { recursive: true });
await writeFile(out, html);
const kb = (n) => `${(n / 1024).toFixed(0)} Ko`;
console.log(`OK ${out} — ${kb(Buffer.byteLength(html))} (JS ${kb(js.length)}, CSS ${kb(css.length)}) en ${Date.now() - t0} ms`);
const inputs = Object.entries(res.metafile.outputs).flatMap(([, o]) => Object.entries(o.inputs ?? {}));
const groups = {};
for (const [p, v] of inputs) {
  const k = p.includes('node_modules/') ? p.split('node_modules/')[1].split('/').slice(0, p.includes('@') ? 2 : 1).join('/') : 'src';
  groups[k] = (groups[k] ?? 0) + v.bytesInOutput;
}
for (const [k, v] of Object.entries(groups).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(28)} ${kb(v)}`);
