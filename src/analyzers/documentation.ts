import type { Analyzer, AnalyzerResult, Evidence } from "./types";

export class DocumentationAnalyzer implements Analyzer {
  analyze(content: string, filePath: string, language: string): AnalyzerResult {
    const lines = content.split("\n");
    const evidence: Evidence[] = [];

    evidence.push(...this.detectUndocumentedExports(lines));
    evidence.push(...this.detectUncommentedComplexConditions(lines));
    evidence.push(...this.detectUnexplainedRegex(lines));
    evidence.push(...this.detectNoModuleComment(lines));
    evidence.push(...this.detectLongFunctionWithoutSections(lines));

    // Normalize: count of signals vs number of documentable items
    const exportCount = lines.filter(l => /\bexport\s+(?:function|class|const|default)\b/.test(l)).length;
    const denominator = Math.max(exportCount + 3, 8); // avoid over-sensitivity on small files
    const score = Math.min(1.0, evidence.length / denominator);

    return { dimension: "documentation", score, evidence };
  }

  private detectUndocumentedExports(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    const exportPattern = /\bexport\s+(?:default\s+)?(?:function|class|const|async\s+function)\s+(\w+)/;

    for (let i = 0; i < lines.length; i++) {
      const match = exportPattern.exec(lines[i]);
      if (!match) continue;

      // Check if previous lines have JSDoc or comment
      let hasDoc = false;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prev = lines[j].trim();
        if (prev === "") continue;
        if (prev.startsWith("/**") || prev.startsWith("*") || prev.startsWith("*/") ||
            prev.startsWith("//")) {
          hasDoc = true;
          break;
        }
        break; // Non-comment, non-empty line
      }

      if (!hasDoc) {
        evidence.push({
          line: i + 1,
          code: lines[i].trim(),
          signal: "undocumented_export",
          explanation: `Exported "${match[1]}" has no documentation`,
          severity: "medium",
        });
      }
    }
    return evidence;
  }

  private detectUncommentedComplexConditions(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Count logical operators
      const andOrCount = (line.match(/&&|\|\|/g) || []).length;
      if (andOrCount < 2) continue;

      // Check if previous line or inline has a comment
      const prevLine = i > 0 ? lines[i - 1].trim() : "";
      if (prevLine.startsWith("//") || prevLine.startsWith("*") || line.includes("//")) continue;

      evidence.push({
        line: i + 1,
        code: line.trim(),
        signal: "uncommented_complex_condition",
        explanation: `Complex condition with ${andOrCount + 1} clauses and no explanation`,
        severity: "medium",
      });
    }
    return evidence;
  }

  private detectUnexplainedRegex(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    // Match regex literals that are non-trivial (more than simple character classes)
    const regexPattern = /\/(?:[^/\\]|\\.){8,}\//;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("//") || line.startsWith("*")) continue;

      if (regexPattern.test(line)) {
        // Check for a comment on this line or previous line
        const hasComment = line.includes("//") ||
          (i > 0 && (lines[i - 1].trim().startsWith("//") || lines[i - 1].trim().startsWith("*")));
        if (!hasComment) {
          evidence.push({
            line: i + 1,
            code: line,
            signal: "unexplained_regex",
            explanation: "Non-trivial regex without explanation",
            severity: "medium",
          });
        }
      }
    }
    return evidence;
  }

  private detectNoModuleComment(lines: string[]): Evidence[] {
    // Check first 10 lines for any documentation comment
    const firstLines = lines.slice(0, 10);
    const hasModuleComment = firstLines.some(l => {
      const t = l.trim();
      if (t.startsWith("#!")) return false; // shebang is not a module comment
      return t.startsWith("/**") || t.startsWith("//") || t.startsWith("#") || t.startsWith("'''") || t.startsWith('"""');
    });

    // Skip small files (< 10 lines)
    if (lines.length < 10) return [];

    if (!hasModuleComment) {
      return [{
        line: 1,
        code: "(file-level)",
        signal: "no_module_comment",
        explanation: "No module-level comment in first 10 lines",
        severity: "low",
      }];
    }
    return [];
  }

  private detectLongFunctionWithoutSections(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    const funcPattern = /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:function|\())/;

    let funcStart = -1;
    let braceDepth = 0;
    let funcName = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (funcStart === -1) {
        const match = funcPattern.exec(line);
        if (match) {
          funcStart = i;
          funcName = line.trim();
          braceDepth = 0;
        }
      }

      if (funcStart >= 0) {
        for (const ch of line) {
          if (ch === "{") braceDepth++;
          if (ch === "}") braceDepth--;
        }

        if (braceDepth <= 0 && i > funcStart) {
          const funcLength = i - funcStart + 1;
          if (funcLength > 30) {
            // Check for section comments within the function body
            const bodyLines = lines.slice(funcStart + 1, i);
            const hasSection = bodyLines.some(l => /^\s*\/\//.test(l));
            if (!hasSection) {
              evidence.push({
                line: funcStart + 1,
                code: funcName,
                signal: "long_function_no_sections",
                explanation: `${funcLength}-line function without section comments`,
                severity: "low",
              });
            }
          }
          funcStart = -1;
        }
      }
    }
    return evidence;
  }
}
