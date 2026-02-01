/**
 * Markdown Section Parser
 * 
 * Splits markdown content by H2 headings (## ...) and returns a map of section names to content.
 * 
 * @param markdown - The markdown content to parse
 * @returns Map of section name (normalized) -> markdown content
 */
export function parseMarkdownSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  
  if (!markdown || !markdown.trim()) {
    return sections;
  }

  // Split by H2 headings (## ...)
  const h2Pattern = /^##\s+(.+)$/gm;
  const lines = markdown.split('\n');
  
  let currentSection: string | null = null;
  let currentContent: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2Match = line.match(/^##\s+(.+)$/);
    
    if (h2Match) {
      // Save previous section if exists
      if (currentSection !== null) {
        sections.set(currentSection, currentContent.join('\n').trim());
      }
      
      // Start new section
      currentSection = normalizeSectionName(h2Match[1]);
      currentContent = [];
    } else {
      // Add line to current section content
      if (currentSection !== null) {
        currentContent.push(line);
      } else {
        // Content before first H2 goes to overview
        if (!sections.has('overview')) {
          sections.set('overview', '');
        }
        const overviewContent = sections.get('overview') || '';
        sections.set('overview', overviewContent + (overviewContent ? '\n' : '') + line);
      }
    }
  }
  
  // Save last section
  if (currentSection !== null) {
    sections.set(currentSection, currentContent.join('\n').trim());
  }
  
  return sections;
}

/**
 * Normalize section name for consistent lookup
 * Maps various heading formats to standard section names
 */
function normalizeSectionName(heading: string): string {
  const normalized = heading.trim().toLowerCase();
  
  // Map common variations to standard names
  const mappings: Record<string, string> = {
    'decision overview': 'overview',
    'overview': 'overview',
    'summary': 'overview',
    'key evidence': 'evidence',
    'evidence': 'evidence',
    'assumptions': 'assumptions',
    'alternatives': 'alternatives',
    'risks identified': 'risks',
    'risks': 'risks',
    'risk': 'risks',
    'stakeholders': 'stakeholders',
  };
  
  // Check for exact match
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Check for partial match
  for (const [key, value] of Object.entries(mappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Return normalized version as-is
  return normalized.replace(/\s+/g, '-');
}

/**
 * Get section content by name
 * Returns empty string if section not found
 */
export function getSectionContent(
  sections: Map<string, string>,
  sectionName: string
): string {
  return sections.get(sectionName) || sections.get(normalizeSectionName(sectionName)) || '';
}


