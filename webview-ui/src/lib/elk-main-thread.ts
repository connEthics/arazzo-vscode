/**
 * Replaces `elkjs/lib/elk-worker.min.js` in the webview build (alias in vite.config.ts).
 *
 * arazzo-flow imports that module on demand for its main-thread fallback, which
 * would bundle a second 1.5 MB copy of ELK next to `elk-worker.js`. This shim
 * loads `elk-worker.js` itself as a classic script instead and exposes the same
 * `{ Worker, default }` shape (elkjs `FakeWorker`). Top-level await: the build
 * targets ES2022 (VS Code's Electron).
 */
import { loadClassicElk } from './elk-host';

const FakeWorker = await loadClassicElk();

export { FakeWorker as Worker };
export default FakeWorker;
