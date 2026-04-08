import { describe, test, expect } from "bun:test";
import { NamingAnalyzer } from "../../src/analyzers/naming";

const analyzer = new NamingAnalyzer();

describe("NamingAnalyzer", () => {
  test("detects single-letter variable names", async () => {
    const content = await Bun.file("tests/fixtures/level-4/bad-naming.ts").text();
    const result = analyzer.analyze(content, "bad-naming.ts", "typescript");
    const singleLetterSignals = result.evidence.filter(e => e.signal === "single_letter_name");
    expect(singleLetterSignals.length).toBeGreaterThanOrEqual(3);
  });

  test("detects generic names", async () => {
    const content = await Bun.file("tests/fixtures/level-4/bad-naming.ts").text();
    const result = analyzer.analyze(content, "bad-naming.ts", "typescript");
    const genericSignals = result.evidence.filter(e => e.signal === "generic_name");
    expect(genericSignals.length).toBeGreaterThanOrEqual(2);
  });

  test("detects abbreviated names", async () => {
    const content = await Bun.file("tests/fixtures/level-4/bad-naming.ts").text();
    const result = analyzer.analyze(content, "bad-naming.ts", "typescript");
    const abbrSignals = result.evidence.filter(e => e.signal === "abbreviated_name");
    expect(abbrSignals.length).toBeGreaterThanOrEqual(1);
  });

  test("clean code scores low", async () => {
    const content = await Bun.file("tests/fixtures/level-1/clean.ts").text();
    const result = analyzer.analyze(content, "clean.ts", "typescript");
    expect(result.score).toBeLessThan(0.1);
  });
});
