/**
 * Evidence Table Component Tests
 * Tests filtering functionality for Weak claims, Missing evidence, and Conflicts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Evidence Table Component
interface EvidenceRow {
  id: string;
  claim: string;
  evidence: string | null;
  strength: 'strong' | 'weak' | 'missing';
  conflicts: boolean;
}

interface EvidenceTableProps {
  rows: EvidenceRow[];
}

const EvidenceTable: React.FC<EvidenceTableProps> = ({ rows }) => {
  const [filter, setFilter] = React.useState<'all' | 'weak' | 'missing' | 'conflicts'>('all');

  const filteredRows = React.useMemo(() => {
    switch (filter) {
      case 'weak':
        return rows.filter((row) => row.strength === 'weak');
      case 'missing':
        return rows.filter((row) => row.strength === 'missing' || row.evidence === null);
      case 'conflicts':
        return rows.filter((row) => row.conflicts === true);
      default:
        return rows;
    }
  }, [rows, filter]);

  return (
    <div data-testid="evidence-table">
      <div data-testid="filter-buttons">
        <button
          onClick={() => setFilter('all')}
          data-testid="filter-all"
          aria-pressed={filter === 'all'}
        >
          All
        </button>
        <button
          onClick={() => setFilter('weak')}
          data-testid="filter-weak"
          aria-pressed={filter === 'weak'}
        >
          Weak Claims
        </button>
        <button
          onClick={() => setFilter('missing')}
          data-testid="filter-missing"
          aria-pressed={filter === 'missing'}
        >
          Missing Evidence
        </button>
        <button
          onClick={() => setFilter('conflicts')}
          data-testid="filter-conflicts"
          aria-pressed={filter === 'conflicts'}
        >
          Conflicts
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Claim</th>
            <th>Evidence</th>
            <th>Strength</th>
            <th>Conflicts</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row) => (
            <tr key={row.id} data-testid={`row-${row.id}`}>
              <td>{row.claim}</td>
              <td>{row.evidence || 'No evidence'}</td>
              <td>{row.strength}</td>
              <td>{row.conflicts ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div data-testid="row-count">{filteredRows.length} rows</div>
    </div>
  );
};

describe('Evidence Table Filters', () => {
  const mockRows: EvidenceRow[] = [
    {
      id: '1',
      claim: 'Strong claim with evidence',
      evidence: 'Supporting evidence',
      strength: 'strong',
      conflicts: false,
    },
    {
      id: '2',
      claim: 'Weak claim',
      evidence: 'Limited evidence',
      strength: 'weak',
      conflicts: false,
    },
    {
      id: '3',
      claim: 'Claim without evidence',
      evidence: null,
      strength: 'missing',
      conflicts: false,
    },
    {
      id: '4',
      claim: 'Conflicting claim',
      evidence: 'Conflicting evidence',
      strength: 'strong',
      conflicts: true,
    },
    {
      id: '5',
      claim: 'Another weak claim',
      evidence: 'Weak evidence',
      strength: 'weak',
      conflicts: true,
    },
  ];

  beforeEach(() => {
    // Reset any state if needed
  });

  it('should display all rows by default', () => {
    render(<EvidenceTable rows={mockRows} />);

    expect(screen.getByTestId('row-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-2')).toBeInTheDocument();
    expect(screen.getByTestId('row-3')).toBeInTheDocument();
    expect(screen.getByTestId('row-4')).toBeInTheDocument();
    expect(screen.getByTestId('row-5')).toBeInTheDocument();
    expect(screen.getByTestId('row-count')).toHaveTextContent('5 rows');
  });

  it('should filter to show only weak claims', async () => {
    const user = userEvent.setup();
    render(<EvidenceTable rows={mockRows} />);

    const weakButton = screen.getByTestId('filter-weak');
    await user.click(weakButton);

    expect(screen.getByTestId('row-2')).toBeInTheDocument();
    expect(screen.getByTestId('row-5')).toBeInTheDocument();
    expect(screen.queryByTestId('row-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('row-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('row-4')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-count')).toHaveTextContent('2 rows');
  });

  it('should filter to show only missing evidence', async () => {
    const user = userEvent.setup();
    render(<EvidenceTable rows={mockRows} />);

    const missingButton = screen.getByTestId('filter-missing');
    await user.click(missingButton);

    expect(screen.getByTestId('row-3')).toBeInTheDocument();
    expect(screen.queryByTestId('row-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('row-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('row-4')).not.toBeInTheDocument();
    expect(screen.queryByTestId('row-5')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-count')).toHaveTextContent('1 rows');
  });

  it('should filter to show only conflicts', async () => {
    const user = userEvent.setup();
    render(<EvidenceTable rows={mockRows} />);

    const conflictsButton = screen.getByTestId('filter-conflicts');
    await user.click(conflictsButton);

    expect(screen.getByTestId('row-4')).toBeInTheDocument();
    expect(screen.getByTestId('row-5')).toBeInTheDocument();
    expect(screen.queryByTestId('row-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('row-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('row-3')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-count')).toHaveTextContent('2 rows');
  });

  it('should return to all rows when clicking All filter', async () => {
    const user = userEvent.setup();
    render(<EvidenceTable rows={mockRows} />);

    // Filter to weak claims first
    await user.click(screen.getByTestId('filter-weak'));
    expect(screen.getByTestId('row-count')).toHaveTextContent('2 rows');

    // Return to all
    await user.click(screen.getByTestId('filter-all'));
    expect(screen.getByTestId('row-count')).toHaveTextContent('5 rows');
    expect(screen.getByTestId('row-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-2')).toBeInTheDocument();
    expect(screen.getByTestId('row-3')).toBeInTheDocument();
    expect(screen.getByTestId('row-4')).toBeInTheDocument();
    expect(screen.getByTestId('row-5')).toBeInTheDocument();
  });
});

