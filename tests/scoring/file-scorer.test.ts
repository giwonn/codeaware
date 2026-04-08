import { describe, test, expect } from "bun:test";
import { scoreFile } from "../../src/scoring/file-scorer";
import type { AnalyzerResult } from "../../src/analyzers/types";

function makeResults(scores: Record<string, number>): AnalyzerResult[] {
  return Object.entries(scores).map(([dimension, score]) => ({
    dimension,
    score,
    evidence: [],
  }));
}

describe("scoreFile", () => {
  test("all perfect → Level 1", () => {
    const results = makeResults({
      naming: 0, structure: 0, coupling: 0,
      hiddenContext: 0, documentation: 0, testCoverage: 0,
    });
    expect(scoreFile(results)).toBe(1);
  });

  test("all terrible → Level 6", () => {
    const results = makeResults({
      naming: 1, structure: 1, coupling: 1,
      hiddenContext: 1, documentation: 1, testCoverage: 1,
    });
    expect(scoreFile(results)).toBe(6);
  });

  test("hidden context override: 0.7 → Level 6", () => {
    const results = makeResults({
      naming: 0, structure: 0, coupling: 0,
      hiddenContext: 0.7, documentation: 0, testCoverage: 0,
    });
    expect(scoreFile(results)).toBe(6);
  });

  test("hidden context override: 0.5 → min Level 5", () => {
    const results = makeResults({
      naming: 0, structure: 0, coupling: 0,
      hiddenContext: 0.5, documentation: 0, testCoverage: 0,
    });
    expect(scoreFile(results)).toBeGreaterThanOrEqual(5);
  });

  test("mixed scores → weighted level", () => {
    const results = makeResults({
      naming: 0.3, structure: 0.4, coupling: 0.5,
      hiddenContext: 0.2, documentation: 0.6, testCoverage: 0.3,
    });
    const level = scoreFile(results);
    expect(level).toBeGreaterThanOrEqual(2);
    expect(level).toBeLessThanOrEqual(4);
  });
});
