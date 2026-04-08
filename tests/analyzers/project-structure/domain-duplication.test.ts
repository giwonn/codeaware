import { describe, test, expect } from "bun:test";
import { detectDomainDuplication } from "../../../src/analyzers/project-structure/domain-duplication";
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

const ROOT = "tests/fixtures/project-structure/domain-duplication";

describe("detectDomainDuplication", () => {
  test("detects calllog duplicated across 3 modules", async () => {
    const filePaths = await getFilePaths(ROOT);
    const modules = resolveModules(ROOT);
    const signals = detectDomainDuplication(filePaths, modules);
    const calllogSignal = signals.find(s => s.description.includes("calllog"));
    expect(calllogSignal).toBeDefined();
    expect(calllogSignal!.modules.sort()).toEqual(["module-admin", "module-domain", "module-svc"]);
  });

  test("does not flag billing (only in one module)", async () => {
    const filePaths = await getFilePaths(ROOT);
    const modules = resolveModules(ROOT);
    const signals = detectDomainDuplication(filePaths, modules);
    const billingSignal = signals.find(s => s.description.includes("billing"));
    expect(billingSignal).toBeUndefined();
  });

  test("does not flag common directories", async () => {
    const filePaths = await getFilePaths(ROOT);
    const modules = resolveModules(ROOT);
    const signals = detectDomainDuplication(filePaths, modules);
    const commonSignal = signals.find(s => s.description.includes("config") || s.description.includes("common"));
    expect(commonSignal).toBeUndefined();
  });
});
