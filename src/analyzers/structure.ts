import type { Analyzer, AnalyzerResult, Evidence } from "./types";

export class StructureAnalyzer implements Analyzer {
  analyze(content: string, filePath: string, language: string): AnalyzerResult {
    const lines = content.split("\n");
    const evidence: Evidence[] = [];

    evidence.push(...this.detectMixedExportStyles(lines));
    evidence.push(...this.detectInconsistentErrorHandling(lines));
    evidence.push(...this.detectFunctionLengthVariance(lines));

    const funcCount = Math.max(this.countFunctions(lines), 1);
    const score = Math.min(1.0, evidence.length / (funcCount + 2));

    return { dimension: "structure", score, evidence };
  }

  private detectMixedExportStyles(lines: string[]): Evidence[] {
    let hasDefaultExport = false;
    let hasNamedExport = false;
    let hasCjsExport = false;

    for (const line of lines) {
      if (/\bexport\s+default\b/.test(line)) hasDefaultExport = true;
      if (/\bexport\s+(?:function|const|class|let|var|async|enum|interface|type)\b/.test(line)) hasNamedExport = true;
      if (/\bmodule\.exports\b/.test(line) || /\bexports\.\w+/.test(line)) hasCjsExport = true;
    }

    const styles = [hasDefaultExport, hasNamedExport, hasCjsExport].filter(Boolean).length;
    if (styles >= 2) {
      const parts = [];
      if (hasDefaultExport) parts.push("default export");
      if (hasNamedExport) parts.push("named export");
      if (hasCjsExport) parts.push("CJS module.exports");
      return [{
        line: 1,
        code: "(file-level)",
        signal: "mixed_export_style",
        explanation: `Mixed export styles: ${parts.join(", ")}`,
        severity: "medium",
      }];
    }
    return [];
  }

  private detectInconsistentErrorHandling(lines: string[]): Evidence[] {
    const patterns: Set<string> = new Set();

    for (const line of lines) {
      const trimmed = line.trim();
      if (/\bcatch\b/.test(trimmed) || /\bexcept\b/.test(trimmed)) {
        // Look at surrounding lines for pattern type
        continue;
      }
      // return null/undefined as error handling
      if (/return\s+null\b/.test(trimmed)) patterns.add("return null");
      // throw
      if (/\bthrow\s+(?:new\s+)?\w+/.test(trimmed)) patterns.add("throw");
      // console.error
      if (/\bconsole\.(?:error|warn)\b/.test(trimmed)) patterns.add("console.error");
      // return empty array/object
      if (/return\s+\[\s*\]/.test(trimmed) || /return\s+\{\s*\}/.test(trimmed)) patterns.add("return empty");
    }

    if (patterns.size >= 3) {
      return [{
        line: 1,
        code: "(file-level)",
        signal: "inconsistent_error_handling",
        explanation: `${patterns.size} different error handling patterns: ${[...patterns].join(", ")}`,
        severity: "medium",
      }];
    }
    return [];
  }

  private detectFunctionLengthVariance(lines: string[]): Evidence[] {
    const funcLengths: number[] = [];
    const funcPattern = /(?:\bfunction\s+\w+|\b(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:function|\()|\b\w+\s*\([^)]*\)\s*\{)/;

    let funcStart = -1;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (funcStart === -1 && funcPattern.test(line)) {
        funcStart = i;
        braceDepth = 0;
      }

      if (funcStart >= 0) {
        for (const ch of line) {
          if (ch === "{") braceDepth++;
          if (ch === "}") braceDepth--;
        }

        if (braceDepth <= 0 && i > funcStart) {
          funcLengths.push(i - funcStart + 1);
          funcStart = -1;
        }
      }
    }

    if (funcLengths.length >= 2) {
      const sorted = [...funcLengths].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const longest = sorted[sorted.length - 1];

      if (median > 0 && longest / median > 5) {
        return [{
          line: 1,
          code: "(file-level)",
          signal: "function_length_variance",
          explanation: `High function length variance: longest=${longest} lines, median=${median} lines (ratio ${(longest / median).toFixed(1)})`,
          severity: "low",
        }];
      }
    }
    return [];
  }

  private countFunctions(lines: string[]): number {
    let count = 0;
    for (const line of lines) {
      if (/\bfunction\s+\w+/.test(line) || /=>\s*\{/.test(line) || /=>\s*[^{]/.test(line)) {
        count++;
      }
    }
    return count;
  }
}
