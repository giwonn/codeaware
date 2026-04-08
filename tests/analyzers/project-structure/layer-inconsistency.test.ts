import { describe, test, expect } from "bun:test";
import { detectLayerInconsistency } from "../../../src/analyzers/project-structure/layer-inconsistency";
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

const ROOT = "tests/fixtures/project-structure/layer-inconsistency";

describe("detectLayerInconsistency", () => {
  test("detects DDD vs flat pattern mismatch", async () => {
    const filePaths = await getFilePaths(ROOT);
    const modules = resolveModules(ROOT);
    const signals = detectLayerInconsistency(filePaths, modules);
    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe("layer_inconsistency");
    expect(signals[0].description).toContain("DDD");
  });
});
