/**
 * ELK (graph layout) wiring for the VS Code webview.
 *
 * `@connethics/arazzo-flow` runs ELK in a Web Worker (`elk-worker.js`, a classic
 * script). In a VS Code webview the page origin is `vscode-webview://…` while the
 * extension files are served from `https://file+.vscode-resource.vscode-cdn.net`:
 * `new Worker(resourceUrl)` is a cross-origin worker and is refused. So:
 *
 *   1. same origin (Vite dev server, test harness) → `workerUrl`;
 *   2. otherwise the script is fetched (CSP `connect-src ${webview.cspSource}`)
 *      and started from a `blob:` URL through `createWorker` (CSP `worker-src blob:`);
 *   3. any failure (fetch refused, no Worker, worker error or 8 s timeout inside
 *      arazzo-flow) → ELK on the main thread. That fallback reuses the very same
 *      `elk-worker.js`, loaded as a nonce'd classic script (see elk-main-thread.ts),
 *      so the build ships a single copy of ELK (1.5 MB).
 *
 * The CSP side is documented in src/panels/webview-html.ts.
 */
import { useEffect, useState } from 'react';
import type { ElkConfig } from '@connethics/arazzo-flow';
import workerAsset from '@connethics/arazzo-flow/elk-worker.js?url';

/** Absolute URL of the ELK worker script emitted next to the bundle (`build/assets/elk-worker.js`). */
export function elkWorkerUrl(): string {
  return new URL(workerAsset, import.meta.url).href;
}

function isSameOrigin(url: string): boolean {
  try {
    const target = new URL(url, location.href);
    // Non-special schemes (vscode-webview:) have an opaque "null" origin.
    return location.origin !== 'null' && target.origin === location.origin;
  } catch {
    return false;
  }
}

/** Worker strategy for the current page (see module comment). Never rejects. */
export async function resolveElkConfig(url: string = elkWorkerUrl()): Promise<ElkConfig> {
  if (typeof Worker === 'undefined') return { mode: 'main-thread' };
  if (isSameOrigin(url)) return { workerUrl: url };
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`elk-worker-fetch-${res.status}`);
    const blobUrl = URL.createObjectURL(new Blob([await res.text()], { type: 'text/javascript' }));
    return { createWorker: () => new Worker(blobUrl, { name: 'arazzo-elk' }) };
  } catch (err) {
    console.warn('[arazzo] ELK worker unavailable, layout runs on the main thread:', err);
    return { mode: 'main-thread' };
  }
}

let shared: Promise<ElkConfig> | null = null;

/**
 * ELK configuration for <ArazzoGraph>, resolved once per page. `override`
 * (tests: `{ engine }`) is returned as is. `null` while resolving.
 */
export function useElkConfig(override?: ElkConfig): ElkConfig | null {
  const [config, setConfig] = useState<ElkConfig | null>(override ?? null);
  useEffect(() => {
    if (override) {
      setConfig(override);
      return;
    }
    let alive = true;
    shared ??= resolveElkConfig();
    void shared.then((c) => alive && setConfig(c));
    return () => {
      alive = false;
    };
  }, [override]);
  return config;
}

/** Nonce of the page scripts (CSP `script-src 'nonce-…'`), readable only through the property. */
function pageNonce(): string | undefined {
  for (const s of Array.from(document.querySelectorAll('script'))) {
    if (s.nonce) return s.nonce;
  }
  return undefined;
}

type FakeWorkerCtor = new () => Worker;

/**
 * Loads `elk-worker.js` as a classic script on the main thread and returns the
 * `FakeWorker` it exports in a CommonJS-like context (elkjs detects `module.exports`
 * when `document` exists). Used only by the main-thread fallback.
 */
export function loadClassicElk(url: string = elkWorkerUrl()): Promise<FakeWorkerCtor> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    const had = { module: 'module' in w, exports: 'exports' in w };
    const prev = { module: w.module, exports: w.exports };
    const mod: { exports: Record<string, unknown> } = { exports: {} };
    w.module = mod;
    w.exports = mod.exports;
    const script = document.createElement('script');
    const restore = () => {
      for (const k of ['module', 'exports'] as const) {
        if (had[k]) w[k] = prev[k];
        else delete w[k];
      }
      script.remove();
    };
    script.src = url;
    script.async = true;
    const nonce = pageNonce();
    if (nonce) script.nonce = nonce;
    script.onload = () => {
      const exported = mod.exports as { Worker?: unknown; default?: unknown };
      restore();
      const ctor = exported.Worker ?? exported.default;
      if (typeof ctor === 'function') resolve(ctor as FakeWorkerCtor);
      else reject(new Error('elk-main-thread-unavailable'));
    };
    script.onerror = () => {
      restore();
      reject(new Error('elk-main-thread-load'));
    };
    document.head.appendChild(script);
  });
}
