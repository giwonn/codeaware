import { describe, test, expect } from "bun:test";
import { parseImports } from "../../../src/analyzers/project-structure/import-parser";

describe("parseImports", () => {
  test("Java: parses package imports", () => {
    const content = `package com.example.admin;\nimport com.example.domain.UserService;\nimport com.example.common.Utils;`;
    const imports = parseImports(content, "java");
    expect(imports).toEqual(["com.example.domain.UserService", "com.example.common.Utils"]);
  });

  test("TypeScript: parses ES imports", () => {
    const content = `import { foo } from "../domain/user";\nimport bar from "@/services/bar";`;
    const imports = parseImports(content, "typescript");
    expect(imports).toEqual(["../domain/user", "@/services/bar"]);
  });

  test("Python: parses from/import", () => {
    const content = `from domain.user import UserService\nimport os`;
    const imports = parseImports(content, "python");
    expect(imports).toEqual(["domain.user", "os"]);
  });

  test("Go: parses import block", () => {
    const content = `import (\n\t"fmt"\n\t"github.com/example/domain"\n)`;
    const imports = parseImports(content, "go");
    expect(imports).toEqual(["fmt", "github.com/example/domain"]);
  });

  test("unknown language returns empty", () => {
    const imports = parseImports("some content", "unknown");
    expect(imports).toEqual([]);
  });
});
