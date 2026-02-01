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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadMimeType, setUploadMimeType] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
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

  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Prevent double-clicking: if already uploading, ignore
    if (loading === 'upload') {
      return;
    }

    setError(null);
    setLoading('upload');
    setFileName(file.name);
    setUploadStatus("Selected");

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`File is too large. Maximum size is 5MB (${(file.size / 1024 / 1024).toFixed(1)}MB selected).`);
      setLoading(null);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 413) {
          throw new Error("File is too large. Maximum size is 5MB.");
        }
        let detail = text;
        try {
          const payload = JSON.parse(text) as { error?: string; detail?: string };
          detail = payload.detail ?? payload.error ?? text;
        } catch {
          // use raw text as detail
        }
        throw new Error(`Upload failed (${res.status})${detail ? ": " + detail : ""}`);
      }

      const data = await res.json();

      // Handle success response (/api/upload returns { ok: true } or { success: true }; use file for name/type)
      if (data.ok ?? data.success) {
        setFileName(data.filename ?? file.name);
        setUploadStatus('Uploaded');
        setUploadPreview(data.preview ?? null);
        setUploadMimeType(data.mimeType ?? file.type ?? null);
        setUploadedFile(file); // Store file for case creation
        setShowFullPreview(false); // Reset preview expansion
        if (data.mode !== undefined) setIsDemoMode(data.mode === 'demo');
        setLoading(null);
      } else {
        throw new Error('Upload succeeded but response format was unexpected');
      }
    } catch (err: any) {
      const displayError = err.message || "An error occurred";
      setError(displayError);
      setLoading(null);
      setUploadStatus("Selected");
      setUploadPreview(null);
      setUploadMimeType(null);
      setShowFullPreview(false);
      setUploadedFile(null);
      setCaseId(null);
      setArtifactId(null);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent double-clicking: if already uploading, ignore
    if (loading === 'upload') {
      return;
    }
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Prevent interaction when uploading
    if (loading === 'upload') {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (loading === 'upload') {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    // Prevent interaction when uploading
    if (loading === 'upload') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUploadAreaClick = () => {
    // Prevent clicking when uploading
    if (loading === 'upload') {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleRunAnalysis = async () => {
    console.log("[RunAnalysis] clicked");
    const fileSelected = !!(uploadedFile && fileName);
    console.log("[RunAnalysis] file selected:", fileSelected, fileName ?? "(none)");

    if (!uploadedFile || !fileName) {
      setError("Please upload a file first");
      return;
    }

    setError(null);
    setLoading("analysis");

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      console.log("[RunAnalysis] calling /api/analyze");
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const text = await res.text();
      let data: { ok?: boolean; error?: string; detail?: string; [key: string]: unknown } = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text || "Unknown response" };
      }
      console.log("[RunAnalysis] res.status:", res.status, "body:", data);

      if (!res.ok) {
        const detail = data.detail ?? data.error ?? text;
        throw new Error(`Analysis failed (${res.status})${detail ? ": " + detail : ""}`);
      }

      console.log("[RunAnalysis] analysis complete, clearing loading");
      setLoading(null);
      setError(null);
    } catch (err: any) {
      const message = err?.message ?? String(err);
      console.error("[RunAnalysis] error:", message);
      setError(message);
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
  const isUploading = loading === 'upload';
  const uploadAreaStyle: React.CSSProperties = {
    border: `2px dashed ${isDragging ? theme.colors.primary : theme.colors.border}`,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing['2xl'],
    textAlign: 'center',
    cursor: isUploading ? 'not-allowed' : 'pointer',
    backgroundColor: isDragging ? theme.colors.backgroundSecondary : theme.colors.background,
    opacity: isUploading ? 0.6 : 1,
    pointerEvents: isUploading ? 'none' : 'auto',
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

  // Enable analysis button when upload is successful (has fileName and uploadStatus)
  const isAnalysisDisabled = !fileName || !uploadStatus || loading === 'upload' || loading === 'analysis';

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
            onClick={handleUploadAreaClick}
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
              {loading === 'upload' 
                ? 'Uploading...' 
                : isDragging 
                  ? 'Drop file here' 
                  : 'Click to upload or drag and drop'}
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

          {/* Upload Preview */}
          {uploadPreview && (() => {
            // Detect binary garbage: high ratio of non-printable chars or starts with "PK" for DOCX
            const isBinaryGarbage = (text: string, filename: string | null, mimeType: string | null): boolean => {
              if (!text || text.length === 0) return false;
              
              // Check if starts with "PK" and file is DOCX (ZIP header)
              if (text.startsWith('PK') && filename?.toLowerCase().endsWith('.docx')) {
                return true;
              }
              
              // Check ratio of non-printable characters
              const nonPrintableCount = text.split('').filter(char => {
                const code = char.charCodeAt(0);
                // Allow printable ASCII (32-126), tabs (9), newlines (10, 13), and common Unicode
                return code < 32 && code !== 9 && code !== 10 && code !== 13;
              }).length;
              
              const ratio = nonPrintableCount / text.length;
              // If more than 10% non-printable chars, consider it binary
              return ratio > 0.1;
            };

            const isBinary = isBinaryGarbage(uploadPreview, fileName, uploadMimeType);
            const previewLength = uploadPreview.length;
            const previewToShow = showFullPreview ? uploadPreview : uploadPreview.slice(0, 1000);
            const hasMore = previewLength > 1000;

            // Detect file type from mimeType or filename
            const getFileType = (mimeType: string | null, filename: string | null): string => {
              if (mimeType) {
                if (mimeType.includes('wordprocessingml')) return 'Word Document (.docx)';
                if (mimeType === 'application/pdf') return 'PDF Document';
                if (mimeType === 'text/plain') return 'Text File';
                if (mimeType === 'text/markdown') return 'Markdown File';
                if (mimeType.startsWith('text/')) return 'Text File';
              }
              if (filename) {
                const ext = filename.split('.').pop()?.toLowerCase();
                if (ext === 'docx') return 'Word Document (.docx)';
                if (ext === 'pdf') return 'PDF Document';
                if (ext === 'txt') return 'Text File';
                if (ext === 'md') return 'Markdown File';
              }
              return 'Unknown Type';
            };

            if (isBinary) {
              return (
                <div
                  style={{
                    marginTop: theme.spacing.sm,
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.backgroundSecondary,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.fontSize.xs,
                    color: '#dc2626',
                  }}
                  data-testid="qs-preview-error"
                >
                  <div style={{ fontWeight: theme.typography.fontWeight.medium, marginBottom: theme.spacing.xs }}>
                    Preview unavailable — extracting text from Word file failed.
                  </div>
                  {fileName && (
                    <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary, marginTop: theme.spacing.xs }}>
                      File: {fileName} ({getFileType(uploadMimeType, fileName)})
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                style={{
                  marginTop: theme.spacing.sm,
                  padding: theme.spacing.md,
                  backgroundColor: theme.colors.backgroundSecondary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  lineHeight: theme.typography.lineHeight.relaxed,
                }}
                data-testid="qs-preview"
              >
                {/* File Metadata */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: theme.spacing.xs,
                  fontSize: theme.typography.fontSize.xs,
                }}>
                  <div style={{ fontWeight: theme.typography.fontWeight.medium }}>
                    Preview:
                  </div>
                  {fileName && (
                    <div style={{ color: theme.colors.textTertiary || theme.colors.textSecondary }}>
                      {fileName} • {getFileType(uploadMimeType, fileName)}
                    </div>
                  )}
                </div>

                {/* Preview Content */}
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-word',
                  maxHeight: showFullPreview ? 'none' : '200px',
                  overflow: showFullPreview ? 'visible' : 'auto',
                  marginBottom: hasMore ? theme.spacing.xs : 0,
                }}>
                  {previewToShow}
                  {!showFullPreview && hasMore && '...'}
                </div>

                {/* Show More/Less Button */}
                {hasMore && (
                  <button
                    onClick={() => setShowFullPreview(!showFullPreview)}
                    style={{
                      marginTop: theme.spacing.xs,
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      backgroundColor: 'transparent',
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.borderRadius.sm,
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                      e.currentTarget.style.borderColor = theme.colors.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = theme.colors.border;
                    }}
                  >
                    {showFullPreview ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            );
          })()}
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
            {loading === 'analysis' ? 'Running...' : 'Run Gemini 3 Analysis'}
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
