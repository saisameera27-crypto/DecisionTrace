'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
        throw new Error(data.message || 'Failed to load demo case');
      }
      
      const data = await response.json();
      // Navigate to the case page
      router.push(`/case/${data.caseId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to load demo case');
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
        throw new Error(data.message || 'Failed to load demo case');
      }
      
      const data = await response.json();
      // Navigate directly to the report page
      router.push(`/case/${data.caseId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to open report');
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

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Decision Trace</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#666' }}>
        AI-powered decision analysis using Google Gemini 3
      </p>

      {/* Mode Indicator */}
      <div style={{
        padding: '0.75rem 1rem',
        backgroundColor: modeStatus.isDemoMode ? '#e3f2fd' : '#e8f5e9',
        border: `2px solid ${modeStatus.isDemoMode ? '#2196f3' : '#4caf50'}`,
        borderRadius: '8px',
        marginBottom: '1.5rem',
        textAlign: 'center',
      }}>
        <strong style={{ 
          color: modeStatus.isDemoMode ? '#1976d2' : '#2e7d32',
          fontSize: '1rem',
        }}>
          {modeStatus.isDemoMode ? '🎯 DEMO MODE (Default)' : '🤖 LIVE GEMINI 3 MODE'}
        </strong>
        <p style={{ 
          margin: '0.5rem 0 0 0', 
          color: modeStatus.isDemoMode ? '#1976d2' : '#2e7d32',
          fontSize: '0.9rem',
        }}>
          {modeStatus.isDemoMode 
            ? 'Using mock responses. No API key required. Perfect for hackathon demos!'
            : 'Using real Gemini 3 API. API key configured.'}
        </p>
      </div>

      {/* Try Demo Section - Prominent for Judges */}
      <div style={{
        padding: '2rem',
        backgroundColor: '#f5f5f5',
        border: '2px solid #2196f3',
        borderRadius: '12px',
        marginBottom: '2rem',
      }}>
        <h2 style={{ 
          fontSize: '1.8rem', 
          marginBottom: '1rem', 
          color: '#1976d2',
          fontWeight: 'bold',
        }}>
          🎯 Demo Mode (Default)
        </h2>
        <p style={{ 
          marginBottom: '1.5rem', 
          color: '#555', 
          fontSize: '1rem',
          lineHeight: '1.6',
        }}>
          Experience Decision Trace with a pre-populated demo case. Works instantly with no API key or authentication required.
        </p>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
        }}>
          {/* Button 1: Load Sample Case */}
          <button
            data-testid="load-sample-case-button"
            onClick={loadDemoCase}
            disabled={loading !== null}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              backgroundColor: loading === 'load-sample' ? '#ccc' : '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading === 'load-sample' ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {loading === 'load-sample' ? '⏳ Loading...' : '🚀 1. Load Sample Case'}
          </button>

          {/* Button 2: Open Report */}
          <button
            data-testid="open-report-button"
            onClick={openReport}
            disabled={loading !== null}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              backgroundColor: loading === 'open-report' ? '#ccc' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading === 'open-report' ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {loading === 'open-report' ? '⏳ Loading...' : '📊 2. Open Report'}
          </button>

          {/* Button 3: Open Public Share Link */}
          <button
            data-testid="open-public-share-button"
            onClick={openPublicShare}
            disabled={loading !== null}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              backgroundColor: loading === 'open-share' ? '#ccc' : '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading === 'open-share' ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {loading === 'open-share' ? '⏳ Loading...' : '🔗 3. Open Public Share Link'}
          </button>
        </div>
      </div>

      {/* Live Gemini 3 Section (Only shown if API key exists) */}
      {modeStatus.hasApiKey && (
        <div style={{
          padding: '2rem',
          backgroundColor: '#f1f8f4',
          border: '2px solid #4caf50',
          borderRadius: '12px',
          marginBottom: '2rem',
        }}>
          <h2 style={{ 
            fontSize: '1.8rem', 
            marginBottom: '1rem', 
            color: '#2e7d32',
            fontWeight: 'bold',
          }}>
            🤖 Live Gemini 3 (Optional)
          </h2>
          <p style={{ 
            marginBottom: '1.5rem', 
            color: '#555', 
            fontSize: '1rem',
            lineHeight: '1.6',
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
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              backgroundColor: loading ? '#ccc' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            🚀 Run Live Gemini 3 Analysis
          </button>
          <p style={{ 
            marginTop: '1rem', 
            color: '#666', 
            fontSize: '0.9rem',
            fontStyle: 'italic',
          }}>
            Note: Live analysis requires API key and may incur costs. Demo mode is recommended for hackathon judging.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '8px',
          color: '#c62828',
          marginBottom: '2rem',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Features */}
      <div style={{ marginTop: '3rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Features</h2>
        <ul style={{ lineHeight: '1.8', fontSize: '1rem' }}>
          <li>✅ 6-step AI analysis powered by Google Gemini 3</li>
          <li>✅ Decision extraction and risk assessment</li>
          <li>✅ Comprehensive reports with visualizations</li>
          <li>✅ Public share links for collaboration</li>
          <li>✅ Works in demo mode without API key</li>
        </ul>
      </div>

      {/* Powered by Gemini 3 */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#f9f9f9',
        borderTop: '1px solid #ddd',
        textAlign: 'center',
        fontSize: '0.9rem',
        color: '#666',
      }}>
        <p style={{ margin: '0.5rem 0' }}>
          Powered by <strong>Google Gemini 3</strong>
        </p>
        <p style={{ margin: '0.5rem 0' }}>
          <a 
            href="https://github.com/saisameera27-crypto/DecisionTrace/blob/main/GEMINI_3_ENFORCEMENT.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#2196f3', textDecoration: 'none' }}
          >
            View Gemini 3 Implementation Docs →
          </a>
        </p>
      </div>
    </div>
  );
}
