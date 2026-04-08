import type { Analyzer, AnalyzerResult, Evidence, Severity } from "./types";

export class CouplingAnalyzer implements Analyzer {
  analyze(content: string, filePath: string, language: string): AnalyzerResult {
    const lines = content.split("\n");
    const evidence: Evidence[] = [];

    evidence.push(...this.detectHighImportCount(lines));
    evidence.push(...this.detectGlobalStateAccess(lines));
    evidence.push(...this.detectCrossDirectoryImports(lines));

    const importCount = lines.filter(l => /^\s*import\b/.test(l)).length;
    const denominator = Math.max(importCount + 3, 5);
    const score = Math.min(1.0, evidence.length / denominator);

    return { dimension: "coupling", score, evidence };
  }

  private detectHighImportCount(lines: string[]): Evidence[] {
    const importLines = lines.filter(l => /^\s*import\b/.test(l));
    const count = importLines.length;

    if (count >= 8) {
      const severity: Severity = count >= 15 ? "critical" : "high";
      return [{
        line: 1,
        code: `${count} import statements`,
        signal: "high_import_count",
        explanation: `File has ${count} imports — high coupling to external modules`,
        severity,
      }];
    }
    return [];
  }

  private detectGlobalStateAccess(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    const globalPatterns = [
      /\bglobalThis\.\w+/,
      /\bglobalState\.\w+/,
      /\bglobal\.\w+/,
      /\bwindow\.\w+/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("//") || line.startsWith("*")) continue;
      // Skip declarations
      if (/\bdeclare\s+var\b/.test(line)) continue;

      for (const pattern of globalPatterns) {
        const match = pattern.exec(line);
        if (match) {
          evidence.push({
            line: i + 1,
            code: line,
            signal: "global_state_access",
            explanation: `Global state access: ${match[0]}`,
            severity: "high",
          });
          break;
        }
      }
    }
    return evidence;
  }

  private detectCrossDirectoryImports(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    // Match relative imports going up 2+ directories
    const crossDirPattern = /from\s+["'](\.\.\/.*)["']/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!/^\s*import\b/.test(line)) continue;

      const match = crossDirPattern.exec(line);
      if (match) {
        const path = match[1];
        const depth = (path.match(/\.\.\//g) || []).length;
        if (depth >= 2) {
          evidence.push({
            line: i + 1,
            code: line.trim(),
            signal: "cross_directory_import",
            explanation: `Deep relative import (${depth} levels up): ${path}`,
            severity: "medium",
          });
        }
      }
    }
    return evidence;
  }
}
