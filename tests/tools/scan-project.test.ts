import { describe, test, expect } from "bun:test";
import { scanProjectTool } from "../../src/tools/scan-project";

describe("scanProject", () => {
  test("scanning fixtures returns aggregated result", async () => {
    const result = await scanProjectTool("tests/fixtures");
    expect(result.level).toBeGreaterThanOrEqual(1);
    expect(result.level).toBeLessThanOrEqual(6);
    expect(result.totalFiles).toBeGreaterThan(0);
    expect(result.levelDistribution).toBeDefined();
    expect(result.worstFiles.length).toBeGreaterThan(0);
  });

  test("worst files are sorted by level descending", async () => {
    const result = await scanProjectTool("tests/fixtures");
    for (let i = 1; i < result.worstFiles.length; i++) {
      expect(result.worstFiles[i - 1].level).toBeGreaterThanOrEqual(result.worstFiles[i].level);
    }
  });
});
