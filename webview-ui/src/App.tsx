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

// @ts-ignore
const vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : null;

function App() {
  const [spec, setSpec] = useState<ArazzoSpec>(emptySpec);
  const [isDark, setIsDark] = useState(true);
  const [viewMode, setViewMode] = useState<'documentation' | 'flowchart'>('documentation');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Listen for messages from the extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'update') {
        setSpec(message.spec);
        setViewMode('documentation');
      } else if (message.type === 'update-flowchart') {
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

  return (
    <div className="min-h-screen bg-[var(--vscode-editor-background)] text-[var(--vscode-editor-foreground)]">
      {viewMode === 'flowchart' ? (
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
