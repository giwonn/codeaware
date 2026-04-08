import { describe, test, expect } from "bun:test";
import { detectGodClass } from "../../../src/analyzers/project-structure/god-class";
import type { FileAnalysis } from "../../../src/analyzers/types";

function makeFileAnalysis(filePath: string, lineCount: number, importCount: number): FileAnalysis {
  return {
    filePath,
    language: "java",
    lineCount,
    level: 1,
    levelLabel: "Well-organized",
    dimensions: {
      coupling: {
        score: importCount / 30,
        evidence: Array.from({ length: importCount }, (_, i) => ({
          line: i + 1,
          code: `import something.${i}`,
          signal: "high_import_count",
          explanation: "many imports",
          severity: "medium" as const,
        })),
      },
    },
  };
}

describe("detectGodClass", () => {
  test("detects file with 25 imports and 600 lines", () => {
    const files = [
      makeFileAnalysis("/project/GodService.java", 600, 25),
      makeFileAnalysis("/project/SmallService.java", 50, 3),
    ];
    const signals = detectGodClass(files);
    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe("god_class");
    expect(signals[0].description).toContain("GodService.java");
  });

  test("does not flag small file with many imports", () => {
    const files = [makeFileAnalysis("/project/SmallButImporty.java", 100, 25)];
    const signals = detectGodClass(files);
    expect(signals.length).toBe(0);
  });

  test("does not flag large file with few imports", () => {
    const files = [makeFileAnalysis("/project/LongButSimple.java", 600, 5)];
    const signals = detectGodClass(files);
    expect(signals.length).toBe(0);
  });
});
