# Project Structural Signals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** scan_project 응답에 structuralSignals 필드를 추가하여 프로젝트 구조적 이상 신호 + 리팩토링 방향을 반환한다.

**Architecture:** 새로운 `ProjectStructureAnalyzer`가 filePaths와 fileResults를 받아 6종 구조적 신호를 감지한다. 각 신호 감지기는 독립 모듈로 `src/analyzers/project-structure/` 아래에 위치하며, `scan-project.ts`에서 기존 파일 분석 이후 호출된다.

**Tech Stack:** TypeScript, Bun, regex 기반 분석 (AST 없음)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/analyzers/types.ts` | StructuralSignal 타입 추가 |
| Create | `src/analyzers/project-structure/module-resolver.ts` | 프로젝트 루트에서 모듈 식별 |
| Create | `src/analyzers/project-structure/import-parser.ts` | 다언어 import 구문 regex 파싱 |
| Create | `src/analyzers/project-structure/excessive-responsibility.ts` | 모듈 내 과다 책임 감지 |
| Create | `src/analyzers/project-structure/domain-duplication.ts` | 모듈 간 도메인 중복 감지 |
| Create | `src/analyzers/project-structure/layer-inconsistency.ts` | 계층 구조 불일치 감지 |
| Create | `src/analyzers/project-structure/dependency-violation.ts` | 의존성 방향 위반 감지 |
| Create | `src/analyzers/project-structure/circular-dependency.ts` | 순환 참조 감지 |
| Create | `src/analyzers/project-structure/god-class.ts` | God class 감지 |
| Create | `src/analyzers/project-structure/index.ts` | 6개 감지기 오케스트레이션 |
| Modify | `src/tools/scan-project.ts` | ProjectStructureAnalyzer 호출 통합 |
| Create | `tests/analyzers/project-structure/module-resolver.test.ts` | module-resolver 테스트 |
| Create | `tests/analyzers/project-structure/import-parser.test.ts` | import-parser 테스트 |
| Create | `tests/analyzers/project-structure/excessive-responsibility.test.ts` | excessive-responsibility 테스트 |
| Create | `tests/analyzers/project-structure/domain-duplication.test.ts` | domain-duplication 테스트 |
| Create | `tests/analyzers/project-structure/layer-inconsistency.test.ts` | layer-inconsistency 테스트 |
| Create | `tests/analyzers/project-structure/dependency-violation.test.ts` | dependency-violation 테스트 |
| Create | `tests/analyzers/project-structure/circular-dependency.test.ts` | circular-dependency 테스트 |
| Create | `tests/analyzers/project-structure/god-class.test.ts` | god-class 테스트 |
| Create | `tests/fixtures/project-structure/` | 테스트용 프로젝트 fixture 디렉토리들 |
| Modify | `tests/tools/scan-project.test.ts` | structuralSignals 필드 테스트 추가 |

---

### Task 1: 타입 정의

**Files:**
- Modify: `src/analyzers/types.ts`

- [ ] **Step 1: types.ts에 StructuralSignal 관련 타입 추가**

`src/analyzers/types.ts` 파일 끝에 추가:

```typescript
export type StructuralSignalType =
  | "excessive_responsibility"
  | "domain_duplication"
  | "layer_inconsistency"
  | "dependency_violation"
  | "circular_dependency"
  | "god_class";

export interface StructuralSignal {
  type: StructuralSignalType;
  severity: Severity;
  description: string;
  suggestion: string;
  modules: string[];
}
```

- [ ] **Step 2: 기존 테스트가 깨지지 않는지 확인**

Run: `bun test`
Expected: 모든 기존 테스트 PASS

- [ ] **Step 3: Commit**

```bash
git add src/analyzers/types.ts
git commit -m "feat: add StructuralSignal types for project-level analysis"
```

---

### Task 2: module-resolver — 모듈 식별

**Files:**
- Create: `src/analyzers/project-structure/module-resolver.ts`
- Create: `tests/analyzers/project-structure/module-resolver.test.ts`
- Create: `tests/fixtures/project-structure/multi-module/` (fixture)
- Create: `tests/fixtures/project-structure/single-project/` (fixture)
- Create: `tests/fixtures/project-structure/monorepo/` (fixture)

- [ ] **Step 1: 테스트 fixture 디렉토리 생성**

멀티모듈 프로젝트 fixture:
```
tests/fixtures/project-structure/multi-module/
  settings.gradle     (내용: "include 'module-a', 'module-b'")
  module-a/
    src/main/java/com/example/a/AService.java  (빈 Java 파일: "package com.example.a;")
  module-b/
    src/main/java/com/example/b/BService.java  (빈 Java 파일: "package com.example.b;")
```

단일 프로젝트 fixture:
```
tests/fixtures/project-structure/single-project/
  src/
    controllers/
      user.ts           (내용: "export class UserController {}")
    services/
      user.ts           (내용: "export class UserService {}")
```

모노레포 fixture:
```
tests/fixtures/project-structure/monorepo/
  packages/
    core/
      src/index.ts      (내용: "export const core = true;")
    web/
      src/index.ts      (내용: "export const web = true;")
```

- [ ] **Step 2: failing test 작성**

`tests/analyzers/project-structure/module-resolver.test.ts`:

```typescript
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
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `bun test tests/analyzers/project-structure/module-resolver.test.ts`
Expected: FAIL — module-resolver 파일 없음

- [ ] **Step 4: module-resolver 구현**

`src/analyzers/project-structure/module-resolver.ts`:

```typescript
import { existsSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

export interface ModuleInfo {
  name: string;
  path: string;
}

const BUILD_FILES = [
  "build.gradle", "build.gradle.kts", "pom.xml",
  "settings.gradle", "settings.gradle.kts",
];

const MONOREPO_DIRS = ["packages", "apps", "modules"];

export function resolveModules(rootDir: string): ModuleInfo[] {
  const resolved = resolve(rootDir);

  // 1. Multi-module: build file at root → subdirs with src/ or build files
  if (BUILD_FILES.some(f => existsSync(join(resolved, f)))) {
    return getSubdirsWithSource(resolved);
  }

  // 2. Monorepo: packages/ or apps/ directory
  for (const dir of MONOREPO_DIRS) {
    const monoDir = join(resolved, dir);
    if (existsSync(monoDir) && statSync(monoDir).isDirectory()) {
      return getSubdirs(monoDir);
    }
  }

  // 3. Single project: src/ subdirectories
  const srcDir = join(resolved, "src");
  if (existsSync(srcDir) && statSync(srcDir).isDirectory()) {
    return getSubdirs(srcDir);
  }

  // 4. Fallback: root subdirectories
  return getSubdirs(resolved);
}

function getSubdirsWithSource(dir: string): ModuleInfo[] {
  return readdirSync(dir)
    .filter(name => {
      const full = join(dir, name);
      if (!statSync(full).isDirectory()) return false;
      if (name.startsWith(".")) return false;
      // Has src/ or a build file inside
      return existsSync(join(full, "src")) ||
        BUILD_FILES.some(f => existsSync(join(full, f)));
    })
    .map(name => ({ name, path: join(dir, name) }));
}

function getSubdirs(dir: string): ModuleInfo[] {
  return readdirSync(dir)
    .filter(name => {
      const full = join(dir, name);
      return statSync(full).isDirectory() && !name.startsWith(".");
    })
    .map(name => ({ name, path: join(dir, name) }));
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `bun test tests/analyzers/project-structure/module-resolver.test.ts`
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/analyzers/project-structure/module-resolver.ts tests/analyzers/project-structure/module-resolver.test.ts tests/fixtures/project-structure/
git commit -m "feat: add module-resolver for project structure analysis"
```

---

### Task 3: import-parser — 다언어 import 파싱

**Files:**
- Create: `src/analyzers/project-structure/import-parser.ts`
- Create: `tests/analyzers/project-structure/import-parser.test.ts`

- [ ] **Step 1: failing test 작성**

`tests/analyzers/project-structure/import-parser.test.ts`:

```typescript
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `bun test tests/analyzers/project-structure/import-parser.test.ts`
Expected: FAIL

- [ ] **Step 3: import-parser 구현**

`src/analyzers/project-structure/import-parser.ts`:

```typescript
type Parser = (content: string) => string[];

const PARSERS: Record<string, Parser> = {
  java: (content) => {
    const matches: string[] = [];
    for (const m of content.matchAll(/^import\s+(?:static\s+)?([a-zA-Z0-9_.]+);/gm)) {
      matches.push(m[1]);
    }
    return matches;
  },

  kotlin: (content) => {
    const matches: string[] = [];
    for (const m of content.matchAll(/^import\s+([a-zA-Z0-9_.]+)/gm)) {
      matches.push(m[1]);
    }
    return matches;
  },

  typescript: (content) => {
    const matches: string[] = [];
    for (const m of content.matchAll(/(?:import\s+.*?\s+from\s+|import\s+)["']([^"']+)["']/gm)) {
      matches.push(m[1]);
    }
    for (const m of content.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/gm)) {
      matches.push(m[1]);
    }
    return matches;
  },

  python: (content) => {
    const matches: string[] = [];
    for (const m of content.matchAll(/^from\s+(\S+)\s+import/gm)) {
      matches.push(m[1]);
    }
    for (const m of content.matchAll(/^import\s+(\S+)/gm)) {
      if (!m[1].startsWith("(")) matches.push(m[1]);
    }
    return matches;
  },

  go: (content) => {
    const matches: string[] = [];
    // Single import
    for (const m of content.matchAll(/^import\s+"([^"]+)"/gm)) {
      matches.push(m[1]);
    }
    // Block import
    for (const m of content.matchAll(/^import\s*\(([\s\S]*?)\)/gm)) {
      for (const line of m[1].matchAll(/"([^"]+)"/g)) {
        matches.push(line[1]);
      }
    }
    return matches;
  },
};

// Alias javascript → typescript parser
PARSERS.javascript = PARSERS.typescript;

export function parseImports(content: string, language: string): string[] {
  const parser = PARSERS[language];
  if (!parser) return [];
  return parser(content);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun test tests/analyzers/project-structure/import-parser.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/analyzers/project-structure/import-parser.ts tests/analyzers/project-structure/import-parser.test.ts
git commit -m "feat: add multi-language import parser for structural analysis"
```

---

### Task 4: excessive-responsibility 감지기

**Files:**
- Create: `src/analyzers/project-structure/excessive-responsibility.ts`
- Create: `tests/analyzers/project-structure/excessive-responsibility.test.ts`
- Create: `tests/fixtures/project-structure/excessive-responsibility/` (fixture)

- [ ] **Step 1: fixture 생성**

```
tests/fixtures/project-structure/excessive-responsibility/
  settings.gradle                (내용: "")
  bloated-module/
    src/main/java/svc/
      (Service1.java ~ Service55.java 생성: 각 파일은 "package svc;" 한 줄)
  lean-module/
    src/main/java/svc/
      (Service1.java ~ Service3.java 생성: 각 파일은 "package svc;" 한 줄)
```

55개 파일을 직접 만드는 스크립트:
```bash
mkdir -p tests/fixtures/project-structure/excessive-responsibility/bloated-module/src/main/java/svc
mkdir -p tests/fixtures/project-structure/excessive-responsibility/lean-module/src/main/java/svc
echo "" > tests/fixtures/project-structure/excessive-responsibility/settings.gradle
for i in $(seq 1 55); do echo "package svc;" > "tests/fixtures/project-structure/excessive-responsibility/bloated-module/src/main/java/svc/Service${i}.java"; done
for i in $(seq 1 3); do echo "package svc;" > "tests/fixtures/project-structure/excessive-responsibility/lean-module/src/main/java/svc/Service${i}.java"; done
```

- [ ] **Step 2: failing test 작성**

`tests/analyzers/project-structure/excessive-responsibility.test.ts`:

```typescript
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
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `bun test tests/analyzers/project-structure/excessive-responsibility.test.ts`
Expected: FAIL

- [ ] **Step 4: 구현**

`src/analyzers/project-structure/excessive-responsibility.ts`:

```typescript
import type { StructuralSignal } from "../types";
import type { ModuleInfo } from "./module-resolver";

const SERVICE_PATTERN = /Service\.\w+$/i;
const REPO_PATTERN = /Repository\.\w+$/i;
const CONTROLLER_PATTERN = /Controller\.\w+$/i;

const THRESHOLD = 50;

export function detectExcessiveResponsibility(
  filePaths: string[],
  modules: ModuleInfo[],
): StructuralSignal[] {
  const signals: StructuralSignal[] = [];

  for (const mod of modules) {
    const moduleFiles = filePaths.filter(fp => fp.startsWith(mod.path));
    const serviceCount = moduleFiles.filter(fp => SERVICE_PATTERN.test(fp)).length;
    const repoCount = moduleFiles.filter(fp => REPO_PATTERN.test(fp)).length;
    const controllerCount = moduleFiles.filter(fp => CONTROLLER_PATTERN.test(fp)).length;

    if (serviceCount >= THRESHOLD) {
      signals.push({
        type: "excessive_responsibility",
        severity: serviceCount >= 100 ? "critical" : "high",
        description: `${mod.name}에 Service ${serviceCount}개, Repository ${repoCount}개, Controller ${controllerCount}개 존재`,
        suggestion: "이 모듈의 책임이 과다합니다. 도메인별로 분리하거나 비즈니스 로직을 도메인 계층으로 이관을 권장합니다",
        modules: [mod.name],
      });
    }
  }

  return signals;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `bun test tests/analyzers/project-structure/excessive-responsibility.test.ts`
Expected: 2 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/analyzers/project-structure/excessive-responsibility.ts tests/analyzers/project-structure/excessive-responsibility.test.ts tests/fixtures/project-structure/excessive-responsibility/
git commit -m "feat: add excessive-responsibility structural signal detector"
```

---

### Task 5: domain-duplication 감지기

**Files:**
- Create: `src/analyzers/project-structure/domain-duplication.ts`
- Create: `tests/analyzers/project-structure/domain-duplication.test.ts`
- Create: `tests/fixtures/project-structure/domain-duplication/` (fixture)

- [ ] **Step 1: fixture 생성**

```
tests/fixtures/project-structure/domain-duplication/
  settings.gradle                (내용: "")
  module-admin/
    src/main/java/calllog/
      CallLogService.java       (내용: "package calllog;")
    src/main/java/counsel/
      CounselService.java       (내용: "package counsel;")
  module-svc/
    src/main/java/calllog/
      CallLogController.java    (내용: "package calllog;")
  module-domain/
    src/main/java/calllog/
      CallLogEntity.java        (내용: "package calllog;")
    src/main/java/billing/
      BillingService.java       (내용: "package billing;")
```

- [ ] **Step 2: failing test 작성**

`tests/analyzers/project-structure/domain-duplication.test.ts`:

```typescript
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
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `bun test tests/analyzers/project-structure/domain-duplication.test.ts`
Expected: FAIL

- [ ] **Step 4: 구현**

`src/analyzers/project-structure/domain-duplication.ts`:

```typescript
import type { StructuralSignal } from "../types";
import type { ModuleInfo } from "./module-resolver";
import { relative } from "path";

const GENERIC_DIRS = new Set([
  "config", "common", "utils", "util", "shared", "lib", "helpers",
  "constants", "enums", "types", "dto", "model", "models",
  "converter", "converters", "mapper", "mappers",
  "exception", "exceptions", "error", "errors",
  "auth", "security", "filter", "interceptor",
  "src", "main", "java", "kotlin", "scala",
  "test", "tests", "resources",
]);

export function detectDomainDuplication(
  filePaths: string[],
  modules: ModuleInfo[],
): StructuralSignal[] {
  // domain name → set of module names
  const domainToModules = new Map<string, Set<string>>();

  for (const mod of modules) {
    const moduleFiles = filePaths.filter(fp => fp.startsWith(mod.path));
    const domains = new Set<string>();

    for (const fp of moduleFiles) {
      const rel = relative(mod.path, fp);
      const parts = rel.split("/");
      // Find the first meaningful domain directory (skip src/main/java/com/example etc.)
      for (const part of parts) {
        if (!GENERIC_DIRS.has(part.toLowerCase()) && !part.includes(".") && part.length > 1) {
          domains.add(part);
          break;
        }
      }
    }

    for (const domain of domains) {
      if (!domainToModules.has(domain)) {
        domainToModules.set(domain, new Set());
      }
      domainToModules.get(domain)!.add(mod.name);
    }
  }

  const signals: StructuralSignal[] = [];

  for (const [domain, moduleSet] of domainToModules) {
    if (moduleSet.size >= 2) {
      const moduleNames = [...moduleSet].sort();
      signals.push({
        type: "domain_duplication",
        severity: moduleSet.size >= 3 ? "high" : "medium",
        description: `${domain} 도메인이 ${moduleNames.join(", ")}에 중복 존재`,
        suggestion: `하나의 모듈로 응집하고 나머지는 호출 구조로 전환 권장`,
        modules: moduleNames,
      });
    }
  }

  return signals;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `bun test tests/analyzers/project-structure/domain-duplication.test.ts`
Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/analyzers/project-structure/domain-duplication.ts tests/analyzers/project-structure/domain-duplication.test.ts tests/fixtures/project-structure/domain-duplication/
git commit -m "feat: add domain-duplication structural signal detector"
```

---

### Task 6: layer-inconsistency 감지기

**Files:**
- Create: `src/analyzers/project-structure/layer-inconsistency.ts`
- Create: `tests/analyzers/project-structure/layer-inconsistency.test.ts`
- Create: `tests/fixtures/project-structure/layer-inconsistency/` (fixture)

- [ ] **Step 1: fixture 생성**

```
tests/fixtures/project-structure/layer-inconsistency/
  settings.gradle                          (내용: "")
  ddd-module/
    src/main/java/domain/entity/
      User.java                            (내용: "package domain.entity;")
    src/main/java/application/usecase/
      CreateUser.java                      (내용: "package application.usecase;")
    src/main/java/infrastructure/
      UserRepo.java                        (내용: "package infrastructure;")
  flat-module/
    src/main/java/controller/
      UserController.java                  (내용: "package controller;")
    src/main/java/service/
      UserService.java                     (내용: "package service;")
    src/main/java/repository/
      UserRepository.java                  (내용: "package repository;")
  consistent-flat-module/
    src/main/java/controller/
      OrderController.java                 (내용: "package controller;")
    src/main/java/service/
      OrderService.java                    (내용: "package service;")
```

- [ ] **Step 2: failing test 작성**

`tests/analyzers/project-structure/layer-inconsistency.test.ts`:

```typescript
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
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `bun test tests/analyzers/project-structure/layer-inconsistency.test.ts`
Expected: FAIL

- [ ] **Step 4: 구현**

`src/analyzers/project-structure/layer-inconsistency.ts`:

```typescript
import type { StructuralSignal } from "../types";
import type { ModuleInfo } from "./module-resolver";
import { relative } from "path";

const DDD_MARKERS = new Set(["domain", "application", "usecase", "infrastructure", "port", "adapter"]);
const TRADITIONAL_MARKERS = new Set(["controller", "controllers", "service", "services", "repository", "repositories", "dao"]);

type LayerPattern = "ddd" | "traditional" | "unknown";

function detectPattern(filePaths: string[], mod: ModuleInfo): LayerPattern {
  let dddScore = 0;
  let traditionalScore = 0;

  for (const fp of filePaths) {
    const rel = relative(mod.path, fp);
    const parts = rel.split("/").map(p => p.toLowerCase());
    for (const part of parts) {
      if (DDD_MARKERS.has(part)) dddScore++;
      if (TRADITIONAL_MARKERS.has(part)) traditionalScore++;
    }
  }

  if (dddScore === 0 && traditionalScore === 0) return "unknown";
  if (dddScore > traditionalScore) return "ddd";
  if (traditionalScore > dddScore) return "traditional";
  return "unknown";
}

export function detectLayerInconsistency(
  filePaths: string[],
  modules: ModuleInfo[],
): StructuralSignal[] {
  const modulePatterns = new Map<string, LayerPattern>();

  for (const mod of modules) {
    const moduleFiles = filePaths.filter(fp => fp.startsWith(mod.path));
    if (moduleFiles.length === 0) continue;
    modulePatterns.set(mod.name, detectPattern(moduleFiles, mod));
  }

  const dddModules = [...modulePatterns.entries()].filter(([, p]) => p === "ddd").map(([n]) => n);
  const tradModules = [...modulePatterns.entries()].filter(([, p]) => p === "traditional").map(([n]) => n);

  if (dddModules.length > 0 && tradModules.length > 0) {
    return [{
      type: "layer_inconsistency",
      severity: "medium",
      description: `계층 구조 불일치: DDD 패턴(${dddModules.join(", ")}) vs 전통 패턴(${tradModules.join(", ")})`,
      suggestion: "모듈 간 계층 구조가 불일치합니다. 통일된 아키텍처 패턴 적용을 권장합니다",
      modules: [...dddModules, ...tradModules].sort(),
    }];
  }

  return [];
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `bun test tests/analyzers/project-structure/layer-inconsistency.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/analyzers/project-structure/layer-inconsistency.ts tests/analyzers/project-structure/layer-inconsistency.test.ts tests/fixtures/project-structure/layer-inconsistency/
git commit -m "feat: add layer-inconsistency structural signal detector"
```

---

### Task 7: dependency-violation 감지기

**Files:**
- Create: `src/analyzers/project-structure/dependency-violation.ts`
- Create: `tests/analyzers/project-structure/dependency-violation.test.ts`
- Create: `tests/fixtures/project-structure/dependency-violation/` (fixture)

- [ ] **Step 1: fixture 생성**

```
tests/fixtures/project-structure/dependency-violation/
  settings.gradle                                        (내용: "")
  module-domain/
    src/main/java/com/example/domain/UserEntity.java
      (내용: "package com.example.domain;\nimport com.example.admin.AdminService;")
  module-admin/
    src/main/java/com/example/admin/AdminService.java
      (내용: "package com.example.admin;\nimport com.example.domain.UserEntity;")
```

domain이 admin을 import하는 것이 위반 (하위→상위).

- [ ] **Step 2: failing test 작성**

`tests/analyzers/project-structure/dependency-violation.test.ts`:

```typescript
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
    // Only domain→admin should be flagged, not admin→domain
    const adminViolation = signals.filter(s =>
      s.description.includes("module-admin") && s.description.includes("module-domain") &&
      s.description.indexOf("module-admin") < s.description.indexOf("module-domain")
    );
    expect(adminViolation.length).toBe(0);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `bun test tests/analyzers/project-structure/dependency-violation.test.ts`
Expected: FAIL

- [ ] **Step 4: 구현**

`src/analyzers/project-structure/dependency-violation.ts`:

```typescript
import type { StructuralSignal } from "../types";
import type { ModuleInfo } from "./module-resolver";
import { parseImports } from "./import-parser";
import { detectLanguage } from "../../parsers/language-detector";

// Lower index = lower layer (should not depend on higher)
const LAYER_KEYWORDS: string[][] = [
  ["domain", "entity", "model", "core"],           // 0: domain
  ["application", "usecase", "service", "services"],// 1: application
  ["infrastructure", "infra", "repository", "persistence"], // 2: infrastructure
  ["presentation", "controller", "api", "admin", "svc", "web", "gateway"], // 3: presentation
];

function inferLayerRank(moduleName: string): number {
  const lower = moduleName.toLowerCase();
  for (let rank = 0; rank < LAYER_KEYWORDS.length; rank++) {
    if (LAYER_KEYWORDS[rank].some(kw => lower.includes(kw))) {
      return rank;
    }
  }
  return -1; // unknown
}

function findModuleForImport(importPath: string, modules: ModuleInfo[]): string | null {
  const lower = importPath.toLowerCase();
  for (const mod of modules) {
    if (lower.includes(mod.name.toLowerCase())) {
      return mod.name;
    }
  }
  return null;
}

export async function detectDependencyViolation(
  filePaths: string[],
  modules: ModuleInfo[],
): Promise<StructuralSignal[]> {
  const violations = new Map<string, { from: string; to: string; count: number }>();

  for (const mod of modules) {
    const sourceRank = inferLayerRank(mod.name);
    if (sourceRank < 0) continue;

    const moduleFiles = filePaths.filter(fp => fp.startsWith(mod.path));

    for (const fp of moduleFiles) {
      const language = detectLanguage(fp);
      if (language === "unknown") continue;

      let content: string;
      try {
        content = await Bun.file(fp).text();
      } catch {
        continue;
      }

      const imports = parseImports(content, language);

      for (const imp of imports) {
        const targetModule = findModuleForImport(imp, modules);
        if (!targetModule || targetModule === mod.name) continue;

        const targetRank = inferLayerRank(targetModule);
        if (targetRank < 0) continue;

        // Violation: lower layer depends on higher layer
        if (sourceRank < targetRank) {
          const key = `${mod.name}->${targetModule}`;
          const existing = violations.get(key);
          if (existing) {
            existing.count++;
          } else {
            violations.set(key, { from: mod.name, to: targetModule, count: 1 });
          }
        }
      }
    }
  }

  return [...violations.values()].map(v => ({
    type: "dependency_violation" as const,
    severity: v.count >= 10 ? "critical" : v.count >= 3 ? "high" : "medium",
    description: `${v.from}이 상위 계층 ${v.to}을 참조 (${v.count}건)`,
    suggestion: "의존성 방향을 역전하거나 인터페이스를 통한 간접 참조를 권장합니다",
    modules: [v.from, v.to],
  }));
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `bun test tests/analyzers/project-structure/dependency-violation.test.ts`
Expected: 2 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/analyzers/project-structure/dependency-violation.ts tests/analyzers/project-structure/dependency-violation.test.ts tests/fixtures/project-structure/dependency-violation/
git commit -m "feat: add dependency-violation structural signal detector"
```

---

### Task 8: circular-dependency 감지기

**Files:**
- Create: `src/analyzers/project-structure/circular-dependency.ts`
- Create: `tests/analyzers/project-structure/circular-dependency.test.ts`
- Create: `tests/fixtures/project-structure/circular-dependency/` (fixture)

- [ ] **Step 1: fixture 생성**

```
tests/fixtures/project-structure/circular-dependency/
  settings.gradle                                       (내용: "")
  module-a/
    src/main/java/com/a/AService.java
      (내용: "package com.a;\nimport com.b.BService;")
  module-b/
    src/main/java/com/b/BService.java
      (내용: "package com.b;\nimport com.a.AService;")
  module-c/
    src/main/java/com/c/CService.java
      (내용: "package com.c;")
```

module-a → module-b → module-a 순환.

- [ ] **Step 2: failing test 작성**

`tests/analyzers/project-structure/circular-dependency.test.ts`:

```typescript
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
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `bun test tests/analyzers/project-structure/circular-dependency.test.ts`
Expected: FAIL

- [ ] **Step 4: 구현**

`src/analyzers/project-structure/circular-dependency.ts`:

```typescript
import type { StructuralSignal } from "../types";
import type { ModuleInfo } from "./module-resolver";
import { parseImports } from "./import-parser";
import { detectLanguage } from "../../parsers/language-detector";

function findModuleForImport(importPath: string, modules: ModuleInfo[]): string | null {
  const lower = importPath.toLowerCase();
  for (const mod of modules) {
    if (lower.includes(mod.name.toLowerCase().replace("-", ""))) {
      return mod.name;
    }
  }
  return null;
}

async function buildDependencyGraph(
  filePaths: string[],
  modules: ModuleInfo[],
): Promise<Map<string, Set<string>>> {
  const graph = new Map<string, Set<string>>();

  for (const mod of modules) {
    graph.set(mod.name, new Set());
  }

  for (const mod of modules) {
    const moduleFiles = filePaths.filter(fp => fp.startsWith(mod.path));

    for (const fp of moduleFiles) {
      const language = detectLanguage(fp);
      if (language === "unknown") continue;

      let content: string;
      try {
        content = await Bun.file(fp).text();
      } catch {
        continue;
      }

      const imports = parseImports(content, language);
      for (const imp of imports) {
        const target = findModuleForImport(imp, modules);
        if (target && target !== mod.name) {
          graph.get(mod.name)!.add(target);
        }
      }
    }
  }

  return graph;
}

function findCycles(graph: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string) {
    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const neighbor of graph.get(node) ?? []) {
      if (inStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycles.push([...cycle].sort());
      } else if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }

    path.pop();
    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  // Deduplicate cycles (same sorted members)
  const seen = new Set<string>();
  return cycles.filter(cycle => {
    const key = cycle.join(",");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function detectCircularDependency(
  filePaths: string[],
  modules: ModuleInfo[],
): Promise<StructuralSignal[]> {
  const graph = await buildDependencyGraph(filePaths, modules);
  const cycles = findCycles(graph);

  return cycles.map(cycle => ({
    type: "circular_dependency" as const,
    severity: cycle.length >= 3 ? "critical" : "high",
    description: `${cycle.join(" ↔ ")} 사이에 순환 참조가 존재`,
    suggestion: "공통 의존을 별도 모듈로 분리하거나 인터페이스로 끊어내길 권장합니다",
    modules: cycle,
  }));
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `bun test tests/analyzers/project-structure/circular-dependency.test.ts`
Expected: 2 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/analyzers/project-structure/circular-dependency.ts tests/analyzers/project-structure/circular-dependency.test.ts tests/fixtures/project-structure/circular-dependency/
git commit -m "feat: add circular-dependency structural signal detector"
```

---

### Task 9: god-class 감지기

**Files:**
- Create: `src/analyzers/project-structure/god-class.ts`
- Create: `tests/analyzers/project-structure/god-class.test.ts`

- [ ] **Step 1: failing test 작성**

`tests/analyzers/project-structure/god-class.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import { detectGodClass } from "../../../src/analyzers/project-structure/god-class";
import type { FileAnalysis } from "../../../src/analyzers/types";

function makeFileAnalysis(filePath: string, lineCount: number, importCount: number): FileAnalysis {
  return {
    filePath,
    language: "java",
    lineCount,
    level: 1,
    levelLabel: "Well-organized",
    dimensions: {
      coupling: {
        score: importCount / 30,
        evidence: Array.from({ length: importCount }, (_, i) => ({
          line: i + 1,
          code: `import something.${i}`,
          signal: "high_import_count",
          explanation: "many imports",
          severity: "medium" as const,
        })),
      },
    },
  };
}

describe("detectGodClass", () => {
  test("detects file with 25 imports and 600 lines", () => {
    const files = [
      makeFileAnalysis("/project/GodService.java", 600, 25),
      makeFileAnalysis("/project/SmallService.java", 50, 3),
    ];
    const signals = detectGodClass(files);
    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe("god_class");
    expect(signals[0].description).toContain("GodService.java");
  });

  test("does not flag small file with many imports", () => {
    const files = [makeFileAnalysis("/project/SmallButImporty.java", 100, 25)];
    const signals = detectGodClass(files);
    expect(signals.length).toBe(0);
  });

  test("does not flag large file with few imports", () => {
    const files = [makeFileAnalysis("/project/LongButSimple.java", 600, 5)];
    const signals = detectGodClass(files);
    expect(signals.length).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `bun test tests/analyzers/project-structure/god-class.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

`src/analyzers/project-structure/god-class.ts`:

```typescript
import type { StructuralSignal, FileAnalysis } from "../types";
import { basename } from "path";

const IMPORT_THRESHOLD = 20;
const LINE_THRESHOLD = 500;

export function detectGodClass(fileResults: FileAnalysis[]): StructuralSignal[] {
  const signals: StructuralSignal[] = [];

  for (const file of fileResults) {
    const coupling = file.dimensions.coupling;
    const importCount = coupling?.evidence?.length ?? 0;

    if (importCount >= IMPORT_THRESHOLD && file.lineCount >= LINE_THRESHOLD) {
      const fileName = basename(file.filePath);
      signals.push({
        type: "god_class",
        severity: importCount >= 30 && file.lineCount >= 1000 ? "critical" : "high",
        description: `${fileName}이 과도한 의존성(import ${importCount}개)과 크기(${file.lineCount}줄)를 가짐`,
        suggestion: "책임을 분리하여 여러 클래스로 나누길 권장합니다",
        modules: [file.filePath],
      });
    }
  }

  return signals;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun test tests/analyzers/project-structure/god-class.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/analyzers/project-structure/god-class.ts tests/analyzers/project-structure/god-class.test.ts
git commit -m "feat: add god-class structural signal detector"
```

---

### Task 10: ProjectStructureAnalyzer 오케스트레이터

**Files:**
- Create: `src/analyzers/project-structure/index.ts`

- [ ] **Step 1: 구현**

`src/analyzers/project-structure/index.ts`:

```typescript
import type { StructuralSignal, FileAnalysis } from "../types";
import { resolveModules } from "./module-resolver";
import { detectExcessiveResponsibility } from "./excessive-responsibility";
import { detectDomainDuplication } from "./domain-duplication";
import { detectLayerInconsistency } from "./layer-inconsistency";
import { detectDependencyViolation } from "./dependency-violation";
import { detectCircularDependency } from "./circular-dependency";
import { detectGodClass } from "./god-class";

export async function analyzeProjectStructure(
  rootDir: string,
  filePaths: string[],
  fileResults: FileAnalysis[],
): Promise<StructuralSignal[]> {
  const modules = resolveModules(rootDir);

  if (modules.length < 2) {
    // Single module projects: only god_class is meaningful
    return detectGodClass(fileResults);
  }

  const [depViolations, circularDeps] = await Promise.all([
    detectDependencyViolation(filePaths, modules),
    detectCircularDependency(filePaths, modules),
  ]);

  return [
    ...detectExcessiveResponsibility(filePaths, modules),
    ...detectDomainDuplication(filePaths, modules),
    ...detectLayerInconsistency(filePaths, modules),
    ...depViolations,
    ...circularDeps,
    ...detectGodClass(fileResults),
  ];
}
```

- [ ] **Step 2: 기존 테스트가 깨지지 않는지 확인**

Run: `bun test`
Expected: 모든 테스트 PASS

- [ ] **Step 3: Commit**

```bash
git add src/analyzers/project-structure/index.ts
git commit -m "feat: add ProjectStructureAnalyzer orchestrator"
```

---

### Task 11: scan-project 통합

**Files:**
- Modify: `src/tools/scan-project.ts`
- Modify: `tests/tools/scan-project.test.ts`

- [ ] **Step 1: scan-project.test.ts에 structuralSignals 테스트 추가**

`tests/tools/scan-project.test.ts` 끝에 추가:

```typescript
  test("returns structuralSignals field", async () => {
    const result = await scanProjectTool("tests/fixtures");
    expect(result.structuralSignals).toBeDefined();
    expect(Array.isArray(result.structuralSignals)).toBe(true);
  });

  test("structural signals from multi-module fixture", async () => {
    const result = await scanProjectTool("tests/fixtures/project-structure/domain-duplication");
    const domainDup = result.structuralSignals.filter(s => s.type === "domain_duplication");
    expect(domainDup.length).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `bun test tests/tools/scan-project.test.ts`
Expected: FAIL — structuralSignals 필드 없음

- [ ] **Step 3: scan-project.ts 수정**

`src/tools/scan-project.ts`를 다음으로 교체:

```typescript
import { scanProject as scanFiles } from "../utils/glob-scanner";
import { scanFile } from "./scan-file";
import { scoreProject } from "../scoring/project-scorer";
import { analyzeProjectStructure } from "../analyzers/project-structure/index";
import { LEVEL_LABELS } from "../analyzers/types";
import type { Level, FileAnalysis, StructuralSignal } from "../analyzers/types";

export interface ProjectAnalysis {
  rootDir: string;
  totalFiles: number;
  level: Level;
  levelLabel: string;
  levelDistribution: Record<number, number>;
  worstFiles: { filePath: string; level: Level; levelLabel: string }[];
  structuralSignals: StructuralSignal[];
}

export async function scanProjectTool(rootDir: string): Promise<ProjectAnalysis> {
  const filePaths = await scanFiles(rootDir);
  const BATCH_SIZE = 20;
  const fileResults: FileAnalysis[] = [];

  for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
    const batch = filePaths.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(fp => scanFile(fp)));
    fileResults.push(...results);
  }

  const fileLevels = fileResults.map(f => f.level);
  const level = scoreProject(fileLevels);

  const levelDistribution: Record<number, number> = {};
  for (const l of fileLevels) {
    levelDistribution[l] = (levelDistribution[l] ?? 0) + 1;
  }

  const worstFiles = [...fileResults]
    .sort((a, b) => b.level - a.level)
    .slice(0, 10)
    .map(f => ({ filePath: f.filePath, level: f.level, levelLabel: f.levelLabel }));

  const structuralSignals = await analyzeProjectStructure(rootDir, filePaths, fileResults);

  return {
    rootDir,
    totalFiles: filePaths.length,
    level,
    levelLabel: LEVEL_LABELS[level],
    levelDistribution,
    worstFiles,
    structuralSignals,
  };
}
```

- [ ] **Step 4: 전체 테스트 통과 확인**

Run: `bun test`
Expected: 모든 테스트 PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/scan-project.ts tests/tools/scan-project.test.ts
git commit -m "feat: integrate structural signals into scan_project response"
```

---

### Task 12: scan 스킬 출력 포맷 업데이트

**Files:**
- Modify: `.claude-plugin/skills/scan/prompt.md` (또는 해당 스킬 파일)

- [ ] **Step 1: scan 스킬 파일 위치 확인 및 수정**

스킬의 프로젝트 스캔 결과 출력 형식 섹션에 structuralSignals 포맷 추가:

```markdown
### 프로젝트 스캔 결과

(기존 내용 유지)

### 구조적 신호가 있는 경우 추가 출력:

\`\`\`
## 구조적 신호 & 리팩토링 방향

| # | 유형 | 심각도 | 설명 | 리팩토링 방향 |
|---|------|--------|------|--------------|
| 1 | ... | ... | ... | ... |
\`\`\`
```

- [ ] **Step 2: Commit**

```bash
git add .claude-plugin/skills/scan/
git commit -m "feat: update scan skill output format with structural signals"
```
