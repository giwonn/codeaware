import { describe, test, expect } from "bun:test";
import { generateRoadmap } from "../../src/roadmap/roadmap-generator";
import type { FileAnalysis } from "../../src/analyzers/types";

function makeFileAnalysis(overrides: Partial<FileAnalysis>): FileAnalysis {
  return {
    filePath: "test.ts",
    language: "typescript",
    lineCount: 50,
    level: 3,
    levelLabel: "Mixed patterns",
    dimensions: {
      naming: { score: 0.3, evidence: [] },
      structure: { score: 0.2, evidence: [] },
      coupling: { score: 0.1, evidence: [] },
      hiddenContext: { score: 0.1, evidence: [] },
      documentation: { score: 0.4, evidence: [] },
      testCoverage: { score: 0.2, evidence: [] },
    },
    ...overrides,
  };
}

describe("generateRoadmap", () => {
  test("hidden context items come first", () => {
    const files = [
      makeFileAnalysis({
        filePath: "a.ts",
        dimensions: {
          naming: { score: 0.8, evidence: [] },
          structure: { score: 0.1, evidence: [] },
          coupling: { score: 0.1, evidence: [] },
          hiddenContext: {
            score: 0.6,
            evidence: [{
              line: 10, code: "x === 47", signal: "magic_number",
              explanation: "unexplained", severity: "high",
            }],
          },
          documentation: { score: 0.1, evidence: [] },
          testCoverage: { score: 0.1, evidence: [] },
        },
      }),
    ];
    const roadmap = generateRoadmap(files);
    expect(roadmap.phases[0].dimension).toBe("hiddenContext");
  });

  test("generates phases in priority order", () => {
    const files = [makeFileAnalysis({})];
    const roadmap = generateRoadmap(files);
    const dims = roadmap.phases.map(p => p.dimension);
    const priorityOrder = ["hiddenContext", "documentation", "naming", "structure", "coupling", "testCoverage"];
    const filtered = dims.filter(d => priorityOrder.includes(d));
    expect(filtered).toEqual(priorityOrder.filter(d => dims.includes(d)));
  });

  test("each item has file path and reason", () => {
    const files = [makeFileAnalysis({
      filePath: "important.ts",
      dimensions: {
        naming: { score: 0.5, evidence: [{ line: 1, code: "x", signal: "single_letter_name", explanation: "bad", severity: "medium" }] },
        structure: { score: 0.2, evidence: [] },
        coupling: { score: 0.1, evidence: [] },
        hiddenContext: { score: 0.1, evidence: [] },
        documentation: { score: 0.4, evidence: [{ line: 2, code: "fn()", signal: "undocumented_export", explanation: "no docs", severity: "medium" }] },
        testCoverage: { score: 0.2, evidence: [] },
      },
    })];
    const roadmap = generateRoadmap(files);
    for (const phase of roadmap.phases) {
      for (const item of phase.items) {
        expect(item.filePath).toBeDefined();
        expect(item.reason).toBeDefined();
      }
    }
  });
});
