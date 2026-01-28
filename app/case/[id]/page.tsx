'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { parseMarkdownSections, getSectionContent } from '@/lib/report/section-parser';
import { theme } from '@/styles/theme';

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
    padding: `${theme.spacing.xl} ${theme.spacing.lg}`,
    minHeight: '100vh',
  };

  // Card styles
  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.xl,
    boxShadow: theme.colors.shadowMd,
    overflow: 'hidden',
  };

  // Header styles
  const headerStyle: React.CSSProperties = {
    padding: `${theme.spacing.xl} ${theme.spacing.xl} ${theme.spacing.lg}`,
    borderBottom: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.backgroundSecondary,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    margin: `0 0 ${theme.spacing.sm} 0`,
    lineHeight: theme.typography.lineHeight.tight,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
    margin: '0',
    lineHeight: theme.typography.lineHeight.normal,
  };

  const metadataStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.md,
    display: 'flex',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
  };

  // Tab styles
  const tabNavStyle: React.CSSProperties = {
    display: 'flex',
    gap: theme.spacing.sm,
    padding: `0 ${theme.spacing.xl}`,
    borderBottom: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.background,
    overflowX: 'auto',
    flexWrap: 'wrap',
  };

  const tabButtonBaseStyle: React.CSSProperties = {
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textTertiary,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `2px solid transparent`,
    cursor: 'pointer',
    transition: theme.transition.normal,
    whiteSpace: 'nowrap',
    marginBottom: '-1px',
  };

  const tabButtonActiveStyle: React.CSSProperties = {
    ...tabButtonBaseStyle,
    color: theme.colors.primary,
    borderBottomColor: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  };

  const tabButtonHoverStyle = {
    color: theme.colors.textPrimary,
  };

  // Content styles
  const contentStyle: React.CSSProperties = {
    padding: theme.spacing.xl,
    minHeight: '400px',
  };

  const markdownContentStyle: React.CSSProperties = {
    lineHeight: theme.typography.lineHeight.relaxed,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  };

  // Loading skeleton style
  const skeletonStyle: React.CSSProperties = {
    padding: theme.spacing.xl,
    textAlign: 'center',
    color: theme.colors.textTertiary,
  };

  // Error/empty state styles
  const emptyStateStyle: React.CSSProperties = {
    padding: `${theme.spacing['2xl']} ${theme.spacing.xl}`,
    textAlign: 'center',
  };

  const emptyStateTitleStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  };

  const emptyStateTextStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.lg,
    lineHeight: theme.typography.lineHeight.relaxed,
  };

  const buttonStyle: React.CSSProperties = {
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    transition: theme.transition.normal,
  };

  // Tab description style
  const tabDescriptionStyle: React.CSSProperties = {
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottom: `1px solid ${theme.colors.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  };

  if (loading) {
    return (
      <div data-testid="report-root" style={containerStyle}>
        <div style={cardStyle}>
          <header data-testid="report-header" style={headerStyle}>
            <h1 style={titleStyle}>Decision Trace Report</h1>
          </header>
          <div style={skeletonStyle}>
            <div style={{ fontSize: theme.typography.fontSize.base, color: theme.colors.textMuted }}>Loading report...</div>
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
                e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.primary;
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
                e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.primary;
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
                  <div style={{ color: theme.colors.textTertiary, fontStyle: 'italic' }}>No evidence section found in report.</div>
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
                  <div style={{ color: theme.colors.textTertiary, fontStyle: 'italic' }}>No assumptions section found in report.</div>
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
                  <div style={{ color: theme.colors.textTertiary, fontStyle: 'italic' }}>No alternatives section found in report.</div>
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
                  <div style={{ color: theme.colors.textTertiary, fontStyle: 'italic' }}>No risks section found in report.</div>
                );
              })()}
            </div>
          )}
          {activeTab === 'diagram' && (
            <div>
              {reportData.report.mermaidDiagram ? (
                <div>
                  <pre style={{ 
                    backgroundColor: theme.colors.backgroundSecondary, 
                    padding: theme.spacing.lg, 
                    borderRadius: theme.borderRadius.lg,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    border: `1px solid ${theme.colors.border}`,
                    fontSize: theme.typography.fontSize.sm,
                    lineHeight: theme.typography.lineHeight.normal,
                    fontFamily: 'monospace',
                    color: theme.colors.textSecondary,
                  }}>
                    {reportData.report.mermaidDiagram}
                  </pre>
                  <p style={{ marginTop: theme.spacing.md, fontSize: theme.typography.fontSize.sm, color: theme.colors.textTertiary }}>
                    <a 
                      href="https://mermaid.live"
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: theme.colors.primary, textDecoration: 'underline' }}
                    >
                      Open in Mermaid Live Editor
                    </a>
                  </p>
                </div>
              ) : (
                <div style={{ color: theme.colors.textTertiary, fontStyle: 'italic', textAlign: 'center', padding: theme.spacing.xl }}>
                  No diagram available
                </div>
              )}
            </div>
          )}
          {activeTab === 'export' && (
            <div>
              <h3 style={{ 
                fontSize: theme.typography.fontSize.xl, 
                fontWeight: theme.typography.fontWeight.semibold, 
                color: theme.colors.textPrimary, 
                marginBottom: theme.spacing.sm 
              }}>
                Export Report
              </h3>
              <p style={{ 
                fontSize: theme.typography.fontSize.base, 
                color: theme.colors.textTertiary, 
                marginBottom: theme.spacing.lg,
                lineHeight: theme.typography.lineHeight.relaxed,
              }}>
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
