'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/styles/theme';

interface ModeStatus {
  isDemoMode: boolean;
  hasApiKey: boolean;
}

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modeStatus, setModeStatus] = useState<ModeStatus>({ isDemoMode: true, hasApiKey: false });

  // Check mode status on mount
  useEffect(() => {
    fetch('/api/mode-status')
      .then(res => res.json())
      .then(data => {
        setModeStatus({
          isDemoMode: data.isDemoMode,
          hasApiKey: data.hasApiKey,
        });
      })
      .catch(() => {
        // Default to demo mode if check fails
        setModeStatus({ isDemoMode: true, hasApiKey: false });
      });
  }, []);

  const loadDemoCase = async () => {
    setLoading('load-sample');
    setError(null);
    
    try {
      const response = await fetch('/api/demo/load-sample', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const data = await response.json();
        
        // Check for database initialization error
        if (data.error === 'DB_NOT_INITIALIZED') {
          setError('Demo database not initialized. Please redeploy after migrations run.');
        } else {
          setError(data.message || 'Failed to load demo case');
        }
        setLoading(null);
        return;
      }
      
      const data = await response.json();
      // Navigate to the case page
      router.push(`/case/${data.caseId}`);
    } catch (err: any) {
      // Check if error response contains DB_NOT_INITIALIZED
      if (err.message && err.message.includes('DB_NOT_INITIALIZED')) {
        setError('Demo database not initialized. Please redeploy after migrations run.');
      } else {
        setError(err.message || 'Failed to load demo case');
      }
      setLoading(null);
    }
  };

  const openReport = async () => {
    setLoading('open-report');
    setError(null);
    
    try {
      // First load the demo case
      const response = await fetch('/api/demo/load-sample', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const data = await response.json();
        
        // Check for database initialization error
        if (data.error === 'DB_NOT_INITIALIZED') {
          setError('Demo database not initialized. Please redeploy after migrations run.');
        } else {
          setError(data.message || 'Failed to load demo case');
        }
        setLoading(null);
        return;
      }
      
      const data = await response.json();
      // Navigate directly to the report page
      router.push(`/case/${data.caseId}`);
    } catch (err: any) {
      if (err.message && err.message.includes('DB_NOT_INITIALIZED')) {
        setError('Demo database not initialized. Please redeploy after migrations run.');
      } else {
        setError(err.message || 'Failed to open report');
      }
      setLoading(null);
    }
  };

  const openPublicShare = async () => {
    setLoading('open-share');
    setError(null);
    
    try {
      // First load the demo case
      const loadResponse = await fetch('/api/demo/load-sample', {
        method: 'POST',
      });
      
      if (!loadResponse.ok) {
        const data = await loadResponse.json();
        
        // Check for database initialization error
        if (data.error === 'DB_NOT_INITIALIZED') {
          setError('Demo database not initialized. Please redeploy after migrations run.');
          setLoading(null);
          return;
        }
        throw new Error(data.message || 'Failed to load demo case');
      }
      
      const loadData = await loadResponse.json();
      const caseId = loadData.caseId;
      
      // Create share link
      const shareResponse = await fetch(`/api/case/${caseId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expirationDays: 30 }),
      });
      
      if (!shareResponse.ok) {
        const data = await shareResponse.json();
        throw new Error(data.message || 'Failed to create share link');
      }
      
      const shareData = await shareResponse.json();
      const shareSlug = shareData.slug;
      
      // Navigate to public share page
      router.push(`/public/case/${shareSlug}`);
    } catch (err: any) {
      setError(err.message || 'Failed to open public share link');
      setLoading(null);
    }
  };

  // Theme-based styles
  const containerStyle: React.CSSProperties = {
    padding: theme.spacing.xl,
    maxWidth: '900px',
    margin: '0 auto',
    minHeight: '100vh',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSize['4xl'],
    marginBottom: theme.spacing.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.lineHeight.tight,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: theme.typography.fontSize.xl,
    marginBottom: theme.spacing.xl,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.lineHeight.relaxed,
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Decision Trace</h1>
      <p style={subtitleStyle}>
        AI-powered decision analysis using Google Gemini 3
      </p>

      {/* Mode Indicator */}
      <div style={{
        padding: `${theme.spacing.md} ${theme.spacing.md}`,
        backgroundColor: theme.colors.background,
        border: `2px solid ${modeStatus.isDemoMode ? theme.colors.primary : theme.colors.success}`,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
      }}>
        <strong style={{ 
          color: modeStatus.isDemoMode ? theme.colors.primary : theme.colors.success,
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.semibold,
        }}>
          {modeStatus.isDemoMode ? '🎯 DEMO MODE (Default)' : '🤖 LIVE GEMINI 3 MODE'}
        </strong>
        <p style={{ 
          margin: `${theme.spacing.sm} 0 0 0`, 
          color: modeStatus.isDemoMode ? theme.colors.primary : theme.colors.success,
          fontSize: theme.typography.fontSize.sm,
          lineHeight: theme.typography.lineHeight.normal,
        }}>
          {modeStatus.isDemoMode 
            ? 'Using mock responses. No API key required. Perfect for hackathon demos!'
            : 'Using real Gemini 3 API. API key configured.'}
        </p>
      </div>

      {/* Primary Actions Section */}
      <div style={{
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        border: `2px solid ${theme.colors.primary}`,
        borderRadius: theme.borderRadius.xl,
        marginBottom: theme.spacing.xl,
        boxShadow: theme.colors.shadowMd,
      }}>
        <h2 style={{ 
          fontSize: theme.typography.fontSize['3xl'], 
          marginBottom: theme.spacing.md, 
          color: theme.colors.primary,
          fontWeight: theme.typography.fontWeight.bold,
          lineHeight: theme.typography.lineHeight.tight,
        }}>
          Get Started
        </h2>
        <p style={{ 
          marginBottom: theme.spacing.lg, 
          color: theme.colors.textSecondary, 
          fontSize: theme.typography.fontSize.base,
          lineHeight: theme.typography.lineHeight.relaxed,
        }}>
          Choose how you'd like to explore Decision Trace:
        </p>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: theme.spacing.md,
        }}>
          {/* Button 1: Try Demo */}
          <button
            data-testid="load-sample-case-button"
            onClick={loadDemoCase}
            disabled={loading !== null}
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              fontSize: theme.typography.fontSize.lg,
              backgroundColor: loading === 'load-sample' ? theme.colors.textMuted : theme.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.lg,
              cursor: loading === 'load-sample' ? 'not-allowed' : 'pointer',
              fontWeight: theme.typography.fontWeight.bold,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              transition: theme.transition.normal,
            }}
            onMouseEnter={(e) => {
              if (loading !== 'load-sample') {
                e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
              }
            }}
            onMouseLeave={(e) => {
              if (loading !== 'load-sample') {
                e.currentTarget.style.backgroundColor = theme.colors.primary;
              }
            }}
          >
            {loading === 'load-sample' ? '⏳ Loading...' : '🎯 Try Demo - Load Sample Case'}
          </button>

          {/* Button 2: Create Your Own Case */}
          <button
            data-testid="create-case-button"
            onClick={() => router.push('/create')}
            disabled={loading !== null}
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              fontSize: theme.typography.fontSize.lg,
              backgroundColor: loading ? theme.colors.textMuted : theme.colors.success,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.lg,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: theme.typography.fontWeight.bold,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              transition: theme.transition.normal,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = theme.colors.success;
              }
            }}
          >
            ✨ Create Your Own Case
          </button>
        </div>
      </div>

      {/* Demo Quick Actions Section */}
      <div style={{
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.xl,
        marginBottom: theme.spacing.xl,
        boxShadow: theme.colors.shadowSm,
      }}>
        <h3 style={{ 
          fontSize: theme.typography.fontSize.xl, 
          marginBottom: theme.spacing.md, 
          color: theme.colors.textPrimary,
          fontWeight: theme.typography.fontWeight.semibold,
        }}>
          Quick Demo Actions
        </h3>
        <p style={{ 
          marginBottom: theme.spacing.lg, 
          color: theme.colors.textSecondary, 
          fontSize: theme.typography.fontSize.sm,
          lineHeight: theme.typography.lineHeight.relaxed,
        }}>
          After loading the sample case, you can:
        </p>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: theme.spacing.sm,
        }}>
          {/* Button 2: Open Report */}
          <button
            data-testid="open-report-button"
            onClick={openReport}
            disabled={loading !== null}
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              fontSize: theme.typography.fontSize.base,
              backgroundColor: loading === 'open-report' ? theme.colors.textMuted : theme.colors.success,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.lg,
              cursor: loading === 'open-report' ? 'not-allowed' : 'pointer',
              fontWeight: theme.typography.fontWeight.semibold,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              transition: theme.transition.normal,
            }}
            onMouseEnter={(e) => {
              if (loading !== 'open-report') {
                e.currentTarget.style.backgroundColor = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              if (loading !== 'open-report') {
                e.currentTarget.style.backgroundColor = theme.colors.success;
              }
            }}
          >
            {loading === 'open-report' ? '⏳ Loading...' : '📊 Open Report'}
          </button>

          {/* Button 3: Open Public Share Link */}
          <button
            data-testid="open-public-share-button"
            onClick={openPublicShare}
            disabled={loading !== null}
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              fontSize: theme.typography.fontSize.base,
              backgroundColor: loading === 'open-share' ? theme.colors.textMuted : theme.colors.warning,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.lg,
              cursor: loading === 'open-share' ? 'not-allowed' : 'pointer',
              fontWeight: theme.typography.fontWeight.semibold,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              transition: theme.transition.normal,
            }}
            onMouseEnter={(e) => {
              if (loading !== 'open-share') {
                e.currentTarget.style.backgroundColor = '#d97706';
              }
            }}
            onMouseLeave={(e) => {
              if (loading !== 'open-share') {
                e.currentTarget.style.backgroundColor = theme.colors.warning;
              }
            }}
          >
            {loading === 'open-share' ? '⏳ Loading...' : '🔗 Open Public Share Link'}
          </button>
        </div>
      </div>

      {/* Live Gemini 3 Section (Only shown if API key exists) */}
      {modeStatus.hasApiKey && (
        <div style={{
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          border: `2px solid ${theme.colors.success}`,
          borderRadius: theme.borderRadius.xl,
          marginBottom: theme.spacing.xl,
          boxShadow: theme.colors.shadowMd,
        }}>
          <h2 style={{ 
            fontSize: theme.typography.fontSize['3xl'], 
            marginBottom: theme.spacing.md, 
            color: theme.colors.success,
            fontWeight: theme.typography.fontWeight.bold,
            lineHeight: theme.typography.lineHeight.tight,
          }}>
            🤖 Live Gemini 3 (Optional)
          </h2>
          <p style={{ 
            marginBottom: theme.spacing.lg, 
            color: theme.colors.textSecondary, 
            fontSize: theme.typography.fontSize.base,
            lineHeight: theme.typography.lineHeight.relaxed,
          }}>
            Run real AI analysis using Google Gemini 3. Upload your own documents and get live analysis results.
          </p>
          <button
            data-testid="run-live-gemini-button"
            onClick={() => {
              // For now, show a message that live analysis requires case creation
              // In a full implementation, this would navigate to case creation/upload
              alert('Live Gemini 3 analysis requires creating a case and uploading a document. This feature is available when GEMINI_API_KEY is configured.');
            }}
            disabled={loading !== null}
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              fontSize: theme.typography.fontSize.lg,
              backgroundColor: loading ? theme.colors.textMuted : theme.colors.success,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.lg,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: theme.typography.fontWeight.bold,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              transition: theme.transition.normal,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = theme.colors.success;
              }
            }}
          >
            🚀 Run Live Gemini 3 Analysis
          </button>
          <p style={{ 
            marginTop: theme.spacing.md, 
            color: theme.colors.textTertiary, 
            fontSize: theme.typography.fontSize.sm,
            fontStyle: 'italic',
            lineHeight: theme.typography.lineHeight.normal,
          }}>
            Note: Live analysis requires API key and may incur costs. Demo mode is recommended for hackathon judging.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          padding: theme.spacing.md,
          backgroundColor: '#fee2e2',
          border: `1px solid ${theme.colors.error}`,
          borderRadius: theme.borderRadius.lg,
          color: theme.colors.error,
          marginBottom: theme.spacing.xl,
        }}>
          <strong style={{ fontWeight: theme.typography.fontWeight.semibold }}>Error:</strong> {error}
        </div>
      )}

      {/* Features */}
      <div style={{ marginTop: theme.spacing['2xl'], marginBottom: theme.spacing.xl }}>
        <h2 style={{ 
          fontSize: theme.typography.fontSize['2xl'], 
          marginBottom: theme.spacing.md,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
        }}>
          Features
        </h2>
        <ul style={{ 
          lineHeight: theme.typography.lineHeight.relaxed, 
          fontSize: theme.typography.fontSize.base,
          color: theme.colors.textSecondary,
          paddingLeft: theme.spacing.lg,
        }}>
          <li style={{ marginBottom: theme.spacing.sm }}>✅ 6-step AI analysis powered by Google Gemini 3</li>
          <li style={{ marginBottom: theme.spacing.sm }}>✅ Decision extraction and risk assessment</li>
          <li style={{ marginBottom: theme.spacing.sm }}>✅ Comprehensive reports with visualizations</li>
          <li style={{ marginBottom: theme.spacing.sm }}>✅ Public share links for collaboration</li>
          <li style={{ marginBottom: theme.spacing.sm }}>✅ Works in demo mode without API key</li>
        </ul>
      </div>

      {/* Powered by Gemini 3 */}
      <div style={{
        marginTop: theme.spacing.xl,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderTop: `1px solid ${theme.colors.border}`,
        textAlign: 'center',
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textTertiary,
      }}>
        <p style={{ margin: `${theme.spacing.sm} 0` }}>
          Powered by <strong style={{ fontWeight: theme.typography.fontWeight.semibold }}>Google Gemini 3</strong>
        </p>
        <p style={{ margin: `${theme.spacing.sm} 0` }}>
          <a 
            href="https://github.com/saisameera27-crypto/DecisionTrace/blob/main/GEMINI_3_ENFORCEMENT.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.colors.primary, textDecoration: 'none' }}
          >
            View Gemini 3 Implementation Docs →
          </a>
        </p>
      </div>
    </div>
  );
}
