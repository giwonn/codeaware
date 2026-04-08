import type { Analyzer, AnalyzerResult, Evidence, Severity } from "./types";

// Numbers that are commonly understood and don't need explanation
const KNOWN_NUMBERS = new Set([
  0, 1, -1, 2, 3, 4, 5, 8, 10, 12, 16, 24, 32, 50, 60, 64, 100, 128,
  256, 500, 512, 1000, 1024, 2048, 4096,
  // Common HTTP status codes
  200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 405, 408, 409, 429, 500, 502, 503, 504,
]);

// Common small floats (percentages, ratios)
const KNOWN_FLOATS = new Set([0.0, 0.5, 1.0, 0.25, 0.75]);

const SIGNAL_WEIGHTS: Record<string, number> = {
  magic_number: 3,
  hardcoded_date: 2,
  order_dependent_init: 2,
  unexplained_catch: 4,
  unexplained_value_comparison: 3,
  env_specific_branch: 2,
  commented_out_code: 1,
  todo_without_ticket: 1,
};

export class HiddenContextAnalyzer implements Analyzer {
  analyze(content: string, filePath: string, language: string): AnalyzerResult {
    const lines = content.split("\n");
    const evidence: Evidence[] = [];

    evidence.push(...this.detectMagicNumbers(lines));
    evidence.push(...this.detectHardcodedDates(lines));
    evidence.push(...this.detectOrderDependentInit(lines));
    evidence.push(...this.detectUnexplainedCatch(lines, content));
    evidence.push(...this.detectUnexplainedValueComparisons(lines));
    evidence.push(...this.detectEnvSpecificBranching(lines));
    evidence.push(...this.detectCommentedOutCode(lines));
    evidence.push(...this.detectTodoWithoutTicket(lines));

    const weightedSum = evidence.reduce(
      (sum, e) => sum + (SIGNAL_WEIGHTS[e.signal] ?? 1),
      0,
    );
    const score = Math.min(1.0, weightedSum / Math.max(lines.length, 1));

    return { dimension: "hiddenContext", score, evidence };
  }

  private detectMagicNumbers(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    // Match numeric literals in code (not in comments, not in const declarations with descriptive names)
    const numberPattern = /(?<!\w)(-?\d+\.?\d*)\b/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip comments
      if (line.startsWith("//") || line.startsWith("#") || line.startsWith("*") || line.startsWith("/*")) continue;
      // Skip const/final declarations with UPPER_CASE names (these are self-documenting)
      if (/\b(?:const|final|static final|let|var)\s+[A-Z_]{2,}\s*=/.test(line)) continue;
      // Skip import/require lines
      if (/^(?:import|require|from)\b/.test(line)) continue;

      let match;
      numberPattern.lastIndex = 0;
      while ((match = numberPattern.exec(line)) !== null) {
        const num = parseFloat(match[1]);
        if (isNaN(num)) continue;
        if (KNOWN_NUMBERS.has(num)) continue;
        if (KNOWN_FLOATS.has(num)) continue;
        // Skip array indices and simple increments
        if (/\[\s*\d+\s*\]/.test(line) && match[1] === line.match(/\[(\d+)\]/)?.[1]) continue;

        evidence.push({
          line: i + 1,
          code: line,
          signal: "magic_number",
          explanation: `Unexplained numeric literal ${match[1]}`,
          severity: "high",
        });
      }
    }
    return evidence;
  }

  private detectHardcodedDates(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    const datePattern = /["'`](\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)['"` ]/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("//") || line.startsWith("#")) continue;
      // Skip const declarations with descriptive names
      if (/\b(?:const|final)\s+[A-Z_]{2,}\s*=/.test(line)) continue;

      const match = datePattern.exec(line);
      if (match) {
        evidence.push({
          line: i + 1,
          code: line,
          signal: "hardcoded_date",
          explanation: `Hardcoded date literal "${match[1]}"`,
          severity: "medium",
        });
      }
    }
    return evidence;
  }

  private detectOrderDependentInit(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    // Look for sequences of 3+ bare function calls with no data dependency
    const callPattern = /^\s*(?:this\.)?(\w+)\s*\(\s*\)\s*;?\s*$/;
    let consecutiveCalls: { line: number; code: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (callPattern.test(line.trim())) {
        consecutiveCalls.push({ line: i + 1, code: line.trim() });
      } else {
        if (consecutiveCalls.length >= 3) {
          evidence.push({
            line: consecutiveCalls[0].line,
            code: consecutiveCalls.map(c => c.code).join("; "),
            signal: "order_dependent_init",
            explanation: `${consecutiveCalls.length} sequential void calls — order dependency unclear`,
            severity: "medium",
          });
        }
        consecutiveCalls = [];
      }
    }
    // Check remaining
    if (consecutiveCalls.length >= 3) {
      evidence.push({
        line: consecutiveCalls[0].line,
        code: consecutiveCalls.map(c => c.code).join("; "),
        signal: "order_dependent_init",
        explanation: `${consecutiveCalls.length} sequential void calls — order dependency unclear`,
        severity: "medium",
      });
    }

    return evidence;
  }

  private detectUnexplainedCatch(lines: string[], content: string): Evidence[] {
    const evidence: Evidence[] = [];
    // Look for catch/except blocks with conditional logic but no comments
    const catchPatterns = [
      /}\s*catch\s*\(/,          // JS/TS/Java catch
      /except\s+\w+/,            // Python except
    ];
    const conditionPattern = /\b(?:if|switch|else\s+if)\b/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isCatch = catchPatterns.some(p => p.test(line));
      if (!isCatch) continue;

      // Look ahead for conditional logic in the catch block
      let braceDepth = 0;
      let foundCondition = false;
      let hasComment = false;
      const catchStart = i;

      for (let j = i; j < Math.min(i + 20, lines.length); j++) {
        const checkLine = lines[j];
        if (checkLine.includes("{")) braceDepth++;
        if (checkLine.includes("}")) braceDepth--;
        if (conditionPattern.test(checkLine)) foundCondition = true;
        if (/\/\/|\/\*|#.*\w/.test(checkLine) && j > i) hasComment = true;

        // For Python, use indentation-based block detection
        if (line.trim().startsWith("except")) {
          const baseIndent = line.search(/\S/);
          if (j > i && lines[j].search(/\S/) <= baseIndent && lines[j].trim().length > 0) break;
          if (conditionPattern.test(checkLine)) foundCondition = true;
        } else if (braceDepth <= 0 && j > i) break;
      }

      if (foundCondition && !hasComment) {
        evidence.push({
          line: catchStart + 1,
          code: lines.slice(catchStart, Math.min(catchStart + 5, lines.length)).map(l => l.trim()).join(" "),
          signal: "unexplained_catch",
          explanation: "Conditional logic in catch/except block without explanation",
          severity: "high",
        });
      }
    }
    return evidence;
  }

  private detectUnexplainedValueComparisons(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    // if (x === <non-obvious-number>) patterns
    const compPattern = /(?:===?|!==?|==)\s*(-?\d+)\b/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("//") || line.startsWith("#")) continue;
      if (!/\bif\b/.test(line) && !/\bcase\b/.test(line)) continue;

      const match = compPattern.exec(line);
      if (match) {
        const num = parseInt(match[1]);
        if (KNOWN_NUMBERS.has(num)) continue;
        // Check if previous line has a comment explaining
        if (i > 0 && /\/\/|\/\*|#/.test(lines[i - 1].trim())) continue;

        evidence.push({
          line: i + 1,
          code: line,
          signal: "unexplained_value_comparison",
          explanation: `Comparison with unexplained value ${match[1]}`,
          severity: "high",
        });
      }
    }
    return evidence;
  }

  private detectEnvSpecificBranching(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    const envPatterns = [
      /process\.env\.\w+/,
      /os\.(?:environ|getenv)\s*\(/,
      /System\.getenv\s*\(/,
      /ENV\[["']\w+["']\]/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("//") || line.startsWith("#")) continue;

      for (const pattern of envPatterns) {
        const match = pattern.exec(line);
        if (match) {
          evidence.push({
            line: i + 1,
            code: line,
            signal: "env_specific_branch",
            explanation: `Environment-specific branching: ${match[0]}`,
            severity: "medium",
          });
          break;
        }
      }
    }
    return evidence;
  }

  private detectCommentedOutCode(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    // Look for 5+ consecutive commented lines that look like code
    const codeCommentPatterns = [
      /^\s*\/\/\s*(?:const|let|var|function|if|for|while|return|import|export|class)\b/,
      /^\s*#\s*(?:def|class|if|for|while|return|import|from)\b/,
      /^\s*\/\/.*[{};=()]/,
      /^\s*#.*[=()[\]]/,
    ];

    let consecutiveCommented = 0;
    let startLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isCodeComment = codeCommentPatterns.some(p => p.test(line));
      if (isCodeComment) {
        if (consecutiveCommented === 0) startLine = i;
        consecutiveCommented++;
      } else {
        if (consecutiveCommented >= 5) {
          evidence.push({
            line: startLine + 1,
            code: lines.slice(startLine, startLine + 3).map(l => l.trim()).join("\n"),
            signal: "commented_out_code",
            explanation: `${consecutiveCommented} consecutive lines of commented-out code`,
            severity: "low",
          });
        }
        consecutiveCommented = 0;
      }
    }
    if (consecutiveCommented >= 5) {
      evidence.push({
        line: startLine + 1,
        code: lines.slice(startLine, startLine + 3).map(l => l.trim()).join("\n"),
        signal: "commented_out_code",
        explanation: `${consecutiveCommented} consecutive lines of commented-out code`,
        severity: "low",
      });
    }
    return evidence;
  }

  private detectTodoWithoutTicket(lines: string[]): Evidence[] {
    const evidence: Evidence[] = [];
    const todoPattern = /\b(TODO|FIXME|HACK|XXX)\b/i;
    const ticketPattern = /[A-Z]+-\d+|#\d+|https?:\/\//;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (todoPattern.test(line) && !ticketPattern.test(line)) {
        evidence.push({
          line: i + 1,
          code: line.trim(),
          signal: "todo_without_ticket",
          explanation: "TODO/FIXME/HACK without ticket reference",
          severity: "low",
        });
      }
    }
    return evidence;
  }
}
