type Parser = (content: string) => string[];

const PARSERS: Record<string, Parser> = {
  java: (content) => {
    const matches: string[] = [];
    for (const m of content.matchAll(/^import\s+(?:static\s+)?([a-zA-Z0-9_.]+);/gm)) {
      matches.push(m[1]);
    }
    return matches;
  },

  kotlin: (content) => {
    const matches: string[] = [];
    for (const m of content.matchAll(/^import\s+([a-zA-Z0-9_.]+)/gm)) {
      matches.push(m[1]);
    }
    return matches;
  },

  typescript: (content) => {
    const matches: string[] = [];
    for (const m of content.matchAll(/(?:import\s+.*?\s+from\s+|import\s+)["']([^"']+)["']/gm)) {
      matches.push(m[1]);
    }
    for (const m of content.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/gm)) {
      matches.push(m[1]);
    }
    return matches;
  },

  python: (content) => {
    const matches: string[] = [];
    for (const m of content.matchAll(/^from\s+(\S+)\s+import/gm)) {
      matches.push(m[1]);
    }
    for (const m of content.matchAll(/^import\s+(\S+)/gm)) {
      if (!m[1].startsWith("(")) matches.push(m[1]);
    }
    return matches;
  },

  go: (content) => {
    const matches: string[] = [];
    for (const m of content.matchAll(/^import\s+"([^"]+)"/gm)) {
      matches.push(m[1]);
    }
    for (const m of content.matchAll(/^import\s*\(([\s\S]*?)\)/gm)) {
      for (const line of m[1].matchAll(/"([^"]+)"/g)) {
        matches.push(line[1]);
      }
    }
    return matches;
  },
};

PARSERS.javascript = PARSERS.typescript;

export function parseImports(content: string, language: string): string[] {
  const parser = PARSERS[language];
  if (!parser) return [];
  return parser(content);
}
