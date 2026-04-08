import { describe, test, expect } from "bun:test";
import { StructureAnalyzer } from "../../src/analyzers/structure";

const analyzer = new StructureAnalyzer();

describe("StructureAnalyzer", () => {
  test("detects mixed export styles", async () => {
    const content = await Bun.file("tests/fixtures/level-3/mixed-exports.ts").text();
    const result = analyzer.analyze(content, "mixed-exports.ts", "typescript");
    const exportSignals = result.evidence.filter(e => e.signal === "mixed_export_style");
    expect(exportSignals.length).toBeGreaterThanOrEqual(1);
  });

  test("detects inconsistent error handling", async () => {
    const content = await Bun.file("tests/fixtures/level-3/mixed-exports.ts").text();
    const result = analyzer.analyze(content, "mixed-exports.ts", "typescript");
    const errorSignals = result.evidence.filter(e => e.signal === "inconsistent_error_handling");
    expect(errorSignals.length).toBeGreaterThanOrEqual(1);
  });

  test("detects function length variance", async () => {
    const content = await Bun.file("tests/fixtures/level-3/mixed-exports.ts").text();
    const result = analyzer.analyze(content, "mixed-exports.ts", "typescript");
    const lengthSignals = result.evidence.filter(e => e.signal === "function_length_variance");
    expect(lengthSignals.length).toBeGreaterThanOrEqual(1);
  });

  test("clean code scores low", async () => {
    const content = await Bun.file("tests/fixtures/level-1/clean.ts").text();
    const result = analyzer.analyze(content, "clean.ts", "typescript");
    expect(result.score).toBeLessThan(0.15);
  });
});
