'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/styles/theme';

export default function CreateCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    decisionContext: '',
    stakeholders: '',
    evidence: '',
    risks: '',
    desiredOutput: 'full',
  });

  // Determine if we're in inferred decision mode
  // Triggered when file is uploaded but no manual fields are provided
  const isInferredMode = uploadedFile !== null && 
                         !formData.title.trim() && 
                         !formData.decisionContext.trim() && 
                         !formData.stakeholders.trim() && 
                         !formData.evidence.trim() && 
                         !formData.risks.trim();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Upload file if provided
      let documentId: string | null = null;
      if (uploadedFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', uploadedFile);

        const filesUploadEndpoint = '/api/files/upload';
        console.log('[Upload] endpoint URL:', filesUploadEndpoint);
        const uploadResponse = await fetch(filesUploadEndpoint, {
          method: 'POST',
          body: formDataUpload,
        });
        console.log('[Upload] response.status:', uploadResponse.status);

        const responseBodyText = await uploadResponse.text();
        console.log('[Upload] response body (text):', responseBodyText);
        let uploadPayload: { error?: string; documentId?: string } = {};
        try {
          uploadPayload = JSON.parse(responseBodyText);
        } catch {
          uploadPayload = { error: 'File upload failed' };
        }

        if (!uploadResponse.ok) {
          throw new Error(uploadPayload.error || 'File upload failed');
        }

        documentId = uploadPayload.documentId || null;
      }

      // Step 2: Create case (returns immediately with caseId)
      const createResponse = await fetch('/api/case/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          documentId, // Include document ID if file was uploaded
          inferredMode: isInferredMode, // Flag for inferred decision mode
        }),
      });

      // Safe response parser for create
      const createRaw = await createResponse.text();
      
      if (!createRaw || createRaw.trim() === '') {
        throw new Error(`Empty response from server (${createResponse.status} ${createResponse.statusText})`);
      }

      let createData: any;
      try {
        createData = JSON.parse(createRaw);
      } catch (parseError) {
        const preview = createRaw.length > 300 ? createRaw.substring(0, 300) + '...' : createRaw;
        throw new Error(`Invalid JSON response from server (${createResponse.status} ${createResponse.statusText}): ${preview}`);
      }

      if (!createResponse.ok) {
        const statusCode = createResponse.status;
        const statusText = createResponse.statusText;
        const errorMessage = createData.error || createData.message || 'Unknown error';
        const requestId = createData.requestId || createData.id || null;
        
        let errorText = `HTTP ${statusCode} ${statusText}: ${errorMessage}`;
        if (requestId) {
          errorText += ` (Request ID: ${requestId})`;
        }
        
        if (createData.code === 'DB_NOT_INITIALIZED') {
          setError('Database tables are not initialized. Please redeploy after migrations run.');
        } else {
          setError(errorText);
        }
        setLoading(false);
        return;
      }

      const caseId = createData.caseId;

      // Step 2: Generate report
      // Always use JSON path (fast) - demo mode uses this, live mode can also use this
      // Streaming is available via Accept: text/event-stream header if needed in the future
      const generateResponse = await fetch(`/api/case/${caseId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Don't request streaming - use fast JSON path
        },
      });

      const generateRaw = await generateResponse.text();
      
      if (!generateRaw || generateRaw.trim() === '') {
        throw new Error(`Empty response from generate endpoint (${generateResponse.status})`);
      }

      let generateData: any;
      try {
        generateData = JSON.parse(generateRaw);
      } catch (parseError) {
        const preview = generateRaw.length > 300 ? generateRaw.substring(0, 300) + '...' : generateRaw;
        throw new Error(`Invalid JSON response from generate endpoint: ${preview}`);
      }

      if (!generateResponse.ok) {
        const errorMessage = generateData.error || generateData.message || 'Failed to generate report';
        setError(`Report generation failed: ${errorMessage}`);
        setLoading(false);
        return;
      }

      // Success - navigate to report page
      router.push(`/case/${caseId}`);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create case';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Container styles
  const containerStyle: React.CSSProperties = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: `${theme.spacing.xl} ${theme.spacing.lg}`,
    minHeight: '100vh',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.background,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.xl,
    boxShadow: theme.colors.shadowMd,
    padding: theme.spacing.xl,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    lineHeight: theme.typography.lineHeight.tight,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily,
    transition: theme.transition.normal,
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '120px',
    resize: 'vertical',
    fontFamily: theme.typography.fontFamily,
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  const buttonStyle: React.CSSProperties = {
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    backgroundColor: theme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: theme.borderRadius.md,
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: theme.transition.normal,
    opacity: loading ? 0.6 : 1,
  };

  const errorStyle: React.CSSProperties = {
    padding: theme.spacing.md,
    backgroundColor: '#fee2e2',
    border: `1px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.error,
    marginBottom: theme.spacing.lg,
  };

  const helpTextStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
    lineHeight: theme.typography.lineHeight.normal,
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle} data-testid="create-case-title">Create Your Own Case</h1>

        {error && (
          <div style={errorStyle} data-testid="create-case-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} data-testid="create-case-form">
          {/* File Upload - Primary Input */}
          <div style={{ marginBottom: theme.spacing.xl }}>
            <label htmlFor="file" style={labelStyle}>
              Upload Document <span style={{ color: theme.colors.error }}>*</span>
            </label>
            <input
              type="file"
              id="file"
              name="file"
              onChange={handleFileChange}
              disabled={loading}
              accept=".txt,.md,.pdf,.doc,.docx"
              style={inputStyle}
              required
              data-testid="create-case-file-input"
            />
            <div style={helpTextStyle}>
              Upload a document containing decision notes, emails, fragments, or partial thoughts.
              {isInferredMode && (
                <div style={{ 
                  marginTop: theme.spacing.xs, 
                  color: theme.colors.primary, 
                  fontWeight: theme.typography.fontWeight.medium,
                  padding: theme.spacing.sm,
                  backgroundColor: '#f0f9ff',
                  borderRadius: theme.borderRadius.md,
                }}>
                  ℹ️ <strong>Inferred Decision Mode:</strong> The system will infer the decision from uploaded content.
                </div>
              )}
            </div>
          </div>

          {/* Inferred Mode Notice */}
          {isInferredMode && (
            <div style={{
              padding: theme.spacing.md,
              backgroundColor: '#f0f9ff',
              border: `1px solid ${theme.colors.primary}`,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.lg,
            }}>
              <div style={{ 
                fontWeight: theme.typography.fontWeight.semibold, 
                marginBottom: theme.spacing.xs,
                color: theme.colors.primary,
              }}>
                🔍 Inferred Decision Mode Active
              </div>
              <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, lineHeight: theme.typography.lineHeight.relaxed }}>
                <strong>The system will infer the decision from uploaded content.</strong> It will automatically:
                <ul style={{ marginTop: theme.spacing.xs, marginLeft: theme.spacing.lg, paddingLeft: theme.spacing.sm }}>
                  <li>Identify all decision candidates (explicit or implicit)</li>
                  <li>Extract evidence fragments as verbatim quotes</li>
                  <li>Classify fragments into evidence, assumptions, risks, and stakeholder signals</li>
                </ul>
                You can optionally provide additional context in the fields below to enhance the analysis.
              </div>
            </div>
          )}

          {/* Optional Manual Fields */}
          <div style={{ marginBottom: theme.spacing.lg }}>
            <label htmlFor="title" style={labelStyle}>
              Title (Optional)
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              disabled={loading}
              style={inputStyle}
              data-testid="create-case-title-input"
              placeholder="e.g., Q2 2024 Product Launch Decision"
            />
            <div style={helpTextStyle}>
              Optional: Provide a title for this case. If not provided, it will be inferred from the document.
            </div>
          </div>

          <div style={{ marginBottom: theme.spacing.lg }}>
            <label htmlFor="decisionContext" style={labelStyle}>
              Decision Context (Optional)
            </label>
            <textarea
              id="decisionContext"
              name="decisionContext"
              value={formData.decisionContext}
              onChange={handleChange}
              disabled={loading}
              style={textareaStyle}
              data-testid="create-case-context-input"
              placeholder="Describe the decision that needs to be made, the situation, and any relevant background information."
            />
            <div style={helpTextStyle}>
              Optional: Provide additional context about the decision, situation, and background.
            </div>
          </div>

          <div style={{ marginBottom: theme.spacing.lg }}>
            <label htmlFor="stakeholders" style={labelStyle}>
              Stakeholders (Optional)
            </label>
            <input
              type="text"
              id="stakeholders"
              name="stakeholders"
              value={formData.stakeholders}
              onChange={handleChange}
              disabled={loading}
              style={inputStyle}
              data-testid="create-case-stakeholders-input"
              placeholder="e.g., Product Team, Marketing Team, Executive Leadership"
            />
            <div style={helpTextStyle}>
              Comma-separated list of stakeholders involved in this decision.
            </div>
          </div>

          <div style={{ marginBottom: theme.spacing.lg }}>
            <label htmlFor="evidence" style={labelStyle}>
              Evidence / Notes (Optional)
            </label>
            <textarea
              id="evidence"
              name="evidence"
              value={formData.evidence}
              onChange={handleChange}
              disabled={loading}
              style={textareaStyle}
              data-testid="create-case-evidence-input"
              placeholder="List key facts, data points, research findings, or other evidence that supports or informs this decision."
            />
            <div style={helpTextStyle}>
              Optional: Include additional supporting facts, data, research, or other evidence. Evidence will also be extracted from the uploaded document.
            </div>
          </div>

          <div style={{ marginBottom: theme.spacing.lg }}>
            <label htmlFor="risks" style={labelStyle}>
              Risks (Optional)
            </label>
            <textarea
              id="risks"
              name="risks"
              value={formData.risks}
              onChange={handleChange}
              disabled={loading}
              style={textareaStyle}
              data-testid="create-case-risks-input"
              placeholder="List potential risks, concerns, or what could go wrong with this decision."
            />
            <div style={helpTextStyle}>
              Optional: Identify potential risks, concerns, or failure modes. Risks will also be extracted from the document.
            </div>
          </div>

          <div style={{ marginBottom: theme.spacing.xl }}>
            <label htmlFor="desiredOutput" style={labelStyle}>
              Desired Output
            </label>
            <select
              id="desiredOutput"
              name="desiredOutput"
              value={formData.desiredOutput}
              onChange={handleChange}
              disabled={loading}
              style={selectStyle}
              data-testid="create-case-output-select"
            >
              <option value="full">Full Report</option>
              <option value="executive">Executive Summary</option>
            </select>
            <div style={helpTextStyle}>
              Choose the type of report you want to generate.
            </div>
          </div>

          <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => router.push('/')}
              disabled={loading}
              style={{
                ...buttonStyle,
                backgroundColor: theme.colors.textTertiary,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = theme.colors.textSecondary;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = theme.colors.textTertiary;
                }
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !uploadedFile}
              style={buttonStyle}
              data-testid="create-case-submit-button"
              onMouseEnter={(e) => {
                if (!loading && uploadedFile) {
                  e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = theme.colors.primary;
                }
              }}
            >
              {loading ? 'Creating Case...' : isInferredMode ? 'Analyze Document & Generate Report' : 'Create Case & Generate Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

