import { describe, test, expect } from "bun:test";
import { scoreProject } from "../../src/scoring/project-scorer";
import type { Level } from "../../src/analyzers/types";

describe("scoreProject", () => {
  test("all Level 1 → Level 1", () => {
    const fileLevels: Level[] = Array(10).fill(1);
    expect(scoreProject(fileLevels)).toBe(1);
  });

  test("all Level 6 → Level 6", () => {
    const fileLevels: Level[] = Array(10).fill(6);
    expect(scoreProject(fileLevels)).toBe(6);
  });

  test("80% Level 1 + 20% Level 5 ≠ Level 1", () => {
    const fileLevels: Level[] = [
      ...Array(8).fill(1),
      ...Array(2).fill(5),
    ];
    const result = scoreProject(fileLevels);
    expect(result).toBeGreaterThan(1);
  });

  test("worst quartile dominates", () => {
    const fileLevels: Level[] = [
      ...Array(12).fill(1),
      ...Array(4).fill(5),
    ];
    const result = scoreProject(fileLevels);
    expect(result).toBeGreaterThanOrEqual(3);
  });

  test("empty → Level 1", () => {
    expect(scoreProject([])).toBe(1);
  });
});
