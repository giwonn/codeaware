import { describe, test, expect } from "bun:test";
import { scanFile } from "../../src/tools/scan-file";

describe("scanFile", () => {
  test("level-5 fixture returns high level with evidence", async () => {
    const result = await scanFile("tests/fixtures/level-5/magic-numbers.ts");
    expect(result.level).toBeGreaterThanOrEqual(4);
    expect(result.dimensions.hiddenContext.evidence.length).toBeGreaterThan(0);
  });

  test("level-1 fixture returns low level", async () => {
    const result = await scanFile("tests/fixtures/level-1/clean.ts");
    expect(result.level).toBeLessThanOrEqual(2);
  });

  test("result includes all 6 dimensions", async () => {
    const result = await scanFile("tests/fixtures/level-1/clean.ts");
    const dims = Object.keys(result.dimensions);
    expect(dims).toContain("naming");
    expect(dims).toContain("structure");
    expect(dims).toContain("coupling");
    expect(dims).toContain("hiddenContext");
    expect(dims).toContain("documentation");
    expect(dims).toContain("testCoverage");
  });
});
