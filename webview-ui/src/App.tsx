import { useState, useEffect } from 'react';
import UnifiedDocumentationView from './components/UnifiedDocumentationView';
import FlowchartView from './components/FlowchartView';
import { ArazzoSpec } from './types/arazzo';

// Mock data for initial render if needed, or empty
const emptySpec: ArazzoSpec = {
  arazzo: '1.0.0',
  info: { title: 'Loading...', version: '0.0.0' },
  sourceDescriptions: [],
  workflows: []
};

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void; getState(): unknown; setState(state: unknown): void; };
const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;

function App() {
  const [spec, setSpec] = useState<ArazzoSpec>(emptySpec);
  const [isDark, setIsDark] = useState(true);
  const [viewMode, setViewMode] = useState<'documentation' | 'flowchart' | 'error'>('documentation');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for messages from the extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'update') {
        if (!message.spec) {
          setError('Failed to load document data');
          setViewMode('error');
          return;
        }
        setError(null);
        setSpec(message.spec);
        setViewMode('documentation');
      } else if (message.type === 'update-flowchart') {
        if (!message.spec) {
          setError('Failed to load document data');
          setViewMode('error');
          return;
        }
        setError(null);
        setSpec(message.spec);
        setViewMode('flowchart');
        if (message.workflowId) {
            setSelectedWorkflowId(message.workflowId);
        }
      } else if (message.type === 'select-workflow') {
          setSelectedWorkflowId(message.workflowId);
      } else if (message.type === 'scroll-to-step') {
          handleStepClick(message.stepId, message.workflowId);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Signal ready
    if (vscode) {
        vscode.postMessage({ type: 'ready' });
    }

    // Theme detection
    const updateTheme = () => {
      const body = document.body;
      const isDarkTheme = body.classList.contains('vscode-dark') || body.classList.contains('vscode-high-contrast');
      setIsDark(isDarkTheme);
    };

    // Initial check
    updateTheme();

    // Observer for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('message', handleMessage);
      observer.disconnect();
    };
  }, []);

  const handleStepClick = (stepId: string, workflowId?: string) => {
    // If workflowId is not provided, we can't construct the ID reliably
    // But we can try to find it if we assume unique step IDs or just search
    if (!workflowId) {
        console.warn('No workflowId provided for navigation to step:', stepId);
        return;
    }
    const elementId = `step-${workflowId}-${stepId}`;
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Highlight effect
      element.classList.add('ring-2', 'ring-offset-2', 'ring-indigo-500');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-offset-2', 'ring-indigo-500');
      }, 2000);
    } else {
        console.warn('Element not found:', elementId);
    }
  };

  const handleWorkflowSelect = (workflowId: string) => {
      // If we are in "all workflows" mode, we might want to scroll.
      // But UnifiedDocumentationView might handle this differently.
      // For now, let's just try to scroll if the element exists.
      const elementId = `workflow-${workflowId}`;
      const element = document.getElementById(elementId);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
  };

  const handleRetry = () => {
    setError(null);
    setViewMode('documentation');
    if (vscode) {
      vscode.postMessage({ type: 'ready' });
    }
  };

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
            isDark={isDark} 
            selectedWorkflowId={selectedWorkflowId}
            onWorkflowSelect={setSelectedWorkflowId}
            onStepSelect={(stepId, workflowId) => {
                if (vscode) {
                    vscode.postMessage({ type: 'step-selected', stepId, workflowId });
                }
            }}
        />
      ) : (
        <UnifiedDocumentationView 
            spec={spec} 
            isDark={isDark} 
            onStepClick={handleStepClick}
            onWorkflowSelect={handleWorkflowSelect}
        />
      )}
    </div>
  );
}

export default App;
