# codeaware Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI가 코드를 얼마나 안전하게 이해/수정할 수 있는지 6단계 척도로 진단하고, 개선 로드맵을 제시하는 MCP 서버

**Architecture:** 6개 분석기(naming, structure, coupling, hidden-context, documentation, test-coverage)가 파일을 스캔하여 각 차원의 점수를 산출하고, 가중 집계로 1-6 레벨을 결정. hidden-context 점수가 높으면 다른 점수와 무관하게 Level 5 이상으로 오버라이드. 결과를 기반으로 우선순위별 개선 로드맵 생성.

**Tech Stack:** TypeScript, Bun, MCP SDK v1.x (`@modelcontextprotocol/sdk`), Zod, stdio transport

---

## Project Structure

```
/root/github/codeaware/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                       # MCP server setup + stdio transport
│   ├── tools/
│   │   ├── scan-project.ts
│   │   ├── scan-file.ts
│   │   └── get-improvement-roadmap.ts
│   ├── analyzers/
│   │   ├── types.ts                   # Shared types
│   │   ├── naming.ts
│   │   ├── structure.ts
│   │   ├── coupling.ts
│   │   ├── hidden-context.ts          # Killer feature
│   │   ├── documentation.ts
│   │   └── test-coverage.ts
│   ├── scoring/
│   │   ├── file-scorer.ts
│   │   └── project-scorer.ts
│   ├── roadmap/
│   │   └── roadmap-generator.ts
│   ├── prompts/
│   │   └── architecture-migration.ts  # MSA, EDA 등 전환 가이드 프롬프트
│   ├── parsers/
│   │   ├── file-reader.ts
│   │   └── language-detector.ts
│   └── utils/
│       ├── glob-scanner.ts
│       └── logger.ts
├── tests/
│   ├── fixtures/
│   │   ├── level-1/ ~ level-6/       # 각 레벨별 샘플 코드
│   ├── analyzers/
│   ├── scoring/
│   ├── roadmap/
│   └── tools/
```

---

## AI Comprehensibility Scale (6 Levels)

| Level | Label | 의미 |
|-------|-------|------|
| 1 | Well-organized | AI가 바로 이해하고 수정 가능 |
| 2 | Mostly good | 부분적 정리 필요 |
| 3 | Mixed patterns | 패턴 혼재, 이해에 시간 필요 |
| 4 | Difficult | 강결합, 규칙 없음, 읽기 힘듦 |
| 5 | Hidden context | 코드 외부 암묵적 지식 없이 수정 불가 |
| 6 | Incomprehensible | 의도 파악 자체가 안 됨 |

---

## Scoring Algorithm

### File-Level
- 6개 차원별 0.0~1.0 점수 산출
- 가중치: naming(0.10), structure(0.15), coupling(0.15), **hiddenContext(0.35)**, documentation(0.15), testCoverage(0.10)
- **Override rule**: hiddenContext >= 0.7 → Level 6, >= 0.5 → 최소 Level 5

### Project-Level
- 최악 상위 25% 파일이 점수의 60%, 나머지 40%
- 깨끗한 파일 100개 + Level 5 파일 5개 = Level 1이 아님

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `src/index.ts`, `src/utils/logger.ts`

- [ ] **Step 1: Create project directory and package.json**

```bash
mkdir -p /root/github/codeaware
cd /root/github/codeaware
bun init -y
```

- [ ] **Step 2: Install dependencies**

```bash
cd /root/github/codeaware
bun add @modelcontextprotocol/sdk zod
bun add -d @types/bun typescript
```

- [ ] **Step 3: Write package.json**

```json
{
  "name": "codeaware",
  "version": "0.1.0",
  "type": "module",
  "bin": { "codeaware": "./src/index.ts" },
  "scripts": {
    "start": "bun run src/index.ts",
    "test": "bun test",
    "test:watch": "bun test --watch"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 4: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["bun-types"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 5: Write minimal src/index.ts**

```typescript
#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "codeaware",
  version: "0.1.0",
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("codeaware server started on stdio");
```

- [ ] **Step 6: Write src/utils/logger.ts**

```typescript
export function log(...args: unknown[]): void {
  console.error("[codeaware]", ...args);
}
```

- [ ] **Step 7: Verify server starts**

Run: `cd /root/github/codeaware && echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | bun run src/index.ts`
Expected: JSON-RPC response with server info

- [ ] **Step 8: git init and commit**

```bash
cd /root/github/codeaware
git init
echo "node_modules/\ndist/" > .gitignore
git add .
git commit -m "chore: scaffold codeaware project with Bun + MCP SDK"
```

---

## Task 2: Core Types

**Files:**
- Create: `src/analyzers/types.ts`

- [ ] **Step 1: Write analyzer types**

```typescript
// src/analyzers/types.ts
export type Severity = "low" | "medium" | "high" | "critical";
export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export interface Evidence {
  line: number;
  code: string;
  signal: string;
  explanation: string;
  severity: Severity;
}

export interface AnalyzerResult {
  dimension: string;
  score: number;       // 0.0 (perfect) to 1.0 (terrible)
  evidence: Evidence[];
}

export interface Analyzer {
  analyze(content: string, filePath: string, language: string): AnalyzerResult;
}

export interface FileAnalysis {
  filePath: string;
  language: string;
  lineCount: number;
  level: Level;
  levelLabel: string;
  dimensions: Record<string, { score: number; evidence: Evidence[] }>;
}

export const LEVEL_LABELS: Record<Level, string> = {
  1: "Well-organized",
  2: "Mostly good",
  3: "Mixed patterns",
  4: "Difficult",
  5: "Hidden context dependency",
  6: "Incomprehensible",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/analyzers/types.ts
git commit -m "feat: add core analyzer types"
```

---

## Task 3: Hidden Context Analyzer (Killer Feature)

**Files:**
- Create: `tests/fixtures/level-5/magic-numbers.ts`, `tests/fixtures/level-5/order-dependent.java`, `tests/fixtures/level-5/unexplained-catch.py`, `tests/fixtures/level-1/clean.ts`
- Create: `tests/analyzers/hidden-context.test.ts`
- Create: `src/analyzers/hidden-context.ts`

- [ ] **Step 1: Write test fixtures**

`tests/fixtures/level-5/magic-numbers.ts`:
```typescript
export function calculateDiscount(amount: number, userType: number) {
  if (userType === 3) {
    return amount * 0.035;
  }
  if (amount > 1923) {
    return amount - 47;
  }
  const timeout = 86400000;
  return amount;
}
```

`tests/fixtures/level-5/order-dependent.java`:
```java
public class AppBootstrap {
    public void init() {
        initializeCache();
        loadUserPreferences();
        setupRoutes();
        connectDatabase();
    }
}
```

`tests/fixtures/level-5/unexplained-catch.py`:
```python
def process_payment(amount):
    try:
        result = gateway.charge(amount)
        return result
    except TimeoutError:
        if amount > 50000:
            return {"status": "pending", "code": 4012}
        return {"status": "retry", "delay": 300}
```

`tests/fixtures/level-1/clean.ts`:
```typescript
const MAX_RETRY_COUNT = 3;
const HTTP_OK = 200;

export function isSuccessResponse(statusCode: number): boolean {
  return statusCode === HTTP_OK;
}
```

- [ ] **Step 2: Write failing test**

```typescript
// tests/analyzers/hidden-context.test.ts
import { describe, test, expect } from "bun:test";
import { HiddenContextAnalyzer } from "../../src/analyzers/hidden-context";

const analyzer = new HiddenContextAnalyzer();

describe("HiddenContextAnalyzer", () => {
  test("detects magic numbers", async () => {
    const content = await Bun.file("tests/fixtures/level-5/magic-numbers.ts").text();
    const result = analyzer.analyze(content, "magic-numbers.ts", "typescript");
    const magicSignals = result.evidence.filter(e => e.signal === "magic_number");
    expect(magicSignals.length).toBeGreaterThanOrEqual(3); // 0.035, 1923, 47
    expect(result.score).toBeGreaterThan(0.3);
  });

  test("detects unexplained catch blocks", async () => {
    const content = await Bun.file("tests/fixtures/level-5/unexplained-catch.py").text();
    const result = analyzer.analyze(content, "unexplained-catch.py", "python");
    const catchSignals = result.evidence.filter(e => e.signal === "unexplained_catch");
    expect(catchSignals.length).toBeGreaterThanOrEqual(1);
  });

  test("clean code scores low", async () => {
    const content = await Bun.file("tests/fixtures/level-1/clean.ts").text();
    const result = analyzer.analyze(content, "clean.ts", "typescript");
    expect(result.score).toBeLessThan(0.1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /root/github/codeaware && bun test tests/analyzers/hidden-context.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 4: Implement hidden-context analyzer**

`src/analyzers/hidden-context.ts` — 8 detection rules:
1. Magic numbers (not 0, 1, -1, common HTTP codes, common powers of 2)
2. Hardcoded dates (`"2024-01-15"`, Unix timestamps)
3. Order-dependent initialization (sequential calls, no data dependency)
4. Unexplained catch blocks (conditional logic in catch, no comments)
5. Unexplained value comparisons (`if (status === 47)`)
6. Environment-specific branching (`process.env.LEGACY_MODE`)
7. Large commented-out code blocks (5+ lines)
8. TODO/FIXME/HACK without ticket reference

Each rule returns Evidence items with line, code, signal, explanation, severity.
Score = weighted sum of signals normalized by line count.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /root/github/codeaware && bun test tests/analyzers/hidden-context.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/ tests/analyzers/hidden-context.test.ts src/analyzers/hidden-context.ts
git commit -m "feat: add hidden context analyzer with 8 detection rules"
```

---

## Task 4: Naming Analyzer

**Files:**
- Create: `tests/fixtures/level-4/bad-naming.ts`, `tests/analyzers/naming.test.ts`, `src/analyzers/naming.ts`

- [ ] **Step 1: Write fixture**

`tests/fixtures/level-4/bad-naming.ts` — single-letter vars, generic names, inconsistent casing

- [ ] **Step 2: Write failing test**

Test: single-letter vars detected, generic names flagged, clean code scores low

- [ ] **Step 3: Run test (RED)**
- [ ] **Step 4: Implement naming analyzer**

Detection: single-letter vars, abbreviated names, generic names (data, info, temp), inconsistent casing, boolean naming

- [ ] **Step 5: Run test (GREEN)**
- [ ] **Step 6: Commit**

---

## Task 5: Documentation Analyzer

**Files:**
- Create: `tests/fixtures/level-3/no-docs.ts`, `tests/analyzers/documentation.test.ts`, `src/analyzers/documentation.ts`

- [ ] **Step 1-6: TDD cycle**

Detection: exported functions without docs, complex conditionals without comments, regex without explanation, no module-level comment, long functions without section comments

---

## Task 6: Structure Analyzer

**Files:**
- Create: `tests/fixtures/level-3/mixed-exports.ts`, `tests/analyzers/structure.test.ts`, `src/analyzers/structure.ts`

- [ ] **Step 1-6: TDD cycle**

Detection: mixed export styles, inconsistent error handling patterns, function length variance

---

## Task 7: Coupling Analyzer

**Files:**
- Create: `tests/fixtures/level-4/` (multi-file), `tests/analyzers/coupling.test.ts`, `src/analyzers/coupling.ts`

- [ ] **Step 1-6: TDD cycle**

Detection: import fan-in/fan-out, global state access, cross-directory imports

---

## Task 8: Test Coverage Signal Analyzer

**Files:**
- Create: `tests/fixtures/level-5/opaque-tests.test.ts`, `tests/analyzers/test-coverage.test.ts`, `src/analyzers/test-coverage.ts`

- [ ] **Step 1-6: TDD cycle**

Detection: opaque test names, magic values in assertions, missing edge case tests

---

## Task 9: File Scorer

**Files:**
- Create: `tests/scoring/file-scorer.test.ts`, `src/scoring/file-scorer.ts`

- [ ] **Step 1: Write failing test**

Test cases:
- All perfect scores → Level 1
- Mixed scores → correct weighted level
- **Hidden context override**: hiddenContext=0.7, everything else=0.0 → Level 6
- **Hidden context override**: hiddenContext=0.5, everything else=0.0 → Level 5

- [ ] **Step 2: Run test (RED)**
- [ ] **Step 3: Implement file scorer**

```typescript
const DIMENSION_WEIGHTS = {
  naming: 0.10,
  structuralConsistency: 0.15,
  coupling: 0.15,
  hiddenContext: 0.35,
  documentation: 0.15,
  testCoverage: 0.10,
};
```

Hidden context override: >= 0.7 → Level 6, >= 0.5 → min Level 5

- [ ] **Step 4: Run test (GREEN)**
- [ ] **Step 5: Commit**

---

## Task 10: Project Scorer

**Files:**
- Create: `tests/scoring/project-scorer.test.ts`, `src/scoring/project-scorer.ts`

- [ ] **Step 1-5: TDD cycle**

Worst-quartile-weighted: top 25% worst files = 60% of score, rest = 40%
Test: 80% Level 1 + 20% Level 5 ≠ Level 1

---

## Task 11: File Utilities

**Files:**
- Create: `src/parsers/language-detector.ts`, `src/parsers/file-reader.ts`, `src/utils/glob-scanner.ts`

- [ ] **Step 1: Implement language detector**

Extension → language mapping (ts, js, java, py, go, kt, etc.)

- [ ] **Step 2: Implement file reader**

Read file content, detect language, handle encoding

- [ ] **Step 3: Implement glob scanner**

Discover project files, respect .gitignore, apply include/exclude patterns

- [ ] **Step 4: Commit**

---

## Task 12: scan_file Tool

**Files:**
- Create: `tests/tools/scan-file.test.ts`, `src/tools/scan-file.ts`

- [ ] **Step 1: Write integration test**

Give it a Level 5 fixture file → expect level=5 with hidden context evidence

- [ ] **Step 2: Run test (RED)**
- [ ] **Step 3: Implement scan_file tool**

Wire up: file reader → all 6 analyzers → file scorer → return structured result

- [ ] **Step 4: Run test (GREEN)**
- [ ] **Step 5: Register tool in src/index.ts**
- [ ] **Step 6: Commit**

---

## Task 13: scan_project Tool

**Files:**
- Create: `tests/tools/scan-project.test.ts`, `src/tools/scan-project.ts`

- [ ] **Step 1-6: TDD cycle**

Wire up: glob scanner → scan each file → project scorer → return aggregated result with level distribution and worst files

---

## Task 14: Roadmap Generator + Tool

**Files:**
- Create: `tests/roadmap/roadmap-generator.test.ts`, `src/roadmap/roadmap-generator.ts`, `src/tools/get-improvement-roadmap.ts`

- [ ] **Step 1-6: TDD cycle**

Phase ordering: hidden context elimination → documentation → naming → structure → coupling
Each item = directive (not code), with file path, reason, priority

---

## Task 15: Architecture Migration Prompts (MSA, EDA 등)

**Files:**
- Create: `src/prompts/architecture-migration.ts`

아키텍처 전환(MSA, EDA 등)은 코드로 자동화할 영역이 아니라, AI가 코드를 읽고 판단하도록 가이드하는 **MCP prompt resource**로 제공.

- [ ] **Step 1: Register MCP prompts**

`server.prompt()`으로 아키텍처 전환 관련 프롬프트 등록:
- `plan_msa_migration`: 모놀리스 → MSA 전환 계획 수립 가이드
- `plan_eda_migration`: 이벤트 드리븐 아키텍처 전환 가이드
- `analyze_domain_boundaries`: 도메인 경계 분석 가이드

각 프롬프트는 scan_project 결과를 참고하여 AI가 코드를 읽고 도메인 경계, 결합도, 분해 순서를 판단하도록 구조화된 지침 제공.

- [ ] **Step 2: Commit**

```bash
git add src/prompts/
git commit -m "feat: add architecture migration prompt resources"
```

---

## Verification

1. **Unit tests**: `cd /root/github/codeaware && bun test`
2. **Manual MCP test**: `echo '<initialize JSON-RPC>' | bun run src/index.ts` → should return tool list
3. **End-to-end**: Configure in Claude Desktop, run `scan_project` on a real project, verify levels make sense
4. **Fixture validation**: Each level-N fixture should score at level N ± 1
