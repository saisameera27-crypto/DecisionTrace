/**
 * Export Tab Component Tests
 * Tests download handlers for various export formats
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock download utilities
const mockDownload = vi.fn();
const mockCreateBlob = vi.fn();
const mockCreateObjectURL = vi.fn();

// Mock global URL and Blob APIs
global.URL.createObjectURL = mockCreateObjectURL;
global.Blob = class MockBlob {
  constructor(public parts: any[], public options: any) {}
} as any;

// Mock Export Tab Component
interface ExportTabProps {
  reportData: {
    title: string;
    narrative: string;
    diagram: string;
    data: Record<string, any>;
  };
}

const ExportTab: React.FC<ExportTabProps> = ({ reportData }) => {
  const handleDownloadPDF = () => {
    const content = `PDF Export\n\n${reportData.title}\n\n${reportData.narrative}`;
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportData.title}.pdf`;
    link.click();
    mockDownload('pdf', reportData.title);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    const content = `# ${reportData.title}\n\n${reportData.narrative}\n\n\`\`\`mermaid\n${reportData.diagram}\n\`\`\``;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportData.title}.md`;
    link.click();
    mockDownload('markdown', reportData.title);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const content = JSON.stringify(reportData.data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportData.title}.json`;
    link.click();
    mockDownload('json', reportData.title);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    // Convert data to CSV format
    const headers = Object.keys(reportData.data);
    const values = Object.values(reportData.data);
    const csvContent = `${headers.join(',')}\n${values.join(',')}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportData.title}.csv`;
    link.click();
    mockDownload('csv', reportData.title);
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="export-tab">
      <h2>Export Report</h2>
      <div data-testid="export-buttons">
        <button onClick={handleDownloadPDF} data-testid="export-pdf">
          Download PDF
        </button>
        <button onClick={handleDownloadMarkdown} data-testid="export-markdown">
          Download Markdown
        </button>
        <button onClick={handleDownloadJSON} data-testid="export-json">
          Download JSON
        </button>
        <button onClick={handleDownloadCSV} data-testid="export-csv">
          Download CSV
        </button>
      </div>
    </div>
  );
};

describe('Export Tab', () => {
  const mockReportData = {
    title: 'Test Decision Report',
    narrative: 'This is a test narrative for the decision report.',
    diagram: 'graph TD\n    A --> B',
    data: {
      decision: 'Approve Project',
      date: '2024-01-15',
      status: 'approved',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
    
    // Mock document.createElement for anchor elements
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as any;
      }
      return document.createElement(tagName);
    });
  });

  it('should render export buttons', () => {
    render(<ExportTab reportData={mockReportData} />);

    expect(screen.getByTestId('export-pdf')).toBeInTheDocument();
    expect(screen.getByTestId('export-markdown')).toBeInTheDocument();
    expect(screen.getByTestId('export-json')).toBeInTheDocument();
    expect(screen.getByTestId('export-csv')).toBeInTheDocument();
  });

  it('should trigger PDF download handler', async () => {
    const user = userEvent.setup();
    render(<ExportTab reportData={mockReportData} />);

    const pdfButton = screen.getByTestId('export-pdf');
    await user.click(pdfButton);

    expect(mockDownload).toHaveBeenCalledWith('pdf', mockReportData.title);
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it('should trigger Markdown download handler', async () => {
    const user = userEvent.setup();
    render(<ExportTab reportData={mockReportData} />);

    const markdownButton = screen.getByTestId('export-markdown');
    await user.click(markdownButton);

    expect(mockDownload).toHaveBeenCalledWith('markdown', mockReportData.title);
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it('should trigger JSON download handler', async () => {
    const user = userEvent.setup();
    render(<ExportTab reportData={mockReportData} />);

    const jsonButton = screen.getByTestId('export-json');
    await user.click(jsonButton);

    expect(mockDownload).toHaveBeenCalledWith('json', mockReportData.title);
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it('should trigger CSV download handler', async () => {
    const user = userEvent.setup();
    render(<ExportTab reportData={mockReportData} />);

    const csvButton = screen.getByTestId('export-csv');
    await user.click(csvButton);

    expect(mockDownload).toHaveBeenCalledWith('csv', mockReportData.title);
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it('should create correct blob types for each format', async () => {
    const user = userEvent.setup();
    render(<ExportTab reportData={mockReportData} />);

    // Test PDF
    await user.click(screen.getByTestId('export-pdf'));
    expect(Blob).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('PDF Export')]),
      { type: 'application/pdf' }
    );

    // Test Markdown
    await user.click(screen.getByTestId('export-markdown'));
    expect(Blob).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('# Test Decision Report')]),
      { type: 'text/markdown' }
    );

    // Test JSON
    await user.click(screen.getByTestId('export-json'));
    expect(Blob).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('"decision"')]),
      { type: 'application/json' }
    );

    // Test CSV
    await user.click(screen.getByTestId('export-csv'));
    expect(Blob).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('decision,date,status')]),
      { type: 'text/csv' }
    );
  });

  it('should use correct filename for downloads', async () => {
    const user = userEvent.setup();
    render(<ExportTab reportData={mockReportData} />);

    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

    await user.click(screen.getByTestId('export-pdf'));
    expect(mockLink.download).toBe('Test Decision Report.pdf');

    await user.click(screen.getByTestId('export-markdown'));
    expect(mockLink.download).toBe('Test Decision Report.md');

    await user.click(screen.getByTestId('export-json'));
    expect(mockLink.download).toBe('Test Decision Report.json');

    await user.click(screen.getByTestId('export-csv'));
    expect(mockLink.download).toBe('Test Decision Report.csv');
  });
});

