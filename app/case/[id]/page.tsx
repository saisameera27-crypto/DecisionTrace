'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { parseMarkdownSections, getSectionContent } from '@/lib/report/section-parser';

interface ReportData {
  caseId: string;
  report: {
    finalNarrativeMarkdown: string;
    mermaidDiagram: string | null;
    tokensUsed: number;
    durationMs: number;
    createdAt: string;
  };
  decision: {
    decisionTitle?: string;
  } | null;
}

export default function CaseReportPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse markdown sections when report data is available
  const markdownSections = useMemo(() => {
    if (!reportData?.report?.finalNarrativeMarkdown) {
      return new Map<string, string>();
    }
    return parseMarkdownSections(reportData.report.finalNarrativeMarkdown);
  }, [reportData?.report?.finalNarrativeMarkdown]);

  // Helper to render markdown (simple implementation - can be enhanced with react-markdown)
  const renderMarkdown = (markdown: string): string => {
    if (!markdown) return '';
    
    return markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Lists
      .replace(/^\- (.+)$/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      // Paragraphs
      .split('\n\n')
      .map(para => {
        if (para.trim() && !para.match(/^<[hul]/)) {
          return `<p>${para.trim()}</p>`;
        }
        return para;
      })
      .join('\n')
      // Line breaks
      .replace(/\n/g, '<br />');
  };

  // Export handler
  const handleExport = () => {
    if (!reportData?.report?.finalNarrativeMarkdown) return;
    
    const blob = new Blob([reportData.report.finalNarrativeMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decision-report-${caseId}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch(`/api/case/${caseId}/report`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to load report');
        }
        const data = await response.json();
        setReportData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (caseId) {
      fetchReport();
    }
  }, [caseId]);

  if (loading) {
    return (
      <div data-testid="report-root">
        <header data-testid="report-header">
          <h1>Decision Trace Report</h1>
        </header>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="report-root">
        <header data-testid="report-header">
          <h1>Decision Trace Report</h1>
          <h2>Report not available</h2>
        </header>
        <div>Error: {error}</div>
      </div>
    );
  }

  if (!reportData || !reportData.report) {
    return (
      <div data-testid="report-root">
        <header data-testid="report-header">
          <h1>Decision Trace Report</h1>
          <h2>Report not available</h2>
        </header>
      </div>
    );
  }

  return (
    <div data-testid="report-root">
      <header data-testid="report-header">
        <h1>Decision Trace Report</h1>
        {reportData.decision?.decisionTitle ? (
          <h2>{reportData.decision.decisionTitle}</h2>
        ) : (
          <h2>Report not available</h2>
        )}
      </header>

      <nav>
        <button
          data-testid="tab-overview"
          onClick={() => setActiveTab('overview')}
          aria-pressed={activeTab === 'overview'}
        >
          Overview
        </button>
        <button
          data-testid="tab-evidence"
          onClick={() => setActiveTab('evidence')}
          aria-pressed={activeTab === 'evidence'}
        >
          Evidence
        </button>
        <button
          data-testid="tab-assumptions"
          onClick={() => setActiveTab('assumptions')}
          aria-pressed={activeTab === 'assumptions'}
        >
          Assumptions
        </button>
        <button
          data-testid="tab-alternatives"
          onClick={() => setActiveTab('alternatives')}
          aria-pressed={activeTab === 'alternatives'}
        >
          Alternatives
        </button>
        <button
          data-testid="tab-risks"
          onClick={() => setActiveTab('risks')}
          aria-pressed={activeTab === 'risks'}
        >
          Risks
        </button>
        <button
          data-testid="tab-diagram"
          onClick={() => setActiveTab('diagram')}
          aria-pressed={activeTab === 'diagram'}
        >
          Diagram
        </button>
        <button
          data-testid="tab-export"
          onClick={() => setActiveTab('export')}
          aria-pressed={activeTab === 'export'}
        >
          Export
        </button>
      </nav>

      <main data-testid="report-content">
        {activeTab === 'overview' && (
          <div>
            {(() => {
              const overviewContent = getSectionContent(markdownSections, 'overview') || 
                                     getSectionContent(markdownSections, 'summary') ||
                                     reportData.report.finalNarrativeMarkdown;
              return (
                <div 
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(overviewContent) }}
                  style={{ lineHeight: '1.6' }}
                />
              );
            })()}
          </div>
        )}
        {activeTab === 'evidence' && (
          <div>
            {(() => {
              const evidenceContent = getSectionContent(markdownSections, 'evidence');
              return evidenceContent ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(evidenceContent) }}
                  style={{ lineHeight: '1.6' }}
                />
              ) : (
                <div>No evidence section found in report.</div>
              );
            })()}
          </div>
        )}
        {activeTab === 'assumptions' && (
          <div>
            {(() => {
              const assumptionsContent = getSectionContent(markdownSections, 'assumptions');
              return assumptionsContent ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(assumptionsContent) }}
                  style={{ lineHeight: '1.6' }}
                />
              ) : (
                <div>No assumptions section found in report.</div>
              );
            })()}
          </div>
        )}
        {activeTab === 'alternatives' && (
          <div>
            {(() => {
              const alternativesContent = getSectionContent(markdownSections, 'alternatives');
              return alternativesContent ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(alternativesContent) }}
                  style={{ lineHeight: '1.6' }}
                />
              ) : (
                <div>No alternatives section found in report.</div>
              );
            })()}
          </div>
        )}
        {activeTab === 'risks' && (
          <div>
            {(() => {
              const risksContent = getSectionContent(markdownSections, 'risks');
              return risksContent ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(risksContent) }}
                  style={{ lineHeight: '1.6' }}
                />
              ) : (
                <div>No risks section found in report.</div>
              );
            })()}
          </div>
        )}
        {activeTab === 'diagram' && (
          <div>
            {reportData.report.mermaidDiagram ? (
              <div>
                <pre style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '1rem', 
                  borderRadius: '4px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {reportData.report.mermaidDiagram}
                </pre>
                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                  <a 
                    href="https://mermaid.live"
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#0066cc', textDecoration: 'underline' }}
                  >
                    Open in Mermaid Live Editor
                  </a>
                </p>
              </div>
            ) : (
              <div>No diagram available</div>
            )}
          </div>
        )}
        {activeTab === 'export' && (
          <div>
            <h3>Export Report</h3>
            <p>Download the full report as a Markdown file.</p>
            <button
              onClick={handleExport}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Download Report (.md)
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
