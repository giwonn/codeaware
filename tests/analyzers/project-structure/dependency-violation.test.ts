import { describe, test, expect } from "bun:test";
import { detectDependencyViolation } from "../../../src/analyzers/project-structure/dependency-violation";
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

const ROOT = "tests/fixtures/project-structure/dependency-violation";

describe("detectDependencyViolation", () => {
  test("detects domain importing admin (lower→upper violation)", async () => {
    const filePaths = await getFilePaths(ROOT);
    const modules = resolveModules(ROOT);
    const signals = await detectDependencyViolation(filePaths, modules);
    expect(signals.length).toBeGreaterThanOrEqual(1);
    expect(signals[0].type).toBe("dependency_violation");
    expect(signals[0].description).toContain("module-domain");
    expect(signals[0].description).toContain("module-admin");
  });

  test("admin importing domain is NOT a violation", async () => {
    const filePaths = await getFilePaths(ROOT);
    const modules = resolveModules(ROOT);
    const signals = await detectDependencyViolation(filePaths, modules);
    const adminViolation = signals.filter(s =>
      s.description.includes("module-admin") && s.description.includes("module-domain") &&
      s.description.indexOf("module-admin") < s.description.indexOf("module-domain")
    );
    expect(adminViolation.length).toBe(0);
  });
});
