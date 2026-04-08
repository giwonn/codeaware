import { describe, test, expect } from "bun:test";
import { HiddenContextAnalyzer } from "../../src/analyzers/hidden-context";

const analyzer = new HiddenContextAnalyzer();

describe("HiddenContextAnalyzer", () => {
  test("detects magic numbers", async () => {
    const content = await Bun.file("tests/fixtures/level-5/magic-numbers.ts").text();
    const result = analyzer.analyze(content, "magic-numbers.ts", "typescript");
    const magicSignals = result.evidence.filter(e => e.signal === "magic_number");
    expect(magicSignals.length).toBeGreaterThanOrEqual(3);
    expect(result.score).toBeGreaterThan(0.3);
  });

  test("detects unexplained catch blocks", async () => {
    const content = await Bun.file("tests/fixtures/level-5/unexplained-catch.py").text();
    const result = analyzer.analyze(content, "unexplained-catch.py", "python");
    const catchSignals = result.evidence.filter(e => e.signal === "unexplained_catch");
    expect(catchSignals.length).toBeGreaterThanOrEqual(1);
  });

  test("detects order-dependent initialization", async () => {
    const content = await Bun.file("tests/fixtures/level-5/order-dependent.java").text();
    const result = analyzer.analyze(content, "order-dependent.java", "java");
    const orderSignals = result.evidence.filter(e => e.signal === "order_dependent_init");
    expect(orderSignals.length).toBeGreaterThanOrEqual(1);
  });

  test("clean code scores low", async () => {
    const content = await Bun.file("tests/fixtures/level-1/clean.ts").text();
    const result = analyzer.analyze(content, "clean.ts", "typescript");
    expect(result.score).toBeLessThan(0.1);
  });
});
