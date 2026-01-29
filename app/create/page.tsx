'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/styles/theme';

export default function CreateCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    decisionContext: '',
    stakeholders: '',
    evidence: '',
    risks: '',
    desiredOutput: 'full',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/case/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check for database initialization error
        if (data.error === 'DB_NOT_INITIALIZED') {
          setError('Database tables are not initialized. Please redeploy after migrations run.');
        } else {
          setError(data.message || 'Failed to create case');
        }
        setLoading(false);
        return;
      }

      // Navigate to the report page
      router.push(`/case/${data.caseId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create case');
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
          <div style={{ marginBottom: theme.spacing.lg }}>
            <label htmlFor="title" style={labelStyle}>
              Title <span style={{ color: theme.colors.error }}>*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              disabled={loading}
              style={inputStyle}
              data-testid="create-case-title-input"
              placeholder="e.g., Q2 2024 Product Launch Decision"
            />
          </div>

          <div style={{ marginBottom: theme.spacing.lg }}>
            <label htmlFor="decisionContext" style={labelStyle}>
              Decision Context
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
              Provide context about the decision, situation, and background.
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
              Evidence / Notes
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
              Include supporting facts, data, research, or other evidence.
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
              Identify potential risks, concerns, or failure modes.
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
              disabled={loading || !formData.title.trim()}
              style={buttonStyle}
              data-testid="create-case-submit-button"
              onMouseEnter={(e) => {
                if (!loading && formData.title.trim()) {
                  e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = theme.colors.primary;
                }
              }}
            >
              {loading ? 'Creating Case...' : 'Create Case & Generate Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

