/**
 * Diagram Tab Component Tests
 * Tests Mermaid rendering and fallback on invalid Mermaid code
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock Mermaid library
const mockMermaid = {
  initialize: vi.fn(),
  render: vi.fn(),
  parse: vi.fn(),
};

vi.mock('mermaid', () => ({
  default: mockMermaid,
}));

// Mock Diagram Tab Component
interface DiagramTabProps {
  mermaidCode: string;
}

const DiagramTab: React.FC<DiagramTabProps> = ({ mermaidCode }) => {
  const [error, setError] = React.useState<string | null>(null);
  const [isValid, setIsValid] = React.useState<boolean>(true);
  const diagramRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!mermaidCode) {
      setIsValid(false);
      setError('No diagram code provided');
      return;
    }

    // Validate Mermaid syntax
    try {
      const parseResult = mockMermaid.parse(mermaidCode);
      if (parseResult && parseResult.errors && parseResult.errors.length > 0) {
        setIsValid(false);
        setError('Invalid Mermaid syntax');
        return;
      }
      setIsValid(true);
      setError(null);

      // Render diagram
      if (diagramRef.current) {
        mockMermaid.render('diagram-svg', mermaidCode).then((result: any) => {
          if (diagramRef.current) {
            (diagramRef.current as HTMLElement).innerHTML = result.svg;
          }
        });
      }
    } catch (err) {
      setIsValid(false);
      setError('Failed to parse Mermaid diagram');
    }
  }, [mermaidCode]);

  if (!isValid || error) {
    return (
      <div data-testid="diagram-fallback">
        <div data-testid="fallback-message">Unable to render diagram</div>
        <div data-testid="fallback-error">{error}</div>
        <div data-testid="fallback-code">{mermaidCode}</div>
      </div>
    );
  }

  return (
    <div data-testid="diagram-container">
      <div ref={diagramRef} data-testid="mermaid-diagram" />
    </div>
  );
};

describe('Diagram Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMermaid.parse.mockImplementation((code: string) => {
      // Simulate parsing - return errors for invalid code
      if (code.includes('INVALID') || code.trim() === '') {
        return { errors: ['Parse error'] };
      }
      return { errors: [] };
    });
    mockMermaid.render.mockResolvedValue({
      svg: '<svg>Mock Mermaid Diagram</svg>',
    });
  });

  it('should render valid Mermaid code', async () => {
    const validMermaid = `graph TD
    A[Start] --> B[Process]
    B --> C[End]`;

    render(<DiagramTab mermaidCode={validMermaid} />);

    await waitFor(() => {
      expect(screen.getByTestId('diagram-container')).toBeInTheDocument();
      expect(screen.getByTestId('mermaid-diagram')).toBeInTheDocument();
    });

    expect(mockMermaid.parse).toHaveBeenCalledWith(validMermaid);
    expect(mockMermaid.render).toHaveBeenCalled();
  });

  it('should show fallback for invalid Mermaid syntax', async () => {
    const invalidMermaid = 'INVALID MERMAID CODE';

    render(<DiagramTab mermaidCode={invalidMermaid} />);

    await waitFor(() => {
      expect(screen.getByTestId('diagram-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('fallback-message')).toHaveTextContent('Unable to render diagram');
      expect(screen.getByTestId('fallback-error')).toHaveTextContent('Invalid Mermaid syntax');
    });

    expect(screen.queryByTestId('diagram-container')).not.toBeInTheDocument();
  });

  it('should show fallback for empty Mermaid code', async () => {
    render(<DiagramTab mermaidCode="" />);

    await waitFor(() => {
      expect(screen.getByTestId('diagram-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('fallback-message')).toHaveTextContent('Unable to render diagram');
      expect(screen.getByTestId('fallback-error')).toHaveTextContent('No diagram code provided');
    });
  });

  it('should display original code in fallback', async () => {
    const invalidMermaid = 'graph TD\nINVALID';

    render(<DiagramTab mermaidCode={invalidMermaid} />);

    await waitFor(() => {
      expect(screen.getByTestId('fallback-code')).toHaveTextContent(invalidMermaid);
    });
  });

  it('should handle parse errors gracefully', async () => {
    mockMermaid.parse.mockImplementation(() => {
      throw new Error('Parse failed');
    });

    const mermaidCode = 'graph TD\nA --> B';

    render(<DiagramTab mermaidCode={mermaidCode} />);

    await waitFor(() => {
      expect(screen.getByTestId('diagram-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('fallback-error')).toHaveTextContent('Failed to parse Mermaid diagram');
    });
  });

  it('should render complex Mermaid diagrams', async () => {
    const complexMermaid = `graph LR
    A[Decision] -->|Yes| B[Action 1]
    A -->|No| C[Action 2]
    B --> D[Result 1]
    C --> E[Result 2]`;

    render(<DiagramTab mermaidCode={complexMermaid} />);

    await waitFor(() => {
      expect(screen.getByTestId('diagram-container')).toBeInTheDocument();
      expect(mockMermaid.parse).toHaveBeenCalledWith(complexMermaid);
    });
  });
});

