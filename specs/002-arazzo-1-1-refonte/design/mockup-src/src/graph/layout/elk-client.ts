/**
 * ELK dans un Web Worker « inline » (URL blob:), compatible avec un fichier HTML unique
 * et avec la CSP d'un webview VS Code (`worker-src blob:`).
 * Repli : si le worker ne démarre pas (CSP, file:// restreint…), le même code ELK est
 * évalué sur le thread principal (FakeWorker fourni par elk-worker), sans dupliquer ELK.
 */
import ELKApi from 'elkjs/lib/elk-api.js';
import type { ELK, ElkNode } from 'elkjs/lib/elk-api';
// Texte brut du worker ELK (plugin esbuild `?raw` dans build.mjs).
import workerSource from 'elkjs/lib/elk-worker.min.js?raw';

export type ElkMode = 'worker' | 'main-thread';

let instance: { elk: ELK; mode: ElkMode } | null = null;
let blobUrl: string | null = null;

function mainThreadElk(): ELK {
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', workerSource)(mod, mod.exports);
  const FakeWorker = mod.exports.Worker as new () => Worker;
  return new (ELKApi as unknown as new (a: object) => ELK)({ workerFactory: () => new FakeWorker() });
}

function workerElk(): ELK {
  blobUrl ??= URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
  return new (ELKApi as unknown as new (a: object) => ELK)({
    workerFactory: () => {
      const w = new Worker(blobUrl as string, { name: 'arazzo-elk' });
      w.addEventListener('error', (ev) => {
        ev.preventDefault();
        onWorkerError?.(new Error('elk-worker-error'));
      });
      return w;
    },
  });
}

let onWorkerError: ((e: Error) => void) | null = null;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('elk-timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export function elkMode(): ElkMode | null {
  return instance?.mode ?? null;
}

export async function runElk(graph: ElkNode): Promise<{ result: ElkNode; mode: ElkMode }> {
  if (!instance) {
    try {
      instance = { elk: workerElk(), mode: 'worker' };
    } catch {
      instance = { elk: mainThreadElk(), mode: 'main-thread' };
    }
  }
  try {
    const failed = new Promise<never>((_, reject) => {
      onWorkerError = reject;
    });
    const result = await withTimeout(
      Promise.race([instance.elk.layout(graph), failed]),
      instance.mode === 'worker' ? 8000 : 60000,
    );
    return { result, mode: instance.mode };
  } catch (err) {
    if (instance.mode === 'worker' && err instanceof Error && /^elk-(timeout|worker-error)$/.test(err.message)) {
      instance.elk.terminateWorker();
      instance = { elk: mainThreadElk(), mode: 'main-thread' };
      return { result: await instance.elk.layout(graph), mode: instance.mode };
    }
    throw err;
  }
}
