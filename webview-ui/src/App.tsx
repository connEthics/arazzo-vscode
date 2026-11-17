import { useState, useEffect, useCallback } from 'react';
import type { ArazzoGraphOptions, ExportEvent } from '@connethics/arazzo-flow';
import type { Diagnostic } from '@connethics/arazzo-core';
import UnifiedDocumentationView from './components/UnifiedDocumentationView';
import FlowchartView, { type StepNavigation } from './components/FlowchartView';
import { ArazzoSpec } from './types/arazzo';

const emptySpec: ArazzoSpec = {
  arazzo: '1.1.0',
  info: { title: 'Loading...', version: '0.0.0' },
  sourceDescriptions: [],
  workflows: []
};

interface VsCodeApi { postMessage(msg: unknown): void; getState(): unknown; setState(state: unknown): void; }
declare function acquireVsCodeApi(): VsCodeApi;
const vscode: VsCodeApi | null = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;

interface PersistedState { graphOptions?: Partial<ArazzoGraphOptions>; }

function readState(): PersistedState {
  const s = vscode?.getState();
  return s && typeof s === 'object' ? s as PersistedState : {};
}

/** VS Code theme kind from the webview body classes (HC light also carries `vscode-high-contrast`). */
export function readThemeFlags(body: HTMLElement = document.body): { isDark: boolean; highContrast: boolean } {
  const c = body.classList;
  const hcLight = c.contains('vscode-high-contrast-light');
  const highContrast = hcLight || c.contains('vscode-high-contrast');
  const isDark = c.contains('vscode-dark') || (highContrast && !hcLight);
  return { isDark, highContrast };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function App() {
  const [spec, setSpec] = useState<ArazzoSpec>(emptySpec);
  const [theme, setTheme] = useState(() => readThemeFlags());
  const [viewMode, setViewMode] = useState<'documentation' | 'flowchart' | 'error'>('documentation');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | undefined>(undefined);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[] | undefined>(undefined);
  const [sources, setSources] = useState<Record<string, unknown> | undefined>(undefined);
  const [graphOptions, setGraphOptions] = useState<Partial<ArazzoGraphOptions> | undefined>(() => readState().graphOptions);
  const [error, setError] = useState<string | null>(null);

  const handleStepClick = useCallback((stepId: string, workflowId?: string) => {
    if (!workflowId) {
        console.warn('No workflowId provided for navigation to step:', stepId);
        return;
    }
    const element = document.getElementById(`step-${workflowId}-${stepId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element.classList.add('ring-2', 'ring-offset-2', 'ring-indigo-500');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-offset-2', 'ring-indigo-500');
      }, 2000);
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.type === 'update' || message.type === 'update-flowchart') {
        if (!message.spec) {
          setError('Failed to load document data');
          setViewMode('error');
          return;
        }
        setError(null);
        setSpec(message.spec);
        if (message.type === 'update') {
          setViewMode('documentation');
          return;
        }
        setViewMode('flowchart');
        setDiagnostics(Array.isArray(message.diagnostics) ? message.diagnostics : undefined);
        if (message.sources && typeof message.sources === 'object') setSources(message.sources);
        if (message.workflowId) setSelectedWorkflowId(message.workflowId);
      } else if (message.type === 'select-workflow') {
        if (message.workflowId) setSelectedWorkflowId(message.workflowId);
        setSelectedStepId(typeof message.stepId === 'string' ? message.stepId : null);
      } else if (message.type === 'scroll-to-step') {
        handleStepClick(message.stepId, message.workflowId);
      }
    };

    window.addEventListener('message', handleMessage);
    vscode?.postMessage({ type: 'ready' });

    const updateTheme = () => setTheme((prev) => {
      const next = readThemeFlags();
      return prev.isDark === next.isDark && prev.highContrast === next.highContrast ? prev : next;
    });
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('message', handleMessage);
      observer.disconnect();
    };
  }, [handleStepClick]);

  const handleWorkflowSelect = (workflowId: string) => {
      const element = document.getElementById(`workflow-${workflowId}`);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
  };

  const handleFlowchartWorkflowSelect = useCallback((workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    setSelectedStepId(null);
    vscode?.postMessage({ type: 'workflow-selected', workflowId });
  }, []);

  const handleStepNavigate = useCallback((nav: StepNavigation) => {
    setSelectedStepId(nav.stepId);
    vscode?.postMessage({ type: 'step-selected', ...nav });
  }, []);

  const handleCopyMermaid = useCallback((text: string, workflowId: string) => {
    vscode?.postMessage({ type: 'copy-mermaid', text, workflowId });
  }, []);

  const handleExport = useCallback((e: ExportEvent) => {
    void (async () => {
      const data = e.text ?? (e.blob ? await blobToBase64(e.blob) : undefined);
      if (data === undefined) return;
      vscode?.postMessage({ type: 'export', format: e.format, filename: e.filename, encoding: e.text !== undefined ? 'utf8' : 'base64', data });
    })();
  }, []);

  const handleOptionsChange = useCallback((o: ArazzoGraphOptions) => {
    setGraphOptions(o);
    vscode?.setState({ ...readState(), graphOptions: o });
  }, []);

  const handleRetry = () => {
    setError(null);
    setViewMode('documentation');
    vscode?.postMessage({ type: 'ready' });
  };

  const lang = typeof navigator !== 'undefined' && /^fr\b/i.test(navigator.language) ? 'fr' : 'en';

  return (
    <div className="min-h-screen bg-[var(--vscode-editor-background)] text-[var(--vscode-editor-foreground)]">
      {viewMode === 'error' ? (
        <div className="flex items-center justify-center p-4">
          <div className="p-4 rounded border" style={{ borderColor: 'var(--vscode-inputValidation-errorBorder, #be1100)', backgroundColor: 'var(--vscode-inputValidation-errorBackground, #5a1d1d)' }}>
            <p className="mb-2" style={{ color: 'var(--vscode-errorForeground, #f48771)' }}>{error || 'An error occurred'}</p>
            <button
              onClick={handleRetry}
              className="px-3 py-1 rounded text-sm"
              style={{ backgroundColor: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)' }}
            >
              Retry
            </button>
          </div>
        </div>
      ) : viewMode === 'flowchart' ? (
        <FlowchartView
            spec={spec}
            selectedWorkflowId={selectedWorkflowId}
            selectedStepId={selectedStepId}
            onWorkflowSelect={handleFlowchartWorkflowSelect}
            onStepNavigate={handleStepNavigate}
            onCopyMermaid={handleCopyMermaid}
            onExport={handleExport}
            diagnostics={diagnostics}
            sources={sources}
            highContrast={theme.highContrast}
            lang={lang}
            options={graphOptions}
            onOptionsChange={handleOptionsChange}
        />
      ) : (
        <UnifiedDocumentationView
            spec={spec}
            isDark={theme.isDark}
            onStepClick={handleStepClick}
            onWorkflowSelect={handleWorkflowSelect}
        />
      )}
    </div>
  );
}

export default App;
