'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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

      <main>
        {activeTab === 'overview' && (
          <div>
            <div dangerouslySetInnerHTML={{ __html: reportData.report.finalNarrativeMarkdown.replace(/\n/g, '<br />') }} />
          </div>
        )}
        {activeTab === 'evidence' && <div>Evidence content</div>}
        {activeTab === 'assumptions' && <div>Assumptions content</div>}
        {activeTab === 'alternatives' && <div>Alternatives content</div>}
        {activeTab === 'risks' && <div>Risks content</div>}
        {activeTab === 'diagram' && (
          <div>
            {reportData.report.mermaidDiagram ? (
              <pre>{reportData.report.mermaidDiagram}</pre>
            ) : (
              <div>No diagram available</div>
            )}
          </div>
        )}
        {activeTab === 'export' && <div>Export options</div>}
      </main>
    </div>
  );
}

