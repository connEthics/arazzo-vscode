import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import type { Step } from '../types/arazzo';

interface MermaidDiagramProps {
  chart: string;
  isDark?: boolean;
  steps?: Step[];
  onNodeClick?: (nodeId: string) => void;
}

export default function MermaidDiagram({
  chart,
  isDark = false,
  steps = [],
  onNodeClick
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'strict',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: false,
        curve: 'basis',
      },
      sequence: {
        useMaxWidth: false,
        showSequenceNumbers: true,
        mirrorActors: true,
        actorMargin: 80,
        messageMargin: 40,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        bottomMarginAdj: 10,
      },
    });
  }, [isDark]);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || !containerRef.current) return;

      try {
        setError(null);
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, chart);
        setSvgContent(svg);
      } catch (e) {
        console.error('Mermaid render error:', e);
        setError(e instanceof Error ? e.message : 'Failed to render diagram');
        setSvgContent('');
      }
    };

    renderChart();
  }, [chart, isDark]);

  // Handle click on SVG elements
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!onNodeClick) return;

    const target = e.target as Element;

    // Find the closest group element
    const noteGroup = target.closest('g');
    if (!noteGroup) return;

    // Get text content from this group
    const textElements = noteGroup.querySelectorAll('text, tspan');
    let groupText = '';
    textElements.forEach(el => {
      groupText += ' ' + (el.textContent || '');
    });
    groupText = groupText.trim();

    const groupId = noteGroup.id || '';

    // Check for step header notes (blue diamond emoji)
    if (groupText.includes('\uD83D\uDD39')) {
      for (const step of steps) {
        if (groupText.includes(step.stepId)) {
          e.stopPropagation();
          onNodeClick(step.stepId);
          return;
        }
      }
    }

    // Find the step that matches this specific group's text
    for (const step of steps) {
      const stepIdRegex = new RegExp(`(^|[^a-zA-Z0-9_-])${step.stepId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-zA-Z0-9_-])`);

      if (stepIdRegex.test(groupText) || groupId.includes(step.stepId)) {
        e.stopPropagation();
        onNodeClick(step.stepId);
        return;
      }
    }

    // For flowchart nodes, also check parent groups
    const flowchartNodeElement = target.closest('.node, .cluster, [id*="flowchart"]');
    if (flowchartNodeElement) {
      const flowNodeId = flowchartNodeElement.id || '';
      const flowNodeText = flowchartNodeElement.textContent || '';

      for (const step of steps) {
        const sanitizedId = step.stepId.replace(/[^a-zA-Z0-9_]/g, '_');
        if (flowNodeId.includes(sanitizedId) || flowNodeText.includes(step.stepId)) {
          e.stopPropagation();
          onNodeClick(step.stepId);
          return;
        }
      }

      // If no steps provided but we have onNodeClick, try to extract step ID from node
      if (steps.length === 0) {
        const stepIdMatch = flowNodeText.match(/([a-z][a-z0-9_-]*)/i);
        if (stepIdMatch) {
          e.stopPropagation();
          onNodeClick(stepIdMatch[1]);
          return;
        }
      }
    }
  }, [onNodeClick, steps]);

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full p-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">Mermaid Error</p>
          <p className="text-xs mt-1 opacity-75">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`mermaid-container w-full h-full overflow-auto p-6 pt-8 cursor-pointer`}
      style={{ minHeight: '100%' }}
    >
      <div
        className="inline-block min-w-max"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      <style>{`
        /* Clickable elements - visual hint */
        .mermaid-container .node {
          cursor: pointer;
        }

        /* Flowchart nodes hover */
        .mermaid-container .node:hover rect,
        .mermaid-container .node:hover polygon {
          filter: brightness(1.05);
          stroke-width: 2.5px !important;
        }

        /* Smooth transitions for all interactive elements */
        .mermaid-container .node rect,
        .mermaid-container .node polygon,
        .mermaid-container path {
          transition: filter 0.15s ease, stroke 0.15s ease, stroke-width 0.15s ease, fill 0.15s ease;
        }

        .mermaid-container text {
          cursor: pointer;
          transition: fill 0.15s ease, font-weight 0.15s ease;
        }
      `}</style>
    </div>
  );
}
