import { describe, test, expect } from "bun:test";
import { DocumentationAnalyzer } from "../../src/analyzers/documentation";

const analyzer = new DocumentationAnalyzer();

describe("DocumentationAnalyzer", () => {
  test("detects exported functions without docs", async () => {
    const content = await Bun.file("tests/fixtures/level-3/no-docs.ts").text();
    const result = analyzer.analyze(content, "no-docs.ts", "typescript");
    const noDocSignals = result.evidence.filter(e => e.signal === "undocumented_export");
    expect(noDocSignals.length).toBeGreaterThanOrEqual(2);
  });

  test("detects complex conditionals without comments", async () => {
    const content = await Bun.file("tests/fixtures/level-3/no-docs.ts").text();
    const result = analyzer.analyze(content, "no-docs.ts", "typescript");
    const complexSignals = result.evidence.filter(e => e.signal === "uncommented_complex_condition");
    expect(complexSignals.length).toBeGreaterThanOrEqual(1);
  });

  test("detects regex without explanation", async () => {
    const content = await Bun.file("tests/fixtures/level-3/no-docs.ts").text();
    const result = analyzer.analyze(content, "no-docs.ts", "typescript");
    const regexSignals = result.evidence.filter(e => e.signal === "unexplained_regex");
    expect(regexSignals.length).toBeGreaterThanOrEqual(1);
  });

  test("clean code scores low", async () => {
    const content = await Bun.file("tests/fixtures/level-1/clean.ts").text();
    const result = analyzer.analyze(content, "clean.ts", "typescript");
    expect(result.score).toBeLessThan(0.15);
  });
});
