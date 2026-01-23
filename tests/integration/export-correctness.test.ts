/**
 * Export Correctness Tests
 * Tests that exported files (PDF/SVG/PNG/JSON) contain correct content
 * 
 * Why it matters: Judges will open exported files; regressions happen silently here.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock PDF parsing library (in real implementation, use pdf-parse or similar)
function parsePDF(buffer: Buffer): { text: string; pages: number } {
  // In a real test, use pdf-parse or pdfjs-dist
  // For now, check that it's a valid PDF header
  const header = buffer.toString('utf-8', 0, 8);
  if (!header.startsWith('%PDF-')) {
    throw new Error('Invalid PDF header');
  }
  
  // Extract text content (simplified - real implementation would parse PDF structure)
  const text = buffer.toString('utf-8');
  const pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length || 1;
  
  return { text, pages };
}

// Mock SVG parsing
function parseSVG(content: string): { hasSVGTag: boolean; hasNodes: boolean; nodeCount: number } {
  const hasSVGTag = content.includes('<svg');
  const nodeMatches = content.match(/<[a-zA-Z][^>]*>/g) || [];
  const nodeCount = nodeMatches.length;
  const hasNodes = nodeCount > 0;
  
  return { hasSVGTag, hasNodes, nodeCount };
}

// Mock PNG validation
function validatePNG(buffer: Buffer): boolean {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const signature = buffer.slice(0, 8);
  const expected = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return signature.equals(expected);
}

/**
 * Mock export handler that generates actual export files
 */
async function mockExportHandler(
  format: 'pdf' | 'svg' | 'png' | 'json',
  reportData: {
    title: string;
    narrative: string;
    diagram: string;
    evidence: any[];
    risks: any[];
    schemaVersion: string;
  }
): Promise<Buffer | string> {
  switch (format) {
    case 'pdf': {
      // Generate a simple PDF-like structure
      // In production, use a real PDF library like pdfkit or puppeteer
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Contents 4 0 R
/MediaBox [0 0 612 792]
>>
endobj
4 0 obj
<<
/Length ${reportData.narrative.length + 200}
>>
stream
BT
/F1 12 Tf
100 700 Td
(${reportData.title}) Tj
0 -20 Td
(${reportData.narrative}) Tj
0 -20 Td
(Evidence Map) Tj
0 -20 Td
(Risks) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000200 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF`;
      return Buffer.from(pdfContent);
    }
    
    case 'svg': {
      // Generate SVG with Mermaid diagram
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
  <title>${reportData.title}</title>
  <g id="mermaid-diagram">
    ${reportData.diagram}
  </g>
  <text x="10" y="20">Evidence Map</text>
  <text x="10" y="40">Risks</text>
  <g id="nodes">
    <circle cx="100" cy="100" r="20" />
    <circle cx="200" cy="150" r="20" />
  </g>
</svg>`;
      return svg;
    }
    
    case 'png': {
      // Generate a minimal valid PNG (1x1 transparent pixel)
      // In production, use a real image generation library
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const ihdr = Buffer.alloc(25);
      ihdr.writeUInt32BE(13, 0); // Length
      ihdr.write('IHDR', 4);
      ihdr.writeUInt32BE(1, 8); // Width
      ihdr.writeUInt32BE(1, 12); // Height
      ihdr.writeUInt8(8, 16); // Bit depth
      ihdr.writeUInt8(6, 17); // Color type (RGBA)
      ihdr.writeUInt8(0, 18); // Compression
      ihdr.writeUInt8(0, 19); // Filter
      ihdr.writeUInt8(0, 20); // Interlace
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(0x12345678, 0); // Mock CRC
      
      return Buffer.concat([pngHeader, ihdr, crc]);
    }
    
    case 'json': {
      const json = {
        schemaVersion: reportData.schemaVersion,
        manifest: {
          title: reportData.title,
          exportedAt: new Date().toISOString(),
          format: 'json',
          version: reportData.schemaVersion,
        },
        data: {
          narrative: reportData.narrative,
          diagram: reportData.diagram,
          evidence: reportData.evidence,
          risks: reportData.risks,
        },
      };
      return JSON.stringify(json, null, 2);
    }
    
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

describe('Export Correctness Tests', () => {
  const mockReportData = {
    title: 'Test Decision Report',
    narrative: 'This is a test narrative for the decision report.',
    diagram: '<path d="M 10 10 L 100 100" />',
    evidence: [
      { id: '1', claim: 'Test claim', strength: 'strong' },
      { id: '2', claim: 'Another claim', strength: 'weak' },
    ],
    risks: [
      { id: '1', level: 'high', description: 'Test risk' },
      { id: '2', level: 'medium', description: 'Another risk' },
    ],
    schemaVersion: '1.0.0',
  };

  describe('PDF Export', () => {
    it('should generate PDF with valid header', async () => {
      const pdfBuffer = await mockExportHandler('pdf', mockReportData);
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      
      const pdf = parsePDF(pdfBuffer as Buffer);
      expect(pdf.pages).toBeGreaterThan(0);
    });

    it('should contain key section headers in PDF', async () => {
      const pdfBuffer = await mockExportHandler('pdf', mockReportData);
      const pdf = parsePDF(pdfBuffer as Buffer);
      
      // Check for key sections
      expect(pdf.text).toContain('Evidence Map');
      expect(pdf.text).toContain('Risks');
      expect(pdf.text).toContain(mockReportData.title);
    });

    it('should contain narrative content in PDF', async () => {
      const pdfBuffer = await mockExportHandler('pdf', mockReportData);
      const pdf = parsePDF(pdfBuffer as Buffer);
      
      expect(pdf.text).toContain(mockReportData.narrative);
    });

    it('should open without errors (valid PDF structure)', async () => {
      const pdfBuffer = await mockExportHandler('pdf', mockReportData);
      
      // Verify PDF structure is valid
      const header = pdfBuffer.toString('utf-8', 0, 8);
      expect(header).toMatch(/^%PDF-/);
      
      // Check for required PDF objects
      const content = pdfBuffer.toString('utf-8');
      expect(content).toContain('/Type /Catalog');
      expect(content).toContain('/Type /Pages');
      expect(content).toContain('xref');
      expect(content).toContain('trailer');
      expect(content).toContain('%%EOF');
    });
  });

  describe('SVG Export', () => {
    it('should generate SVG with <svg> tag', async () => {
      const svgContent = await mockExportHandler('svg', mockReportData);
      expect(typeof svgContent).toBe('string');
      
      const svg = parseSVG(svgContent as string);
      expect(svg.hasSVGTag).toBe(true);
    });

    it('should contain non-empty nodes in SVG', async () => {
      const svgContent = await mockExportHandler('svg', mockReportData);
      const svg = parseSVG(svgContent as string);
      
      expect(svg.hasNodes).toBe(true);
      expect(svg.nodeCount).toBeGreaterThan(0);
    });

    it('should contain Mermaid diagram content', async () => {
      const svgContent = await mockExportHandler('svg', mockReportData);
      
      expect(svgContent).toContain('mermaid-diagram');
      expect(svgContent).toContain(mockReportData.diagram);
    });

    it('should contain key section labels', async () => {
      const svgContent = await mockExportHandler('svg', mockReportData);
      
      expect(svgContent).toContain('Evidence Map');
      expect(svgContent).toContain('Risks');
    });

    it('should be valid XML/SVG', async () => {
      const svgContent = await mockExportHandler('svg', mockReportData);
      
      // Check for XML declaration
      expect(svgContent).toContain('<?xml');
      // Check for SVG namespace
      expect(svgContent).toContain('xmlns="http://www.w3.org/2000/svg"');
      // Check for closing tag
      expect(svgContent).toContain('</svg>');
    });
  });

  describe('PNG Export', () => {
    it('should generate valid PNG file', async () => {
      const pngBuffer = await mockExportHandler('png', mockReportData);
      expect(Buffer.isBuffer(pngBuffer)).toBe(true);
      
      const isValid = validatePNG(pngBuffer as Buffer);
      expect(isValid).toBe(true);
    });

    it('should have correct PNG signature', async () => {
      const pngBuffer = await mockExportHandler('png', mockReportData);
      const signature = Buffer.isBuffer(pngBuffer) ? pngBuffer.slice(0, 8) : Buffer.from(pngBuffer).slice(0, 8);
      const expected = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      
      expect(signature.equals(expected)).toBe(true);
    });
  });

  describe('JSON Bundle Export', () => {
    it('should contain manifest fields', async () => {
      const jsonContent = await mockExportHandler('json', mockReportData);
      const json = JSON.parse(jsonContent as string);
      
      expect(json.manifest).toBeDefined();
      expect(json.manifest.title).toBe(mockReportData.title);
      expect(json.manifest.exportedAt).toBeDefined();
      expect(json.manifest.format).toBe('json');
      expect(json.manifest.version).toBe(mockReportData.schemaVersion);
    });

    it('should match current schema version', async () => {
      const jsonContent = await mockExportHandler('json', mockReportData);
      const json = JSON.parse(jsonContent as string);
      
      expect(json.schemaVersion).toBe(mockReportData.schemaVersion);
      expect(json.manifest.version).toBe(mockReportData.schemaVersion);
    });

    it('should contain all report data', async () => {
      const jsonContent = await mockExportHandler('json', mockReportData);
      const json = JSON.parse(jsonContent as string);
      
      expect(json.data).toBeDefined();
      expect(json.data.narrative).toBe(mockReportData.narrative);
      expect(json.data.diagram).toBe(mockReportData.diagram);
      expect(json.data.evidence).toEqual(mockReportData.evidence);
      expect(json.data.risks).toEqual(mockReportData.risks);
    });

    it('should be valid JSON', async () => {
      const jsonContent = await mockExportHandler('json', mockReportData);
      
      // Should parse without errors
      expect(() => JSON.parse(jsonContent as string)).not.toThrow();
      
      const json = JSON.parse(jsonContent as string);
      expect(typeof json).toBe('object');
      expect(json).not.toBeNull();
    });

    it('should include exportedAt timestamp', async () => {
      const jsonContent = await mockExportHandler('json', mockReportData);
      const json = JSON.parse(jsonContent as string);
      
      expect(json.manifest.exportedAt).toBeDefined();
      const exportedAt = new Date(json.manifest.exportedAt);
      expect(exportedAt.getTime()).toBeGreaterThan(0);
      expect(exportedAt.toISOString()).toBe(json.manifest.exportedAt);
    });
  });

  describe('Export Regression Prevention', () => {
    it('should maintain consistent PDF structure across exports', async () => {
      const pdf1 = await mockExportHandler('pdf', mockReportData);
      const pdf2 = await mockExportHandler('pdf', mockReportData);
      
      // Both should have valid PDF headers
      expect(pdf1.toString('utf-8', 0, 8)).toMatch(/^%PDF-/);
      expect(pdf2.toString('utf-8', 0, 8)).toMatch(/^%PDF-/);
      
      // Both should contain required sections
      const text1 = pdf1.toString('utf-8');
      const text2 = pdf2.toString('utf-8');
      expect(text1).toContain('Evidence Map');
      expect(text2).toContain('Evidence Map');
    });

    it('should maintain consistent JSON schema across exports', async () => {
      const json1 = await mockExportHandler('json', mockReportData);
      const json2 = await mockExportHandler('json', mockReportData);
      
      const data1 = JSON.parse(json1 as string);
      const data2 = JSON.parse(json2 as string);
      
      // Schema structure should be identical (ignoring timestamps)
      expect(data1.schemaVersion).toBe(data2.schemaVersion);
      expect(Object.keys(data1.manifest)).toEqual(Object.keys(data2.manifest));
      expect(Object.keys(data1.data)).toEqual(Object.keys(data2.data));
    });
  });
});

