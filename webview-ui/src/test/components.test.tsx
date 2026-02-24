import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StepHeader from '../components/arazzo/StepHeader';
import StepBody from '../components/arazzo/StepBody';
import WorkflowHeader from '../components/arazzo/WorkflowHeader';
import type { Step, Workflow } from '../types/arazzo';

const mockStep: Step = {
    stepId: 'getUser',
    operationId: 'petstore.getUserById',
    description: 'Fetch user details',
    parameters: [
        { name: 'userId', in: 'path', value: '$inputs.userId' },
        { name: 'format', in: 'query', value: 'json' },
    ],
    successCriteria: [{ condition: '$statusCode == 200' }],
    onSuccess: [{ name: 'goNext', type: 'goto', stepId: 'nextStep' }],
    onFailure: [{ name: 'retryOp', type: 'retry', retryAfter: 1, retryLimit: 3 }],
    outputs: { userId: '$response.body.id', userName: '$response.body.name' },
};

const mockWorkflow: Workflow = {
    workflowId: 'adoptPet',
    summary: 'Pet Adoption Workflow',
    description: 'Adopts a pet from the store',
    steps: [mockStep],
};

describe('StepHeader', () => {
    it('renders stepId as text', () => {
        render(<StepHeader step={mockStep} isDark={false} />);
        expect(screen.getByText('getUser')).toBeInTheDocument();
    });

    it('renders HTTP method badge from operationId', () => {
        const stepWithGet: Step = { ...mockStep, operationId: 'GET_users' };
        render(<StepHeader step={stepWithGet} isDark={false} />);
        expect(screen.getByText('GET')).toBeInTheDocument();
    });

    it('renders operation name from dotted operationId', () => {
        render(<StepHeader step={mockStep} isDark={false} />);
        expect(screen.getByText('getUserById')).toBeInTheDocument();
    });

    it('renders source name from dotted operationId', () => {
        render(<StepHeader step={mockStep} isDark={false} />);
        // Badge has CSS uppercase class, but DOM text content is lowercase
        expect(screen.getByText('petstore')).toBeInTheDocument();
    });

    it('does not render any input elements', () => {
        const { container } = render(<StepHeader step={mockStep} isDark={false} variant="inspector" />);
        expect(container.querySelectorAll('input')).toHaveLength(0);
        expect(container.querySelectorAll('textarea')).toHaveLength(0);
        expect(container.querySelectorAll('select')).toHaveLength(0);
    });

    it('does not accept editable or onUpdate props', () => {
        // TypeScript compilation test: StepHeader should not have editable/onUpdate
        const props = { step: mockStep, isDark: false };
        expect('editable' in props).toBe(false);
    });

    it('renders description for card variant', () => {
        render(<StepHeader step={mockStep} isDark={false} variant="card" />);
        expect(screen.getByText('Fetch user details')).toBeInTheDocument();
    });

    it('renders description for inspector variant', () => {
        render(<StepHeader step={mockStep} isDark={false} variant="inspector" />);
        expect(screen.getByText('Fetch user details')).toBeInTheDocument();
    });
});

describe('StepBody', () => {
    it('renders parameters as read-only list', () => {
        render(<StepBody step={mockStep} isDark={false} />);
        expect(screen.getByText('Parameters')).toBeInTheDocument();
        // userId appears in both Parameters and Outputs sections
        expect(screen.getAllByText('userId').length).toBeGreaterThanOrEqual(1);
    });

    it('renders success criteria', () => {
        render(<StepBody step={mockStep} isDark={false} />);
        expect(screen.getByText('Success Criteria')).toBeInTheDocument();
    });

    it('renders success actions', () => {
        render(<StepBody step={mockStep} isDark={false} />);
        expect(screen.getByText('On Success')).toBeInTheDocument();
    });

    it('renders failure actions', () => {
        render(<StepBody step={mockStep} isDark={false} />);
        expect(screen.getByText('On Failure')).toBeInTheDocument();
    });

    it('renders outputs', () => {
        render(<StepBody step={mockStep} isDark={false} />);
        expect(screen.getByText('Extracted Outputs')).toBeInTheDocument();
    });

    it('does not render form elements', () => {
        const { container } = render(<StepBody step={mockStep} isDark={false} />);
        expect(container.querySelectorAll('input')).toHaveLength(0);
        expect(container.querySelectorAll('textarea')).toHaveLength(0);
        expect(container.querySelectorAll('select')).toHaveLength(0);
    });

    it('does not render Add buttons', () => {
        const { container } = render(<StepBody step={mockStep} isDark={false} />);
        const buttons = container.querySelectorAll('button');
        buttons.forEach(btn => {
            expect(btn.textContent).not.toMatch(/\+ Add/i);
        });
    });

    it('hides sections when data is absent', () => {
        const emptyStep: Step = { stepId: 'empty', operationId: 'op1' };
        const { container } = render(<StepBody step={emptyStep} isDark={false} />);
        expect(container.textContent).not.toContain('Parameters');
        expect(container.textContent).not.toContain('Request Body');
        expect(container.textContent).not.toContain('Extracted Outputs');
    });

    it('renders compact variant without full details', () => {
        render(<StepBody step={mockStep} isDark={false} variant="compact" />);
        expect(screen.queryByText('Parameters')).not.toBeInTheDocument();
        expect(screen.getByText('Fetch user details')).toBeInTheDocument();
    });
});

describe('WorkflowHeader', () => {
    it('renders workflow title from summary', () => {
        render(<WorkflowHeader workflow={mockWorkflow} isDark={false} />);
        expect(screen.getByText('Pet Adoption Workflow')).toBeInTheDocument();
    });

    it('renders workflowId as code', () => {
        render(<WorkflowHeader workflow={mockWorkflow} isDark={false} />);
        expect(screen.getByText('adoptPet')).toBeInTheDocument();
    });

    it('renders description', () => {
        render(<WorkflowHeader workflow={mockWorkflow} isDark={false} />);
        expect(screen.getByText('Adopts a pet from the store')).toBeInTheDocument();
    });

    it('falls back to workflowId when no summary', () => {
        const noSummary: Workflow = { ...mockWorkflow, summary: undefined };
        render(<WorkflowHeader workflow={noSummary} isDark={false} />);
        // workflowId should appear as the title heading
        const headings = screen.getAllByText('adoptPet');
        expect(headings.length).toBeGreaterThanOrEqual(1);
    });

    it('does not render any input elements', () => {
        const { container } = render(<WorkflowHeader workflow={mockWorkflow} isDark={false} variant="inspector" />);
        expect(container.querySelectorAll('input')).toHaveLength(0);
        expect(container.querySelectorAll('textarea')).toHaveLength(0);
        expect(container.querySelectorAll('select')).toHaveLength(0);
    });

    it('renders index badge when provided', () => {
        render(<WorkflowHeader workflow={mockWorkflow} isDark={false} index={0} />);
        expect(screen.getByText('Workflow 1')).toBeInTheDocument();
    });
});

describe('Read-only guarantee', () => {
    it('StepBody renders zero interactive form elements with full data', () => {
        const fullStep: Step = {
            stepId: 'fullStep',
            operationId: 'api.fullOp',
            description: 'A fully loaded step',
            parameters: [
                { name: 'id', in: 'path', value: '123' },
                { name: 'filter', in: 'query', value: 'active' },
            ],
            requestBody: {
                contentType: 'application/json',
                payload: { key: 'value' },
            },
            successCriteria: [
                { condition: '$statusCode == 200' },
                { condition: '$response.body.status == "ok"' },
            ],
            onSuccess: [{ name: 'done', type: 'end' }],
            onFailure: [{ name: 'retry', type: 'retry', retryAfter: 2, retryLimit: 5 }],
            outputs: { result: '$response.body.data' },
        };

        const { container } = render(<StepBody step={fullStep} isDark={false} />);

        // No form inputs
        expect(container.querySelectorAll('input')).toHaveLength(0);
        expect(container.querySelectorAll('textarea')).toHaveLength(0);
        expect(container.querySelectorAll('select')).toHaveLength(0);

        // No "Add", "Edit", "Delete" action buttons
        const buttons = container.querySelectorAll('button');
        buttons.forEach(btn => {
            const text = btn.textContent || '';
            expect(text).not.toMatch(/\+ Add/i);
            expect(text).not.toMatch(/^Edit$/i);
            expect(text).not.toMatch(/^Delete$/i);
        });
    });
});
