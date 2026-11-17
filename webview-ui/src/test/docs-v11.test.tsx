import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import UnifiedDocumentationView from '../components/UnifiedDocumentationView';
import StepBody from '../components/arazzo/StepBody';
import StepHeader from '../components/arazzo/StepHeader';
import { formatTimeout, parseStepDependency, splitOperationId } from '../lib/arazzo-11';
import type { ArazzoSpec, Step } from '../types/arazzo';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '../../../src/test/fixtures/v1.1');
const orderToCash = parse(readFileSync(join(fixtures, 'e2e-order-to-cash/e2e-order-to-cash.arazzo.yaml'), 'utf8')) as ArazzoSpec;

const sendStep: Step = {
    stepId: 'publishRefund',
    channelPath: '{$sourceDescriptions.events.url}#/channels/refundIssued',
    action: 'send',
    requestBody: { contentType: 'application/json', payload: { refundId: '$steps.refund.outputs.id' } },
    parameters: [
        { name: 'search', in: 'querystring', value: { context: '$inputs', selector: '/filters', type: 'jsonpointer' } },
    ],
};

describe('Documentation view — Arazzo 1.1', () => {
    it('renders $self, the asyncapi source and the AsyncAPI receive step', () => {
        render(<UnifiedDocumentationView spec={orderToCash} isDark={false} />);
        expect(screen.getByTestId('arazzo-self')).toHaveTextContent(orderToCash.$self!);
        expect(screen.getAllByText('asyncapi').length).toBeGreaterThanOrEqual(1);

        const card = document.getElementById('step-orderToCash-awaitOrderConfirmation')!;
        const c = within(card);
        expect(c.getAllByText('↓ receive').length).toBeGreaterThanOrEqual(1);
        expect(c.getByText('AsyncAPI Message')).toBeInTheDocument();
        expect(c.getByText('$steps.createOrder.outputs.orderId')).toBeInTheDocument();
        expect(c.getAllByText(/6 s/).length).toBeGreaterThanOrEqual(1);
        expect(c.getByText('6000 ms')).toBeInTheDocument();
        // Source and operation of `$sourceDescriptions.orderEvents.receiveOrderConfirmed`.
        expect(c.getAllByText('orderEvents').length).toBeGreaterThanOrEqual(1);
        expect(c.getByText('receiveOrderConfirmed')).toBeInTheDocument();
        // No guessed HTTP method on an AsyncAPI step.
        expect(c.queryByText('GET')).toBeNull();
    });

    it('renders info and workflow descriptions as CommonMark, not raw markup', () => {
        const spec: ArazzoSpec = {
            ...orderToCash,
            workflows: [{ ...orderToCash.workflows[0], description: 'Runs **after** the `createOrder` step.' }],
        };
        render(<UnifiedDocumentationView spec={spec} isDark={false} />);
        const info = screen.getByTestId('arazzo-info-description');
        expect(info.querySelector('strong')).toHaveTextContent('jonction');
        expect(info.querySelectorAll('li').length).toBeGreaterThanOrEqual(3);
        expect(info.textContent).not.toContain('**');
        const wf = screen.getByTestId('workflow-description');
        expect(wf.querySelector('strong')).toHaveTextContent('after');
        expect(wf.querySelector('code')).toHaveTextContent('createOrder');
    });

    it('renders step dependsOn (join) and Selector outputs', () => {
        render(<UnifiedDocumentationView spec={orderToCash} isDark />);
        const close = document.getElementById('step-orderToCash-closeOrder')!;
        const deps = within(close).getByTestId('depends-on-step');
        expect(deps).toHaveTextContent('createInvoice');
        expect(deps).toHaveTextContent('createShipment');
        expect(deps).toHaveTextContent('join: all must complete');

        const selector = within(close).getByTestId('selector-value');
        expect(selector).toHaveTextContent('$response.body');
        expect(selector).toHaveTextContent('/invoice/number');
        expect(selector).toHaveTextContent('jsonpointer');
        // Workflow outputs: JSONPath RFC 9535 selectors.
        expect(screen.getAllByText('jsonpath rfc9535').length).toBeGreaterThanOrEqual(1); // 6th output folded by PropertyList (max 5)
    });

    it('renders send steps: channelPath, payload, querystring and Selector parameter', () => {
        render(<StepBody step={sendStep} isDark={false} />);
        expect(screen.getByText('↑ send')).toBeInTheDocument();
        expect(screen.getByText(sendStep.channelPath!)).toBeInTheDocument();
        expect(screen.getByText('events')).toBeInTheDocument();
        expect(screen.getByText('Message Payload')).toBeInTheDocument();
        expect(screen.getByText('querystring')).toBeInTheDocument();
        expect(screen.getByText(/Entire query string/)).toBeInTheDocument();
        expect(screen.getByTestId('selector-value')).toHaveTextContent('/filters');
    });

    it('step header: action badge and channel as target', () => {
        render(<StepHeader step={sendStep} isDark={false} />);
        expect(screen.getByText('↑ send')).toBeInTheDocument();
        expect(screen.getByText(sendStep.channelPath!)).toBeInTheDocument();
        expect(screen.getByText('events')).toBeInTheDocument();
    });

    it('helpers', () => {
        expect(splitOperationId('$sourceDescriptions.shop.createOrder')).toEqual({ source: 'shop', name: 'createOrder' });
        expect(splitOperationId('petstore.getUserById')).toEqual({ source: 'petstore', name: 'getUserById' });
        expect(formatTimeout(6000)).toBe('6 s');
        expect(formatTimeout(250)).toBe('250 ms');
        expect(formatTimeout(90000)).toBe('1.5 min');
        expect(parseStepDependency('$workflows.auth.steps.login')).toEqual({ workflowId: 'auth', stepId: 'login' });
    });
});
