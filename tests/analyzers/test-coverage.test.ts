import { describe, test, expect } from "bun:test";
import { TestCoverageAnalyzer } from "../../src/analyzers/test-coverage";

const analyzer = new TestCoverageAnalyzer();

describe("TestCoverageAnalyzer", () => {
  test("detects opaque test names", async () => {
    const content = await Bun.file("tests/fixtures/level-5/opaque-tests.fixture.ts").text();
    const result = analyzer.analyze(content, "opaque-tests.test.ts", "typescript");
    const opaqueSignals = result.evidence.filter(e => e.signal === "opaque_test_name");
    expect(opaqueSignals.length).toBeGreaterThanOrEqual(2);
  });

  test("detects magic values in assertions", async () => {
    const content = await Bun.file("tests/fixtures/level-5/opaque-tests.fixture.ts").text();
    const result = analyzer.analyze(content, "opaque-tests.test.ts", "typescript");
    const magicSignals = result.evidence.filter(e => e.signal === "magic_test_value");
    expect(magicSignals.length).toBeGreaterThanOrEqual(1);
  });

  test("non-test file scores zero", async () => {
    const content = await Bun.file("tests/fixtures/level-1/clean.ts").text();
    const result = analyzer.analyze(content, "clean.ts", "typescript");
    expect(result.score).toBe(0);
  });
});
