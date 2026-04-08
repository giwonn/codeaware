import { describe, test, expect } from "bun:test";
import { CouplingAnalyzer } from "../../src/analyzers/coupling";

const analyzer = new CouplingAnalyzer();

describe("CouplingAnalyzer", () => {
  test("detects high import fan-in", async () => {
    const content = await Bun.file("tests/fixtures/level-4/high-coupling.ts").text();
    const result = analyzer.analyze(content, "high-coupling.ts", "typescript");
    const fanInSignals = result.evidence.filter(e => e.signal === "high_import_count");
    expect(fanInSignals.length).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeGreaterThan(0.3);
  });

  test("detects global state access", async () => {
    const content = await Bun.file("tests/fixtures/level-4/high-coupling.ts").text();
    const result = analyzer.analyze(content, "high-coupling.ts", "typescript");
    const globalSignals = result.evidence.filter(e => e.signal === "global_state_access");
    expect(globalSignals.length).toBeGreaterThanOrEqual(2);
  });

  test("detects cross-directory imports", async () => {
    const content = await Bun.file("tests/fixtures/level-4/high-coupling.ts").text();
    const result = analyzer.analyze(content, "high-coupling.ts", "typescript");
    const crossDirSignals = result.evidence.filter(e => e.signal === "cross_directory_import");
    expect(crossDirSignals.length).toBeGreaterThanOrEqual(3);
  });

  test("clean code scores low", async () => {
    const content = await Bun.file("tests/fixtures/level-1/clean.ts").text();
    const result = analyzer.analyze(content, "clean.ts", "typescript");
    expect(result.score).toBeLessThan(0.1);
  });
});
