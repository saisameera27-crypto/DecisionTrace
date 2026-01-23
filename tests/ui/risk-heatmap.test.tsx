/**
 * Risk Heatmap Component Tests
 * Tests 5x5 grid rendering and tooltip functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Risk Heatmap Component
interface RiskItem {
  id: string;
  category: string;
  severity: number; // 1-5
  probability: number; // 1-5
  description: string;
}

interface RiskHeatmapProps {
  risks: RiskItem[];
}

const RiskHeatmap: React.FC<RiskHeatmapProps> = ({ risks }) => {
  const [hoveredCell, setHoveredCell] = React.useState<string | null>(null);

  // Create 5x5 grid
  const grid = Array.from({ length: 5 }, (_, severity) =>
    Array.from({ length: 5 }, (_, probability) => {
      const cellKey = `${severity + 1}-${probability + 1}`;
      const cellRisks = risks.filter(
        (r) => r.severity === severity + 1 && r.probability === probability + 1
      );
      return { cellKey, risks: cellRisks, severity: severity + 1, probability: probability + 1 };
    })
  );

  const getCellColor = (severity: number, probability: number): string => {
    const riskLevel = severity * probability;
    if (riskLevel >= 20) return 'bg-red-500';
    if (riskLevel >= 12) return 'bg-orange-500';
    if (riskLevel >= 6) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div data-testid="risk-heatmap">
      <div className="grid grid-cols-5 gap-1" data-testid="heatmap-grid">
        {grid.map((row, rowIdx) =>
          row.map((cell) => (
            <div
              key={cell.cellKey}
              data-testid={`cell-${cell.cellKey}`}
              className={`w-16 h-16 ${getCellColor(cell.severity, cell.probability)} cursor-pointer relative`}
              onMouseEnter={() => setHoveredCell(cell.cellKey)}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span className="text-xs">{cell.risks.length}</span>
              {hoveredCell === cell.cellKey && cell.risks.length > 0 && (
                <div
                  data-testid={`tooltip-${cell.cellKey}`}
                  className="absolute z-10 bg-black text-white p-2 rounded shadow-lg min-w-[200px]"
                  style={{ top: '100%', left: 0, marginTop: '4px' }}
                >
                  <div className="font-bold mb-1">
                    Severity {cell.severity} × Probability {cell.probability}
                  </div>
                  {cell.risks.map((risk) => (
                    <div key={risk.id} data-testid={`tooltip-risk-${risk.id}`} className="text-sm">
                      <div className="font-semibold">{risk.category}</div>
                      <div className="text-xs">{risk.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

describe('Risk Heatmap', () => {
  const mockRisks: RiskItem[] = [
    {
      id: '1',
      category: 'Technical Risk',
      severity: 5,
      probability: 5,
      description: 'Critical system failure',
    },
    {
      id: '2',
      category: 'Financial Risk',
      severity: 4,
      probability: 3,
      description: 'Budget overrun',
    },
    {
      id: '3',
      category: 'Schedule Risk',
      severity: 3,
      probability: 4,
      description: 'Project delay',
    },
    {
      id: '4',
      category: 'Compliance Risk',
      severity: 5,
      probability: 5,
      description: 'Regulatory violation',
    },
    {
      id: '5',
      category: 'Low Risk',
      severity: 1,
      probability: 1,
      description: 'Minor issue',
    },
  ];

  it('should render a 5x5 grid', () => {
    render(<RiskHeatmap risks={mockRisks} />);

    const grid = screen.getByTestId('heatmap-grid');
    expect(grid).toBeInTheDocument();

    // Check that we have 25 cells (5x5)
    for (let severity = 1; severity <= 5; severity++) {
      for (let probability = 1; probability <= 5; probability++) {
        expect(screen.getByTestId(`cell-${severity}-${probability}`)).toBeInTheDocument();
      }
    }
  });

  it('should display risk counts in cells', () => {
    render(<RiskHeatmap risks={mockRisks} />);

    // Cell 5-5 should have 2 risks
    const cell55 = screen.getByTestId('cell-5-5');
    expect(cell55).toHaveTextContent('2');

    // Cell 4-3 should have 1 risk
    const cell43 = screen.getByTestId('cell-4-3');
    expect(cell43).toHaveTextContent('1');

    // Cell 1-1 should have 1 risk
    const cell11 = screen.getByTestId('cell-1-1');
    expect(cell11).toHaveTextContent('1');
  });

  it('should show tooltip on hover with risk items', async () => {
    const user = userEvent.setup();
    render(<RiskHeatmap risks={mockRisks} />);

    const cell55 = screen.getByTestId('cell-5-5');
    await user.hover(cell55);

    await waitFor(() => {
      const tooltip = screen.getByTestId('tooltip-5-5');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('Severity 5 × Probability 5');
      expect(screen.getByTestId('tooltip-risk-1')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip-risk-4')).toBeInTheDocument();
    });
  });

  it('should display risk category and description in tooltip', async () => {
    const user = userEvent.setup();
    render(<RiskHeatmap risks={mockRisks} />);

    const cell43 = screen.getByTestId('cell-4-3');
    await user.hover(cell43);

    await waitFor(() => {
      const tooltip = screen.getByTestId('tooltip-4-3');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('Financial Risk');
      expect(tooltip).toHaveTextContent('Budget overrun');
    });
  });

  it('should hide tooltip when mouse leaves cell', async () => {
    const user = userEvent.setup();
    render(<RiskHeatmap risks={mockRisks} />);

    const cell55 = screen.getByTestId('cell-5-5');
    await user.hover(cell55);

    await waitFor(() => {
      expect(screen.getByTestId('tooltip-5-5')).toBeInTheDocument();
    });

    await user.unhover(cell55);

    await waitFor(() => {
      expect(screen.queryByTestId('tooltip-5-5')).not.toBeInTheDocument();
    });
  });

  it('should not show tooltip for empty cells', async () => {
    const user = userEvent.setup();
    render(<RiskHeatmap risks={mockRisks} />);

    const cell22 = screen.getByTestId('cell-2-2');
    await user.hover(cell22);

    // Wait a bit to ensure tooltip doesn't appear
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(screen.queryByTestId('tooltip-2-2')).not.toBeInTheDocument();
  });
});

