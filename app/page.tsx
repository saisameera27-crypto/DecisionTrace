'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/styles/theme';
import { BUILD_STAMP } from '@/lib/build-stamp';

interface ModeStatus {
  isDemoMode: boolean;
  hasApiKey: boolean;
  dbConnected: boolean;
}

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modeStatus, setModeStatus] = useState<ModeStatus>({ isDemoMode: true, hasApiKey: false, dbConnected: false });
  const [caseId, setCaseId] = useState<string | null>(null);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showDemoTooltip, setShowDemoTooltip] = useState(false);
  const [showGeminiTooltip, setShowGeminiTooltip] = useState(false);

  // Check mode status on mount
  useEffect(() => {
    fetch('/api/mode-status')
      .then(res => res.json())
      .then(data => {
        setModeStatus({
          isDemoMode: data.isDemoMode,
          hasApiKey: data.hasApiKey,
          dbConnected: data.dbConnected ?? false,
        });
      })
      .catch(() => {
        setModeStatus({ isDemoMode: true, hasApiKey: false, dbConnected: false });
      });
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setError(null);
    setLoading('upload');
    setFileName(file.name);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/quickstart/upload', {
        method: 'POST',
        body: formData,
      });

      const raw = await response.text();
      if (!raw || raw.trim() === '') {
        throw new Error(`Empty response from server (${response.status} ${response.statusText})`);
      }

      let data: any;
      try {
        data = JSON.parse(raw);
      } catch (parseError) {
        const preview = raw.length > 300 ? raw.substring(0, 300) + '...' : raw;
        throw new Error(`Invalid JSON response: ${preview}`);
      }

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Upload failed';
        if (data.code === 'DB_NOT_INITIALIZED') {
          throw new Error('Database tables are not initialized. Please redeploy after migrations run.');
        }
        if (data.code === 'GEMINI_UPLOAD_FAILED') {
          throw new Error(`Gemini upload failed: ${errorMessage}`);
        }
        if (data.code === 'VALIDATION_ERROR') {
          throw new Error(`Validation error: ${errorMessage}`);
        }
        throw new Error(errorMessage);
      }

      setCaseId(data.caseId);
      setArtifactId(data.artifactId);
      setUploadStatus('File uploaded');
      setLoading(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(null);
      setUploadStatus(null);
      setCaseId(null);
      setArtifactId(null);
      setFileName(null);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRunAnalysis = async () => {
    if (!caseId) return;

    setError(null);
    setLoading('analysis');

    try {
      const response = await fetch(`/api/case/${caseId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(errorData.error || 'Analysis failed');
      }

      // Redirect to report page (keep existing report redirect behavior)
      router.push(`/case/${caseId}`);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
      setLoading(null);
    }
  };

  const handleLoadDemo = async () => {
    setError(null);
    setLoading('demo');

    try {
      const response = await fetch('/api/demo/load-sample', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load demo' }));
        if (errorData.code === 'DB_NOT_INITIALIZED') {
          throw new Error('Demo database not initialized. Please redeploy after migrations run.');
        }
        throw new Error(errorData.error || errorData.message || 'Failed to load demo');
      }

      const data = await response.json();
      router.push(`/case/${data.caseId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to load demo');
      setLoading(null);
    }
  };

  // Top header bar - fixed at top
  const topHeaderStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: theme.colors.background,
    borderBottom: `1px solid ${theme.colors.border}`,
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    marginBottom: theme.spacing.xl,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  };

  // Container styles - max-w-3xl, centered, clean spacing
  const containerStyle: React.CSSProperties = {
    maxWidth: '768px', // max-w-3xl equivalent
    margin: '0 auto',
    padding: `0 ${theme.spacing.xl} ${theme.spacing['2xl']} ${theme.spacing.xl}`,
    minHeight: '100vh',
  };

  // Header title style - text-4xl font-semibold
  const headerTitleStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSize['4xl'], // text-4xl
    fontWeight: theme.typography.fontWeight.semibold, // font-semibold
    color: theme.colors.textPrimary,
    margin: 0,
    letterSpacing: '-0.025em',
  };

  // Tiny pill styles - subtle
  const pillBaseStyle: React.CSSProperties = {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.full,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
  };

  const pillDemoStyle: React.CSSProperties = {
    ...pillBaseStyle,
    backgroundColor: theme.colors.backgroundSecondary,
    color: theme.colors.textSecondary,
    border: `1px solid ${theme.colors.border}`,
  };

  const pillLiveStyle: React.CSSProperties = {
    ...pillBaseStyle,
    backgroundColor: 'transparent',
    color: theme.colors.primary,
    border: `1px solid ${theme.colors.primary}`,
  };

  const infoIconStyle: React.CSSProperties = {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: theme.colors.textTertiary,
    color: theme.colors.background,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: theme.typography.fontWeight.bold,
    cursor: 'help',
    lineHeight: '1',
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.textPrimary,
    color: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.xs,
    lineHeight: theme.typography.lineHeight.normal,
    whiteSpace: 'normal',
    zIndex: 50,
    boxShadow: theme.colors.shadowLg,
    maxWidth: '280px',
    minWidth: '200px',
  };

  const tooltipContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  };

  // Card styles - rounded, soft shadow, neutral tones
  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    marginBottom: theme.spacing.lg,
  };

  // Upload area with drag-and-drop
  const uploadAreaStyle: React.CSSProperties = {
    border: `2px dashed ${isDragging ? theme.colors.primary : theme.colors.border}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing['2xl'],
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: isDragging ? theme.colors.backgroundSecondary : theme.colors.background,
    transition: 'all 0.2s',
    marginBottom: theme.spacing.lg,
  };

  const primaryButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: 'white',
    backgroundColor: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
  };

  const buttonDisabledStyle: React.CSSProperties = {
    ...primaryButtonStyle,
    backgroundColor: theme.colors.textMuted,
    cursor: 'not-allowed',
    opacity: 0.6,
  };

  const statusTextStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  };

  const statusSuccessStyle: React.CSSProperties = {
    ...statusTextStyle,
    color: theme.colors.success,
  };

  const errorStyle: React.CSSProperties = {
    padding: theme.spacing.md,
    backgroundColor: '#fee2e2',
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
    marginBottom: theme.spacing.lg,
  };

  const demoLinkStyle: React.CSSProperties = {
    textAlign: 'center',
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  };

  const demoLinkTextStyle: React.CSSProperties = {
    color: theme.colors.textTertiary,
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: theme.typography.fontSize.xs,
  };

  const isAnalysisDisabled = !caseId || !artifactId || loading === 'upload' || loading === 'analysis';

  return (
    <div data-testid="quickstart-root">
      {/* Top Header Bar - Logo/Title on left, pills on right */}
      <header style={topHeaderStyle}>
        <h1 style={headerTitleStyle}>Decision Trace</h1>
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Demo Mode Pill with Tooltip */}
          <div style={tooltipContainerStyle}>
            <span data-testid="mode-pill" style={modeStatus.isDemoMode ? pillDemoStyle : pillLiveStyle}>
              {modeStatus.isDemoMode ? 'Demo Mode' : 'Live Mode'}
            </span>
            <span
              style={infoIconStyle}
              onMouseEnter={() => setShowDemoTooltip(true)}
              onMouseLeave={() => setShowDemoTooltip(false)}
              onClick={() => setShowDemoTooltip(!showDemoTooltip)}
              role="button"
              tabIndex={0}
              aria-label="Demo mode information"
            >
              i
            </span>
            {showDemoTooltip && (
              <div
                data-testid="demo-explainer"
                style={tooltipStyle}
                onMouseEnter={() => setShowDemoTooltip(true)}
                onMouseLeave={() => setShowDemoTooltip(false)}
              >
                {modeStatus.isDemoMode
                  ? 'Uses sample data when API key is missing.'
                  : 'Live mode uses Gemini 3 for real-time analysis.'}
              </div>
            )}
          </div>

          {/* Gemini Status Pill with Tooltip */}
          <div style={tooltipContainerStyle}>
            <span data-testid="gemini-pill" style={pillDemoStyle}>
              Gemini: {modeStatus.hasApiKey ? 'Enabled' : 'Disabled'}
            </span>
            <span
              style={infoIconStyle}
              onMouseEnter={() => setShowGeminiTooltip(true)}
              onMouseLeave={() => setShowGeminiTooltip(false)}
              onClick={() => setShowGeminiTooltip(!showGeminiTooltip)}
              role="button"
              tabIndex={0}
              aria-label="Gemini status information"
            >
              i
            </span>
            {showGeminiTooltip && (
              <div
                data-testid="gemini-explainer"
                style={tooltipStyle}
                onMouseEnter={() => setShowGeminiTooltip(true)}
                onMouseLeave={() => setShowGeminiTooltip(false)}
              >
                {modeStatus.hasApiKey
                  ? 'Gemini 3 is configured. Analysis will use Gemini 3.'
                  : 'No API key found. Demo report only.'}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={containerStyle}>
        {/* Main QuickStart Card */}
      <div style={cardStyle}>
        <h2 style={{
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing.md,
          marginTop: 0,
        }}>
          Quick Start
        </h2>
        <p style={{
          fontSize: theme.typography.fontSize.lg, // text-lg
          color: theme.colors.textSecondary, // text-neutral-600
          marginBottom: theme.spacing.xl,
          lineHeight: theme.typography.lineHeight.relaxed,
        }}>
          Upload a document and run AI analysis to generate a decision trace report.
        </p>

        {/* Error Message */}
        {error && (
          <div style={errorStyle}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Step 1: Upload Document */}
        <div style={{ marginBottom: theme.spacing.xl }}>
          <label style={{
            display: 'block',
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing.sm,
          }}>
            1. Upload Document
          </label>
          
          {/* Drag and Drop Area */}
          <div
            style={uploadAreaStyle}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
              data-testid="upload-input"
            />
            <div style={{ fontSize: theme.typography.fontSize['3xl'], marginBottom: theme.spacing.sm }}>
              📄
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing.xs,
            }}>
              {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Supports: TXT, MD, PDF, DOC, DOCX
            </div>
          </div>

          {/* Upload Status */}
          <div data-testid="upload-status" style={uploadStatus ? statusSuccessStyle : statusTextStyle}>
            {loading === 'upload' ? (
              'Uploading...'
            ) : uploadStatus && fileName ? (
              <>✓ {uploadStatus}: <strong>{fileName}</strong></>
            ) : (
              'No file selected'
            )}
          </div>
        </div>

        {/* Step 2: Run Analysis */}
        <div>
          <label style={{
            display: 'block',
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing.sm,
          }}>
            2. Run Analysis
          </label>
          
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalysisDisabled}
            style={isAnalysisDisabled ? buttonDisabledStyle : primaryButtonStyle}
            onMouseEnter={(e) => {
              if (!isAnalysisDisabled) {
                e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
              }
            }}
            onMouseLeave={(e) => {
              if (!isAnalysisDisabled) {
                e.currentTarget.style.backgroundColor = theme.colors.primary;
              }
            }}
            onFocus={(e) => {
              if (!isAnalysisDisabled) {
                e.currentTarget.style.outline = `2px solid ${theme.colors.primary}`;
                e.currentTarget.style.outlineOffset = '2px';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
            data-testid="run-analysis"
          >
            {loading === 'analysis' ? 'Analyzing...' : 'Run Gemini 3 Analysis'}
          </button>
        </div>

        {/* Demo Mode Link - Only show in demo mode */}
        {modeStatus.isDemoMode && (
          <div style={demoLinkStyle}>
            <span
              onClick={handleLoadDemo}
              style={demoLinkTextStyle}
              data-testid="qs-demo-link"
            >
              Load sample case instead
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textTertiary,
        marginTop: theme.spacing.xl,
      }}>
        <p style={{ margin: `${theme.spacing.sm} 0` }}>
          Powered by <strong style={{ fontWeight: theme.typography.fontWeight.semibold }}>Google Gemini 3</strong>
        </p>
        <p style={{ margin: `${theme.spacing.sm} 0`, fontSize: theme.typography.fontSize.xs }}>
          Build: {BUILD_STAMP}
        </p>
      </div>
      </div>
    </div>
  );
}
