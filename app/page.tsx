'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDemoCase = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Decision Trace</h1>
      <p style={{ fontSize: '1.1rem', marginBottom: '2rem', color: '#666' }}>
        AI-powered decision analysis using Google Gemini
      </p>

      {/* Demo Mode Badge */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196f3',
        borderRadius: '8px',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 'bold', color: '#1976d2' }}>🎯 DEMO MODE</span>
        </div>
        <p style={{ margin: 0, color: '#1976d2', fontSize: '0.9rem' }}>
          No API key required. Click below to load a pre-populated demo case with completed analysis.
        </p>
      </div>

      {/* Load Demo Case Button */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={loadDemoCase}
          disabled={loading}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            backgroundColor: loading ? '#ccc' : '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Loading Demo Case...' : '🚀 Load Demo Case'}
        </button>
      </div>

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
      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Features</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li>✅ 6-step AI analysis powered by Google Gemini</li>
          <li>✅ Decision extraction and risk assessment</li>
          <li>✅ Comprehensive reports with visualizations</li>
          <li>✅ Public share links for collaboration</li>
          <li>✅ Works in demo mode without API key</li>
        </ul>
      </div>
    </div>
  );
}
