import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import type { Diagnostic } from '@connethics/arazzo-core';
import { resetElk } from '@connethics/arazzo-flow';
import { mockElk } from './mock-elk';

// ── VS Code API and ELK mocks (hoisted above the App import) ───────────────────
const h = vi.hoisted(() => {
    const posted: unknown[] = [];
    const state: { value: unknown } = { value: undefined };
    const api = {
        postMessage: (m: unknown) => { posted.push(m); },
        getState: () => state.value,
        setState: (s: unknown) => { state.value = s; },
    };
    (globalThis as unknown as { acquireVsCodeApi: () => typeof api }).acquireVsCodeApi = () => api;
    return { posted, state, elk: { engine: undefined as unknown } };
});

vi.mock('../lib/elk-host', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../lib/elk-host')>();
    // Same object on every render: the layout engine is mocked, no worker.
    return { ...actual, useElkConfig: () => h.elk };
});

import App from '../App';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../../../src/test/fixtures/v1.1');
const fixture = (rel: string) => readFileSync(join(fixtures, rel), 'utf8');
const orderToCash = parse(fixture('e2e-order-to-cash/e2e-order-to-cash.arazzo.yaml'));
const openapi = parse(fixture('e2e-order-to-cash/openapi.yaml'));

const node = (id: string) => document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`);
const send = (data: unknown) => act(() => { window.dispatchEvent(new MessageEvent('message', { data })); });
const messages = (type: string) => h.posted.filter((m) => (m as { type: string }).type === type);

async function openFlowchart(extra: Record<string, unknown> = {}) {
    render(<App />);
    expect(h.posted).toContainEqual({ type: 'ready' });
    send({ type: 'update-flowchart', spec: orderToCash, workflowId: 'orderToCash', ...extra });
    await waitFor(() => expect(node('step:createOrder')).not.toBeNull());
}

beforeEach(() => {
    resetElk();
    h.elk.engine = mockElk();
    h.posted.length = 0;
    h.state.value = undefined;
    document.body.className = 'vscode-dark';
});
afterEach(() => {
    cleanup();
    document.body.className = '';
});

describe('Flowchart view (arazzo-flow, mocked ELK)', () => {
    it('renders the order-to-cash workflow with the VS Code theme', async () => {
        await openFlowchart();
        const engine = h.elk.engine as ReturnType<typeof mockElk>;
        expect(engine.calls).toBeGreaterThan(0);
        for (const id of ['input', 'step:createOrder', 'step:awaitOrderConfirmation', 'step:capturePayment', 'step:createInvoice', 'step:createShipment', 'step:closeOrder', 'output']) {
            expect(node(id), id).not.toBeNull();
        }
        // AsyncAPI receive step: badge + timeout chip (6000 ms).
        const receive = node('step:awaitOrderConfirmation')!;
        expect(receive.querySelector('[data-step-kind="async-receive"] .af-badge--receive')).not.toBeNull();
        expect(receive.textContent).toContain('6 s');
        // dependsOn join before closeOrder.
        expect(node('join:closeOrder')).not.toBeNull();
        const root = document.querySelector('.af-root')!;
        expect(root.getAttribute('data-af-theme')).toBe('vscode');
        expect(root.hasAttribute('data-af-dark')).toBe(true);
        expect(root.getAttribute('data-contrast')).not.toBe('high');
        // No Mermaid renderer any more.
        expect(document.querySelector('.mermaid-container')).toBeNull();
    });

    it('posts step-selected on click (focus kept) and on double-click (reveal)', async () => {
        await openFlowchart();
        fireEvent.click(node('step:capturePayment')!);
        await waitFor(() => expect(messages('step-selected')).toHaveLength(1));
        expect(messages('step-selected')[0]).toEqual({ type: 'step-selected', stepId: 'capturePayment', workflowId: 'orderToCash', reveal: false });

        fireEvent.doubleClick(node('step:closeOrder')!);
        await waitFor(() => expect(messages('step-selected').at(-1)).toEqual({ type: 'step-selected', stepId: 'closeOrder', workflowId: 'orderToCash', reveal: true }));

        // Non-step nodes never navigate the editor.
        const before = messages('step-selected').length;
        fireEvent.click(node('input')!);
        expect(messages('step-selected')).toHaveLength(before);
    });

    it('follows the editor cursor (select-workflow with stepId)', async () => {
        await openFlowchart();
        send({ type: 'select-workflow', workflowId: 'orderToCash', stepId: 'createInvoice' });
        await waitFor(() => expect(node('step:createInvoice')!.querySelector('[data-selected]')).not.toBeNull());
        send({ type: 'select-workflow', workflowId: 'orderToCash' });
        await waitFor(() => expect(document.querySelector('.react-flow__node [data-selected]')).toBeNull());
        expect(messages('step-selected')).toHaveLength(0);
    });

    it('shows core diagnostics on nodes and HTTP methods from the OpenAPI source', async () => {
        const diagnostics: Diagnostic[] = [{
            code: 'arazzo-step-depends-on-resolved',
            message: 'Unknown step',
            severity: 'error',
            path: ['workflows', 0, 'steps', 2, 'dependsOn', 0],
            source: 'semantic',
        }];
        await openFlowchart({ diagnostics, sources: { commerce: openapi } });
        await waitFor(() => expect(node('step:capturePayment')!.querySelector('.af-diag--error')).not.toBeNull());
        expect(node('step:createOrder')!.querySelector('.af-diag')).toBeNull();
        expect(node('step:createOrder')!.querySelector('.af-badge--post')!.textContent).toBe('POST');
    });

    it('high contrast: detected from body.vscode-high-contrast-light', async () => {
        document.body.className = 'vscode-high-contrast vscode-high-contrast-light';
        await openFlowchart();
        const root = document.querySelector('.af-root')!;
        expect(root.getAttribute('data-contrast')).toBe('high');
        expect(root.hasAttribute('data-af-dark')).toBe(false);
    });

    it('"Copy as Mermaid" posts the Mermaid flowchart of the workflow', async () => {
        await openFlowchart();
        fireEvent.click(screen.getByRole('button', { name: 'Copy as Mermaid' }));
        const [msg] = messages('copy-mermaid') as { text: string; workflowId: string }[];
        expect(msg.workflowId).toBe('orderToCash');
        expect(msg.text).toMatch(/^flowchart TB/);
        expect(msg.text).toContain('createOrder');
    });

    it('workflow selector switches workflow and tells the extension', async () => {
        const two = structuredClone(orderToCash);
        two.workflows.push({ workflowId: 'second', steps: [{ stepId: 'only', operationId: '$sourceDescriptions.commerce.createOrder' }] });
        render(<App />);
        send({ type: 'update-flowchart', spec: two, workflowId: 'orderToCash' });
        await waitFor(() => expect(node('step:createOrder')).not.toBeNull());
        fireEvent.change(screen.getByLabelText('Workflow'), { target: { value: 'second' } });
        await waitFor(() => expect(node('step:only')).not.toBeNull());
        expect(messages('workflow-selected')).toEqual([{ type: 'workflow-selected', workflowId: 'second' }]);
    });
});
