'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/styles/theme';

export default function QuickStartPage() {
  const router = useRouter();
  
  const [caseId, setCaseId] = useState<string | null>(null);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Count words in text input (split on whitespace)
  const wordCount = textInput.trim().split(/\s+/).filter(word => word.length > 0).length;
  const maxWords = 5000;
  const isTextValid = wordCount > 0 && wordCount <= maxWords;
  const isEmpty = textInput.trim().length === 0;
  const isTooLong = wordCount > maxWords;

  const handleSaveText = async () => {
    if (!isTextValid) return;

    setError(null);
    setLoading('upload');
    setFileName('text-input.txt');
    setUploadStatus(null);

    try {
      // Call quickstart text endpoint
      const response = await fetch('/api/quickstart/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textInput }),
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

      // Handle success response with required fields
      if (data.success) {
        setFileName(data.filename);
        setUploadStatus('Text saved');
        setDocumentId(data.documentId); // Store documentId from response
        setExtractedText(data.extractedText || null); // Store extracted text
        setUploaded(true); // Mark text save as complete
        // Store demo mode status from server response
        setIsDemoMode(data.mode === 'demo');
        // Note: We don't set caseId/artifactId here since text submission doesn't create them
        setLoading(null);
      } else {
        throw new Error('Text save succeeded but response format was unexpected');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(null);
      setUploadStatus(null);
      setUploaded(false);
      setDocumentId(null);
      setExtractedText(null);
      setCaseId(null);
      setArtifactId(null);
      setFileName(null);
    }
  };

  const handleRunAnalysis = async () => {
    if (!uploaded || !documentId) {
      setError('Please submit text first');
      return;
    }

    setError(null);
    setLoading('analysis');

    try {
      let newCaseId: string;

      // Demo mode: skip DB operations and use deterministic demo case ID
      if (isDemoMode) {
        // Generate deterministic demo case ID based on text content
        const timestamp = Math.floor(Date.now() / 60000) * 60000; // Round to minute
        const hash = textInput.split('').reduce((acc, char) => {
          return ((acc << 5) - acc) + char.charCodeAt(0);
        }, 0);
        newCaseId = `demo-case-${Math.abs(hash)}-${timestamp}`;
      } else {
        // Live mode: normal flow with DB
        // Step 1: Upload text to get documentId (already done, use existing documentId)
        // documentId is already set from text submission

        // Step 2: Create case with documentId
        const createResponse = await fetch('/api/case/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inferMode: true,
            documentId: documentId,
          }),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({ error: 'Failed to create case' }));
          throw new Error(errorData.error || errorData.message || 'Failed to create case');
        }

        const createData = await createResponse.json();
        newCaseId = createData.caseId;
      }

      // Step 3: Run the analysis (works for both demo and live mode)
      const runResponse = await fetch(`/api/case/${newCaseId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!runResponse.ok) {
        const errorData = await runResponse.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(errorData.error || 'Analysis failed');
      }

      // Redirect to report page (keep existing report redirect behavior)
      router.push(`/case/${newCaseId}`);
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
      const demoCaseId = data.caseId;

      // Redirect to report page
      router.push(`/case/${demoCaseId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to load demo');
      setLoading(null);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '600px',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.colors.shadowMd,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: theme.spacing.lg,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: 'white',
    backgroundColor: theme.colors.primary,
    border: 'none',
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    marginBottom: theme.spacing.md,
    transition: 'all 0.2s',
  };

  const buttonDisabledStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: theme.colors.border,
    color: theme.colors.textTertiary,
    cursor: 'not-allowed',
  };

  const buttonHoverStyle: React.CSSProperties = {
    backgroundColor: theme.colors.primaryHover,
    transform: 'translateY(-1px)',
    boxShadow: theme.colors.shadowLg,
  };

  const statusStyle: React.CSSProperties = {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: '#e7f3ff',
    border: `1px solid ${theme.colors.primary}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
  };

  const errorStyle: React.CSSProperties = {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: '#fee',
    border: '1px solid #fcc',
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.sm,
    color: '#c33',
  };

  const demoLinkStyle: React.CSSProperties = {
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  };

  const linkStyle: React.CSSProperties = {
    color: theme.colors.primary,
    textDecoration: 'underline',
    cursor: 'pointer',
  };

  // Enable analysis button if and only if: text submitted (uploaded === true) AND documentId exists
  const isAnalysisDisabled = !uploaded || !documentId;
  
  // Determine disabled reason for display
  const getDisabledReason = (): string => {
    if (loading === 'upload') return 'Saving text...';
    if (loading === 'analysis') return 'Running analysis...';
    if (!uploaded) return 'Save text first';
    if (!documentId) return 'Text save incomplete';
    return '';
  };

  // Get validation message for textarea
  const getValidationMessage = (): string => {
    if (isEmpty) return 'Paste decision notes to analyze.';
    if (isTooLong) return 'Max 5000 words. Please shorten.';
    return '';
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Quick Start</h1>

        {error && (
          <div style={errorStyle} data-testid="qs-upload-error">
            {error}
          </div>
        )}

        {uploadStatus && fileName && (
          <div style={statusStyle} data-testid="qs-status">
            {uploadStatus}: <span data-testid="qs-file">{fileName}</span>
          </div>
        )}

        {/* Text save complete status marker */}
        {uploaded && documentId && (
          <div style={statusStyle} data-testid="qs-upload-ok">
            ✓ Text saved
          </div>
        )}

        {/* Textarea input */}
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Paste decision notes to analyze..."
          disabled={loading === 'upload' || loading === 'analysis'}
          style={{
            width: '100%',
            minHeight: '200px',
            padding: theme.spacing.md,
            fontSize: theme.typography.fontSize.base,
            fontFamily: theme.typography.fontFamily,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.xs,
            resize: 'vertical',
            backgroundColor: loading === 'upload' || loading === 'analysis' ? theme.colors.background : 'white',
            color: theme.colors.textPrimary,
          }}
          data-testid="qs-text"
        />

        {/* Validation message */}
        {getValidationMessage() && (
          <div
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: isTooLong ? '#c33' : theme.colors.textSecondary,
              marginBottom: theme.spacing.xs,
            }}
          >
            {getValidationMessage()}
          </div>
        )}

        {/* Word counter */}
        <div
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: isTooLong ? '#c33' : theme.colors.textSecondary,
            textAlign: 'right',
            marginBottom: theme.spacing.md,
          }}
          data-testid="qs-wordcount"
        >
          {wordCount} / {maxWords} words
        </div>

        {/* Button 1: Save Text */}
        <button
          onClick={handleSaveText}
          disabled={!isTextValid || loading === 'upload' || loading === 'analysis'}
          style={
            !isTextValid || loading === 'upload' || loading === 'analysis'
              ? buttonDisabledStyle
              : buttonStyle
          }
          onMouseEnter={(e) => {
            if (isTextValid && !loading && loading !== 'upload' && loading !== 'analysis') {
              Object.assign(e.currentTarget.style, buttonHoverStyle);
            }
          }}
          onMouseLeave={(e) => {
            if (isTextValid && !loading && loading !== 'upload' && loading !== 'analysis') {
              e.currentTarget.style.backgroundColor = buttonStyle.backgroundColor as string;
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = (buttonStyle.boxShadow as string) || '';
            }
          }}
          data-testid="qs-save-text"
        >
          {loading === 'upload' ? 'Saving...' : 'Save Text'}
        </button>

        {/* Button 2: Run Gemini 3 Analysis */}
        <button
          onClick={handleRunAnalysis}
          disabled={isAnalysisDisabled}
          style={isAnalysisDisabled ? buttonDisabledStyle : buttonStyle}
          onMouseEnter={(e) => {
            if (!isAnalysisDisabled) {
              Object.assign(e.currentTarget.style, buttonHoverStyle);
            }
          }}
          onMouseLeave={(e) => {
            if (!isAnalysisDisabled) {
              e.currentTarget.style.backgroundColor = buttonStyle.backgroundColor as string;
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = (buttonStyle.boxShadow as string) || '';
            }
          }}
          data-testid="qs-run"
        >
          {loading === 'analysis' ? 'Running Analysis...' : 'Run Gemini 3 Analysis'}
        </button>

        {/* Disabled reason text */}
        {isAnalysisDisabled && (
          <div 
            style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textTertiary,
              textAlign: 'center',
              marginTop: theme.spacing.xs,
            }}
            data-testid="qs-run-disabled-reason"
          >
            {getDisabledReason()}
          </div>
        )}

        {/* Demo link */}
        <div style={demoLinkStyle}>
          <span
            onClick={handleLoadDemo}
            style={linkStyle}
            data-testid="qs-demo-link"
          >
            Try demo sample (no upload)
          </span>
        </div>
      </div>
    </div>
  );
}

