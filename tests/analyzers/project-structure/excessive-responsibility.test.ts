import { describe, test, expect } from "bun:test";
import { detectExcessiveResponsibility } from "../../../src/analyzers/project-structure/excessive-responsibility";
import { resolveModules } from "../../../src/analyzers/project-structure/module-resolver";
import { Glob } from "bun";

async function getFilePaths(rootDir: string): Promise<string[]> {
  const glob = new Glob("**/*.java");
  const files: string[] = [];
  for await (const file of glob.scan({ cwd: rootDir })) {
    files.push(`${rootDir}/${file}`);
  }
  return files;
}

const ROOT = "tests/fixtures/project-structure/excessive-responsibility";

describe("detectExcessiveResponsibility", () => {
  test("detects bloated module with 55 services", async () => {
    const filePaths = await getFilePaths(ROOT);
    const modules = resolveModules(ROOT);
    const signals = detectExcessiveResponsibility(filePaths, modules);
    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe("excessive_responsibility");
    expect(signals[0].modules).toContain("bloated-module");
  });

  test("does not flag lean module", async () => {
    const filePaths = await getFilePaths(ROOT);
    const modules = resolveModules(ROOT);
    const signals = detectExcessiveResponsibility(filePaths, modules);
    const leanSignals = signals.filter(s => s.modules.includes("lean-module"));
    expect(leanSignals.length).toBe(0);
  });
});
