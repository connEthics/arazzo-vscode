import { afterEach, describe, expect, it, vi } from 'vitest';
import { elkWorkerUrl, loadClassicElk, resolveElkConfig } from '../lib/elk-host';

class FakeWorkerGlobal {
    constructor(public url: string | URL, public opts?: WorkerOptions) {}
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.head.querySelectorAll('script').forEach((s) => s.remove());
});

describe('ELK worker strategy (webview)', () => {
    it('points to the elk-worker.js asset emitted next to the bundle', () => {
        expect(elkWorkerUrl()).toMatch(/elk-worker\.js$/);
    });

    it('same origin: plain workerUrl', async () => {
        vi.stubGlobal('Worker', FakeWorkerGlobal);
        const url = new URL('/assets/elk-worker.js', location.href).href;
        expect(await resolveElkConfig(url)).toEqual({ workerUrl: url });
    });

    it('cross origin (vscode-resource): fetch + blob: URL through createWorker', async () => {
        vi.stubGlobal('Worker', FakeWorkerGlobal);
        const fetchMock = vi.fn(async () => new Response('self.onmessage = () => {};', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const createObjectURL = vi.fn(() => 'blob:vscode-webview://x/1234');
        vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL: () => {} }));
        const url = 'https://file+.vscode-resource.vscode-cdn.net/ext/webview-ui/build/assets/elk-worker.js';
        const config = await resolveElkConfig(url);
        expect(fetchMock).toHaveBeenCalledWith(url);
        expect(config.workerUrl).toBeUndefined();
        expect(config.mode).toBeUndefined();
        const worker = config.createWorker!() as unknown as FakeWorkerGlobal;
        expect(worker.url).toBe('blob:vscode-webview://x/1234');
        expect(worker.opts).toEqual({ name: 'arazzo-elk' });
    });

    it('fetch refused (CSP connect-src) or no Worker: main-thread fallback', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.stubGlobal('Worker', FakeWorkerGlobal);
        vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Refused to connect'); }));
        expect(await resolveElkConfig('https://other.example/elk-worker.js')).toEqual({ mode: 'main-thread' });
        vi.stubGlobal('Worker', undefined);
        expect(await resolveElkConfig('https://other.example/elk-worker.js')).toEqual({ mode: 'main-thread' });
    });

    it('main-thread fallback loads the same script with the page nonce and restores globals', async () => {
        const page = document.createElement('script');
        page.nonce = 'abc123';
        document.head.appendChild(page);
        const Fake = function FakeWorker() {};
        const appended = vi.spyOn(document.head, 'appendChild');
        const pending = loadClassicElk('https://res.example/assets/elk-worker.js');
        const script = appended.mock.calls.at(-1)![0] as HTMLScriptElement;
        expect(script.src).toBe('https://res.example/assets/elk-worker.js');
        expect(script.nonce).toBe('abc123');
        // What elkjs does when `module.exports` exists and `document` is defined.
        const w = window as unknown as { module: { exports: unknown } };
        w.module.exports = { default: Fake, Worker: Fake };
        script.onload!(new Event('load'));
        await expect(pending).resolves.toBe(Fake);
        expect('module' in window).toBe(false);
        expect('exports' in window).toBe(false);
        expect(script.isConnected).toBe(false);
    });
});
