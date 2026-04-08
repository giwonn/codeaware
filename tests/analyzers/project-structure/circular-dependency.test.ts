import { describe, test, expect } from "bun:test";
import { detectCircularDependency } from "../../../src/analyzers/project-structure/circular-dependency";
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

const ROOT = "tests/fixtures/project-structure/circular-dependency";

describe("detectCircularDependency", () => {
  test("detects A↔B circular dependency", async () => {
    const filePaths = await getFilePaths(ROOT);
    const modules = resolveModules(ROOT);
    const signals = await detectCircularDependency(filePaths, modules);
    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe("circular_dependency");
    expect(signals[0].modules.sort()).toEqual(["module-a", "module-b"]);
  });

  test("module-c has no circular dependency", async () => {
    const filePaths = await getFilePaths(ROOT);
    const modules = resolveModules(ROOT);
    const signals = await detectCircularDependency(filePaths, modules);
    const cSignal = signals.find(s => s.modules.includes("module-c"));
    expect(cSignal).toBeUndefined();
  });
});
