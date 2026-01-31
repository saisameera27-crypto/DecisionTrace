/**
 * Demo Report Template
 * Provides deterministic demo report data for demo mode
 * Used when DEMO_MODE=true and no API key is present
 */

export interface DemoReportData {
  caseId: string;
  report: {
    finalNarrativeMarkdown: string;
    mermaidDiagram: string | null;
    tokensUsed: number;
    durationMs: number;
    createdAt: string;
  };
  decision: {
    title: string;
    date: string;
    decisionMaker: string;
    status: string;
  } | null;
}

/**
 * Generate a deterministic demo case ID based on uploaded filename
 */
export function generateDemoCaseId(filename: string): string {
  // Create a deterministic ID from filename + timestamp (rounded to minute for stability)
  const timestamp = Math.floor(Date.now() / 60000) * 60000; // Round to minute
  const hash = filename.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return `demo-case-${Math.abs(hash)}-${timestamp}`;
}

/**
 * Get demo report data (deterministic template)
 */
export function getDemoReport(filename: string): DemoReportData {
  const caseId = generateDemoCaseId(filename);
  const now = new Date().toISOString();

  return {
    caseId,
    report: {
      finalNarrativeMarkdown: `# Decision Trace Report

## Decision Overview
**Title**: Decision Analysis for "${filename}"
**Date**: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
**Decision Maker**: Demo User
**Status**: ANALYZED

## Summary
This is a demo report generated from the uploaded document "${filename}". In demo mode, the system provides instant analysis without requiring API keys or database connections.

## Key Evidence
- Document uploaded: ${filename}
- Analysis completed in demo mode
- Report generated deterministically for testing

## Assumptions
- Document contains decision-related information
- Analysis is based on standard decision trace patterns
- Demo mode provides instant results

## Risks Identified
- Demo mode uses template data
- For production analysis, enable Gemini API key
- Results are deterministic and not AI-generated

## Stakeholders
- Demo User
- Analysis System

## Alternatives Considered
- Manual review
- AI-powered analysis (requires API key)
- Template-based reporting (demo mode)

## Next Steps
1. Review the uploaded document
2. Enable Gemini API key for live analysis
3. Run full orchestrator pipeline for detailed insights`,
      mermaidDiagram: `graph TD
    A[Upload: ${filename}] --> B[Demo Analysis]
    B --> C[Report Generated]
    C --> D[Review Complete]
    D --> E[Demo Mode Active]`,
      tokensUsed: 0,
      durationMs: 100,
      createdAt: now,
    },
    decision: {
      title: `Decision Analysis for "${filename}"`,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      decisionMaker: 'Demo User',
      status: 'ANALYZED',
    },
  };
}

