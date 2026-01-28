'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const router = useRouter();
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

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return null;
    }
  };

  // Tab descriptions mapping
  const tabDescriptions: Record<string, string> = {
    overview: 'High-level summary of the decision, stakeholders, and context.',
    evidence: 'Supporting facts and inputs used to reach the decision.',
    assumptions: 'Assumptions made due to missing or uncertain information.',
    alternatives: 'Other options considered and why they were not chosen.',
    risks: 'Risks identified and what could go wrong.',
    diagram: 'A visual map of how evidence, reasoning, and outcomes connect.',
    export: 'Download and share this report in a portable format.',
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

  // Container styles
  const containerStyle: React.CSSProperties = {
    maxWidth: '1024px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    minHeight: '100vh',
  };

  // Card styles
  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
  };

  // Header styles
  const headerStyle: React.CSSProperties = {
    padding: '2rem 2rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.5rem 0',
    lineHeight: '1.2',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: '500',
    color: '#4b5563',
    margin: '0',
    lineHeight: '1.4',
  };

  const metadataStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.75rem',
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  };

  // Tab styles
  const tabNavStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    padding: '0 2rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    overflowX: 'auto',
    flexWrap: 'wrap',
  };

  const tabButtonBaseStyle: React.CSSProperties = {
    padding: '0.75rem 1.25rem',
    fontSize: '0.9375rem',
    fontWeight: '500',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    marginBottom: '-1px',
  };

  const tabButtonActiveStyle: React.CSSProperties = {
    ...tabButtonBaseStyle,
    color: '#0066cc',
    borderBottomColor: '#0066cc',
    fontWeight: '600',
  };

  const tabButtonHoverStyle = {
    color: '#111827',
  };

  // Content styles
  const contentStyle: React.CSSProperties = {
    padding: '2rem',
    minHeight: '400px',
  };

  const markdownContentStyle: React.CSSProperties = {
    lineHeight: '1.75',
    fontSize: '1rem',
    color: '#374151',
  };

  // Loading skeleton style
  const skeletonStyle: React.CSSProperties = {
    padding: '2rem',
    textAlign: 'center',
    color: '#6b7280',
  };

  // Error/empty state styles
  const emptyStateStyle: React.CSSProperties = {
    padding: '3rem 2rem',
    textAlign: 'center',
  };

  const emptyStateTitleStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.5rem',
  };

  const emptyStateTextStyle: React.CSSProperties = {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'background-color 0.2s ease',
  };

  // Tab description style
  const tabDescriptionStyle: React.CSSProperties = {
    padding: '0.75rem 2rem',
    fontSize: '0.875rem',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  if (loading) {
    return (
      <div data-testid="report-root" style={containerStyle}>
        <div style={cardStyle}>
          <header data-testid="report-header" style={headerStyle}>
            <h1 style={titleStyle}>Decision Trace Report</h1>
          </header>
          <div style={skeletonStyle}>
            <div style={{ fontSize: '1rem', color: '#9ca3af' }}>Loading report...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="report-root" style={containerStyle}>
        <div style={cardStyle}>
          <header data-testid="report-header" style={headerStyle}>
            <h1 style={titleStyle}>Decision Trace Report</h1>
            <h2 style={subtitleStyle}>Report not available</h2>
          </header>
          <div style={emptyStateStyle}>
            <div style={emptyStateTitleStyle}>Unable to load report</div>
            <div style={emptyStateTextStyle}>{error}</div>
            <button
              onClick={() => router.push('/')}
              style={buttonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0052a3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0066cc';
              }}
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData || !reportData.report) {
    return (
      <div data-testid="report-root" style={containerStyle}>
        <div style={cardStyle}>
          <header data-testid="report-header" style={headerStyle}>
            <h1 style={titleStyle}>Decision Trace Report</h1>
            <h2 style={subtitleStyle}>Report not available</h2>
          </header>
          <div style={emptyStateStyle}>
            <div style={emptyStateTitleStyle}>No report data found</div>
            <div style={emptyStateTextStyle}>This report may not exist or may have been deleted.</div>
            <button
              onClick={() => router.push('/')}
              style={buttonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0052a3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0066cc';
              }}
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="report-root" style={containerStyle}>
      <div style={cardStyle}>
        <header data-testid="report-header" style={headerStyle}>
          <h1 style={titleStyle}>Decision Trace Report</h1>
          {reportData.decision?.decisionTitle ? (
            <h2 style={subtitleStyle}>{reportData.decision.decisionTitle}</h2>
          ) : (
            <h2 style={subtitleStyle}>Report not available</h2>
          )}
          {reportData.report.createdAt && (
            <div style={metadataStyle}>
              <span>Last updated: {formatDate(reportData.report.createdAt) || 'Unknown'}</span>
              {reportData.report.tokensUsed > 0 && (
                <span>• Tokens used: {reportData.report.tokensUsed.toLocaleString()}</span>
              )}
            </div>
          )}
        </header>

        <nav style={tabNavStyle}>
          <button
            data-testid="tab-overview"
            onClick={() => setActiveTab('overview')}
            aria-pressed={activeTab === 'overview'}
            style={activeTab === 'overview' ? tabButtonActiveStyle : tabButtonBaseStyle}
            onMouseEnter={(e) => {
              if (activeTab !== 'overview') {
                Object.assign(e.currentTarget.style, tabButtonHoverStyle);
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'overview') {
                e.currentTarget.style.color = tabButtonBaseStyle.color || '';
              }
            }}
          >
            Overview
          </button>
          <button
            data-testid="tab-evidence"
            onClick={() => setActiveTab('evidence')}
            aria-pressed={activeTab === 'evidence'}
            style={activeTab === 'evidence' ? tabButtonActiveStyle : tabButtonBaseStyle}
            onMouseEnter={(e) => {
              if (activeTab !== 'evidence') {
                Object.assign(e.currentTarget.style, tabButtonHoverStyle);
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'evidence') {
                e.currentTarget.style.color = tabButtonBaseStyle.color || '';
              }
            }}
          >
            Evidence
          </button>
          <button
            data-testid="tab-assumptions"
            onClick={() => setActiveTab('assumptions')}
            aria-pressed={activeTab === 'assumptions'}
            style={activeTab === 'assumptions' ? tabButtonActiveStyle : tabButtonBaseStyle}
            onMouseEnter={(e) => {
              if (activeTab !== 'assumptions') {
                Object.assign(e.currentTarget.style, tabButtonHoverStyle);
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'assumptions') {
                e.currentTarget.style.color = tabButtonBaseStyle.color || '';
              }
            }}
          >
            Assumptions
          </button>
          <button
            data-testid="tab-alternatives"
            onClick={() => setActiveTab('alternatives')}
            aria-pressed={activeTab === 'alternatives'}
            style={activeTab === 'alternatives' ? tabButtonActiveStyle : tabButtonBaseStyle}
            onMouseEnter={(e) => {
              if (activeTab !== 'alternatives') {
                Object.assign(e.currentTarget.style, tabButtonHoverStyle);
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'alternatives') {
                e.currentTarget.style.color = tabButtonBaseStyle.color || '';
              }
            }}
          >
            Alternatives
          </button>
          <button
            data-testid="tab-risks"
            onClick={() => setActiveTab('risks')}
            aria-pressed={activeTab === 'risks'}
            style={activeTab === 'risks' ? tabButtonActiveStyle : tabButtonBaseStyle}
            onMouseEnter={(e) => {
              if (activeTab !== 'risks') {
                Object.assign(e.currentTarget.style, tabButtonHoverStyle);
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'risks') {
                e.currentTarget.style.color = tabButtonBaseStyle.color || '';
              }
            }}
          >
            Risks
          </button>
          <button
            data-testid="tab-diagram"
            onClick={() => setActiveTab('diagram')}
            aria-pressed={activeTab === 'diagram'}
            style={activeTab === 'diagram' ? tabButtonActiveStyle : tabButtonBaseStyle}
            onMouseEnter={(e) => {
              if (activeTab !== 'diagram') {
                Object.assign(e.currentTarget.style, tabButtonHoverStyle);
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'diagram') {
                e.currentTarget.style.color = tabButtonBaseStyle.color || '';
              }
            }}
          >
            Diagram
          </button>
          <button
            data-testid="tab-export"
            onClick={() => setActiveTab('export')}
            aria-pressed={activeTab === 'export'}
            style={activeTab === 'export' ? tabButtonActiveStyle : tabButtonBaseStyle}
            onMouseEnter={(e) => {
              if (activeTab !== 'export') {
                Object.assign(e.currentTarget.style, tabButtonHoverStyle);
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'export') {
                e.currentTarget.style.color = tabButtonBaseStyle.color || '';
              }
            }}
          >
            Export
          </button>
        </nav>

        <div data-testid="tab-description" style={tabDescriptionStyle}>
          <span style={{ fontSize: '0.875rem' }}>ℹ️</span>
          <span>{tabDescriptions[activeTab] || tabDescriptions.overview}</span>
        </div>

        <main data-testid="report-content" style={contentStyle}>
          {activeTab === 'overview' && (
            <div>
              {(() => {
                const overviewContent = getSectionContent(markdownSections, 'overview') || 
                                       getSectionContent(markdownSections, 'summary') ||
                                       reportData.report.finalNarrativeMarkdown;
                return (
                  <div 
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(overviewContent) }}
                    style={markdownContentStyle}
                    className="markdown-content"
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
                    style={markdownContentStyle}
                    className="markdown-content"
                  />
                ) : (
                  <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No evidence section found in report.</div>
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
                    style={markdownContentStyle}
                    className="markdown-content"
                  />
                ) : (
                  <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No assumptions section found in report.</div>
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
                    style={markdownContentStyle}
                    className="markdown-content"
                  />
                ) : (
                  <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No alternatives section found in report.</div>
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
                    style={markdownContentStyle}
                    className="markdown-content"
                  />
                ) : (
                  <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No risks section found in report.</div>
                );
              })()}
            </div>
          )}
          {activeTab === 'diagram' && (
            <div>
              {reportData.report.mermaidDiagram ? (
                <div>
                  <pre style={{ 
                    backgroundColor: '#f9fafb', 
                    padding: '1.5rem', 
                    borderRadius: '8px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    fontFamily: 'monospace',
                    color: '#374151',
                  }}>
                    {reportData.report.mermaidDiagram}
                  </pre>
                  <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
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
                <div style={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                  No diagram available
                </div>
              )}
            </div>
          )}
          {activeTab === 'export' && (
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                Export Report
              </h3>
              <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                Download the full report as a Markdown file.
              </p>
              <button
                onClick={handleExport}
                style={buttonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0052a3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#0066cc';
                }}
              >
                Download Report (.md)
              </button>
            </div>
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .markdown-content h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #111827;
          margin: 2rem 0 1rem 0;
          line-height: 1.3;
        }
        .markdown-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin: 1.5rem 0 0.75rem 0;
          line-height: 1.4;
        }
        .markdown-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
          margin: 1.25rem 0 0.5rem 0;
          line-height: 1.4;
        }
        .markdown-content p {
          margin: 0 0 1rem 0;
          line-height: 1.75;
        }
        .markdown-content ul {
          margin: 0 0 1rem 0;
          padding-left: 1.5rem;
          list-style-type: disc;
        }
        .markdown-content li {
          margin: 0.5rem 0;
          line-height: 1.75;
        }
        .markdown-content strong {
          font-weight: 600;
          color: #111827;
        }
        .markdown-content em {
          font-style: italic;
        }
        .markdown-content a {
          color: #0066cc;
          text-decoration: underline;
        }
        .markdown-content a:hover {
          color: #0052a3;
        }
      ` }} />
    </div>
  );
}
