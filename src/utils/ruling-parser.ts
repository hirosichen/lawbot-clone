export interface RulingSection {
  title: string;
  content: string;
  id: string;
}

const SECTION_PATTERNS: Array<{ regex: RegExp; title: string; id: string }> = [
  { regex: /^[\s]*主\s*文[\s]*$/m, title: '主文', id: 'main-text' },
  { regex: /^[\s]*事\s*實\s*及\s*理\s*由[\s]*$/m, title: '事實及理由', id: 'facts-and-reasons' },
  { regex: /^[\s]*事\s*實[\s]*$/m, title: '事實', id: 'facts' },
  { regex: /^[\s]*理\s*由[\s]*$/m, title: '理由', id: 'reasons' },
  { regex: /^[\s]*據\s*上\s*論\s*結[\s]*$/m, title: '據上論結', id: 'conclusion' },
  { regex: /^[\s]*據\s*上\s*論\s*斷[\s]*$/m, title: '據上論斷', id: 'conclusion' },
];

export function parseRulingText(fullText: string): RulingSection[] {
  if (!fullText) return [];

  // Find all section positions
  const found: Array<{ title: string; id: string; index: number; matchEnd: number }> = [];

  for (const pat of SECTION_PATTERNS) {
    const match = pat.regex.exec(fullText);
    if (match) {
      // Skip if we already have a section at a similar position (e.g. "事實及理由" vs "事實")
      const duplicate = found.some(
        (f) => f.id === pat.id || Math.abs(f.index - match.index) < 10,
      );
      if (!duplicate) {
        found.push({
          title: pat.title,
          id: pat.id,
          index: match.index,
          matchEnd: match.index + match[0].length,
        });
      }
    }
  }

  // Sort by position
  found.sort((a, b) => a.index - b.index);

  if (found.length === 0) {
    return [{ title: '全文', content: fullText.trim(), id: 'full-text' }];
  }

  const sections: RulingSection[] = [];

  // Content before the first section header
  const preamble = fullText.slice(0, found[0].index).trim();
  if (preamble) {
    sections.push({ title: '前言', content: preamble, id: 'preamble' });
  }

  // Each section
  for (let i = 0; i < found.length; i++) {
    const start = found[i].matchEnd;
    const end = i + 1 < found.length ? found[i + 1].index : fullText.length;
    const content = fullText.slice(start, end).trim();
    sections.push({ title: found[i].title, id: found[i].id, content });
  }

  return sections;
}
