import type { Analyzer, AnalyzerResult, Evidence } from "./types";

const OPAQUE_NAMES = new Set([
  "works", "test", "test 1", "test 2", "test 3",
  "should work", "handles case", "basic test", "it works",
  "pass", "passes", "ok", "correct",
]);

export class TestCoverageAnalyzer implements Analyzer {
  analyze(content: string, filePath: string, language: string): AnalyzerResult {
    // Only analyze test files — return -1 to signal "not applicable"
    if (!this.isTestFile(filePath)) {
      return { dimension: "testCoverage", score: -1, evidence: [] };
    }

    const lines = content.split("\n");
    const evidence: Evidence[] = [];

    evidence.push(...this.detectOpaqueTestNames(lines));
    evidence.push(...this.detectMagicTestValues(lines));
    evidence.push(...this.detectMissingEdgeCases(content));

    const testCount = Math.max(this.countTests(lines), 1);
    const score = Math.min(1.0, evidence.length / (testCount + 2));

    return { dimension: "testCoverage", score, evidence };
  }

  private isTestFile(filePath: string): boolean {
    return /\.(?:test|spec)\.\w+$/.test(filePath) || /_test\.\w+$/.test(filePath);
  }

  private detectOpaqueTestNames(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    const testNamePattern = /\b(?:it|test)\s*\(\s*["'`]([^"'`]+)["'`]/;

    for (let i = 0; i < lines.length; i++) {
      const match = testNamePattern.exec(lines[i]);
      if (!match) continue;

      const name = match[1].trim().toLowerCase();
      if (OPAQUE_NAMES.has(name) || name.length < 5) {
        evidence.push({
          line: i + 1,
          code: lines[i].trim(),
          signal: "opaque_test_name",
          explanation: `Opaque test name "${match[1]}" — doesn't describe expected behavior`,
          severity: "medium",
        });
      }
    }
    return evidence;
  }

  private detectMagicTestValues(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    // expect(x).toBe(<magic>) or expect(x).toEqual(<magic>)
    const assertionPattern = /\bexpect\b.*\.(?:toBe|toEqual)\s*\(([^)]+)\)/;

    for (let i = 0; i < lines.length; i++) {
      const match = assertionPattern.exec(lines[i]);
      if (!match) continue;

      const value = match[1].trim();
      // Check if it's a literal number (not a named constant or boolean)
      if (/^\d+$/.test(value) && !["0", "1", "2"].includes(value)) {
        evidence.push({
          line: i + 1,
          code: lines[i].trim(),
          signal: "magic_test_value",
          explanation: `Magic value ${value} in assertion — meaning unclear`,
          severity: "medium",
        });
      }
    }
    return evidence;
  }

  private detectMissingEdgeCases(content: string): Evidence[] {
    const edgeCaseKeywords = ["error", "null", "undefined", "empty", "boundary", "edge", "invalid", "negative", "zero", "overflow", "timeout"];
    const lowerContent = content.toLowerCase();
    const hasEdgeCases = edgeCaseKeywords.some(kw => lowerContent.includes(kw));

    if (!hasEdgeCases) {
      return [{
        line: 1,
        code: "(file-level)",
        signal: "missing_edge_cases",
        explanation: "No edge case tests detected (no error/null/empty/boundary test names)",
        severity: "low",
      }];
    }
    return [];
  }

  private countTests(lines: string[]): number {
    return lines.filter(l => /\b(?:it|test)\s*\(/.test(l)).length;
  }
}
