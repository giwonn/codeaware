import { describe, test, expect } from "bun:test";
import { resolveModules } from "../../../src/analyzers/project-structure/module-resolver";

describe("resolveModules", () => {
  test("multi-module project: detects modules by build file", () => {
    const modules = resolveModules("tests/fixtures/project-structure/multi-module");
    expect(modules.map(m => m.name).sort()).toEqual(["module-a", "module-b"]);
  });

  test("single project: uses src subdirectories as modules", () => {
    const modules = resolveModules("tests/fixtures/project-structure/single-project");
    expect(modules.map(m => m.name).sort()).toEqual(["controllers", "services"]);
  });

  test("monorepo: detects packages subdirectories", () => {
    const modules = resolveModules("tests/fixtures/project-structure/monorepo");
    expect(modules.map(m => m.name).sort()).toEqual(["core", "web"]);
  });

  test("module has correct path", () => {
    const modules = resolveModules("tests/fixtures/project-structure/multi-module");
    const moduleA = modules.find(m => m.name === "module-a");
    expect(moduleA?.path).toContain("multi-module/module-a");
  });
});
