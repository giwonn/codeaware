import type { Analyzer, AnalyzerResult, Evidence } from "./types";

const LOOP_VARS = new Set(["i", "j", "k", "n", "m", "x", "y", "z"]);
const GENERIC_NAMES = new Set([
  "data", "info", "temp", "result", "value", "item", "obj", "stuff",
  "thing", "val", "tmp", "ret", "output", "input", "buf", "str",
  "num", "cnt", "arr", "list", "map", "set",
]);
const COMMON_ABBREVIATIONS = new Set([
  "mgr", "proc", "idx", "res", "req", "btn", "msg", "cfg", "ctx",
  "env", "err", "fn", "cb", "evt", "ptr", "buf", "len", "cnt",
  "src", "dst", "pkg", "ref", "fmt", "gen", "img", "dir", "srv",
  "usr", "pwd", "acc", "addr", "avg", "calc", "cur", "desc",
  "doc", "elem", "ext", "grp", "hdr", "init", "max", "min",
  "opt", "param", "pos", "prev", "sel", "seq", "tbl",
]);

export class NamingAnalyzer implements Analyzer {
  analyze(content: string, filePath: string, language: string): AnalyzerResult {
    const lines = content.split("\n");
    const evidence: Evidence[] = [];
    const allIdentifiers: string[] = [];

    // Extract identifiers from declarations
    const declPatterns = [
      // JS/TS: const/let/var name, function name, function params
      /\b(?:const|let|var)\s+(\w+)/g,
      /\bfunction\s+(\w+)/g,
      /(?:^|[\s,({])\s*(\w+)\s*(?:[:=]|:\s*\w)/g,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*")) continue;
      if (trimmed.startsWith("import") || trimmed.startsWith("from")) continue;

      for (const pattern of declPatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const name = match[1];
          if (!name || /^[A-Z_]+$/.test(name)) continue; // Skip UPPER_CASE constants
          allIdentifiers.push(name);

          // Single-letter names (exclude loop vars in for loops)
          if (name.length === 1) {
            const isLoopContext = /\bfor\b/.test(line) && LOOP_VARS.has(name);
            if (!isLoopContext) {
              evidence.push({
                line: i + 1,
                code: trimmed,
                signal: "single_letter_name",
                explanation: `Single-letter identifier "${name}"`,
                severity: "medium",
              });
            }
          }

          // Generic names
          if (GENERIC_NAMES.has(name.toLowerCase())) {
            evidence.push({
              line: i + 1,
              code: trimmed,
              signal: "generic_name",
              explanation: `Generic name "${name}" — conveys no domain meaning`,
              severity: "medium",
            });
          }

          // Abbreviated names (3 chars or fewer, not single-letter which is caught above)
          if (name.length > 1 && name.length <= 3 && COMMON_ABBREVIATIONS.has(name.toLowerCase())) {
            evidence.push({
              line: i + 1,
              code: trimmed,
              signal: "abbreviated_name",
              explanation: `Abbreviated name "${name}"`,
              severity: "low",
            });
          }
        }
      }

    }

    // Check for inconsistent casing (file-level check, runs once)
    this.detectInconsistentCasing(lines, evidence);

    const totalIdentifiers = Math.max(allIdentifiers.length, 1);
    const score = Math.min(1.0, evidence.length / totalIdentifiers);

    return { dimension: "naming", score, evidence };
  }

  private detectInconsistentCasing(lines: string[], evidence: Evidence[]): void {
    let hasCamelCase = false;
    let hasSnakeCase = false;
    const camelPattern = /\b[a-z]+[A-Z]\w*/;
    const snakePattern = /\b[a-z]+_[a-z]+\w*/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("import")) continue;
      if (camelPattern.test(trimmed)) hasCamelCase = true;
      if (snakePattern.test(trimmed)) hasSnakeCase = true;
    }

    if (hasCamelCase && hasSnakeCase) {
      evidence.push({
        line: 1,
        code: "(file-level)",
        signal: "inconsistent_casing",
        explanation: "Mixed camelCase and snake_case naming in the same file",
        severity: "low",
      });
    }
  }
}
