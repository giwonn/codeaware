# codeaware

**AI가 코드를 얼마나 안전하게 이해하고 수정할 수 있는지 진단하는 MCP 서버.**

기존 코드 품질 도구들이 놓치는 **"숨은 맥락"** 을 탐지하여 AI 시대에 진짜 중요한 질문에 답합니다.

> "AI가 이 코드를 얼마나 안전하게 다룰 수 있는가?"

* * *

## How It Works

```
  SCAN                  SCORE                  ACT
┌──────────┐         ┌──────────┐         ┌──────────┐
│  File /  │         │  6-Level │         │ Roadmap  │
│ Project  │  ───▶   │  Rating  │  ───▶   │ & Guide  │
│  Scan    │         │  Report  │         │          │
└──────────┘         └──────────┘         └──────────┘
     │                    │                    │
     ▼                    ▼                    ▼
 6 Analyzers        Hidden Context       Discover Context
 run in parallel    override check       → Ask user questions
                                         → Save answers
                                         → Safe refactoring
```

**3단계 워크플로우**: 코드를 스캔하고 → 6단계 척도로 채점하고 → 개선 로드맵과 리팩토링 가이드를 제공합니다. 핵심은 **숨은 맥락 탐지**: 매직 넘버, 설명 없는 예외 처리, 순서 의존성 등 AI가 "이해했다"고 착각하고 수정했다가 장애가 나는 원인을 사전에 찾아냅니다.

* * *

## AI Comprehensibility Scale

```
 Level 1          Level 2          Level 3          Level 4          Level 5          Level 6
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Well-  │    │ Mostly  │    │  Mixed  │    │  Diffi- │    │ Hidden  │    │ Incomp- │
│organized│    │  good   │    │patterns │    │  cult   │    │ context │    │rehensib.│
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
  AI가 바로       부분적          패턴 혼재,       강결합,         코드 외부         의도 파악
  이해 가능       정리 필요       시간 필요        규칙 없음       지식 필요         자체 불가
```

* * *

## 6 Analysis Dimensions

| Dimension | Weight | What it detects |
|-----------|--------|-----------------|
| **Hidden Context** | 35% | 매직 넘버, 하드코딩 날짜, 순서 의존성, 설명 없는 catch, 환경 분기, 주석 코드, 티켓 없는 TODO |
| **Structure** | 15% | export 스타일 혼용, 에러 처리 패턴 불일치, 함수 길이 편차 |
| **Coupling** | 15% | import fan-in, 전역 상태 접근, 디렉토리 횡단 import |
| **Documentation** | 15% | 미문서화 export, 복잡 조건 미설명, 정규식 미설명, 모듈 주석 없음 |
| **Naming** | 10% | 단일 문자 변수, 범용 이름, 축약어, 케이싱 불일치 |
| **Test Coverage** | 10% | 불투명 테스트명, 매직 테스트값, 엣지 케이스 누락 |

> **Hidden Context Override**: hiddenContext >= 0.7 → 무조건 Level 6, >= 0.5 → 최소 Level 5. 다른 차원이 아무리 좋아도 숨은 맥락이 있으면 안전하지 않습니다.

* * *

## MCP Tools

| Tool | Phase | Description |
|------|-------|-------------|
| `scan_file` | SCAN | 단일 파일 분석 — 6차원 점수 + evidence 반환 |
| `scan_project` | SCAN | 프로젝트 전체 분석 — 레벨 분포 + worst files top 10 |
| `get_improvement_roadmap` | ACT | 우선순위별 개선 로드맵 생성 (hidden context 제거 우선) |
| `discover_context` | ACT | 숨은 맥락 시그널 기반 사용자 질문 자동 생성 |
| `save_context` | ACT | 사용자 답변을 `.codeaware/context.json`에 저장 |

## MCP Prompts

| Prompt | Description |
|--------|-------------|
| `guide_refactoring` | 저장된 맥락 기반 안전한 리팩토링 가이드 |
| `plan_msa_migration` | 모놀리스 → MSA 전환 계획 가이드 |
| `plan_eda_migration` | 이벤트 드리븐 아키텍처 전환 가이드 |
| `analyze_domain_boundaries` | 도메인 경계 분석 (DDD) |

* * *

## Context Discovery Workflow

리팩토링 전에 AI가 모르는 것을 먼저 밝혀내는 워크플로우입니다.

```
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │  scan_file  │     │  discover_  │     │    User     │     │   guide_    │
  │  분석 실행   │ ──▶ │   context   │ ──▶ │   answers   │ ──▶ │ refactoring │
  │             │     │  질문 생성   │     │  맥락 저장   │     │  안전 가이드  │
  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

**예시**: `discover_context`가 `if (userType === 3)` 을 발견하면:
> "Line 5의 숫자 3은 무슨 의미인가요? (비즈니스 규칙, 외부 시스템 코드, 특정 임계값 등)"

사용자가 "3 = 레거시 CRM의 프리미엄 유저 티어"라고 답하면, 이 맥락이 저장되어 리팩토링 시 AI가 해당 값을 함부로 변경하지 않습니다.

* * *

## Quick Start

<details>
<summary><strong>Claude Code Plugin (recommended)</strong></summary>

```bash
# 마켓플레이스 추가 (최초 1회)
/plugin marketplace add giwonn/giwonn-plugins

# 플러그인 설치
/plugin → Discover → codeaware 검색 → 설치
```

</details>

<details>
<summary><strong>Manual (Claude Code CLI)</strong></summary>

```bash
git clone https://github.com/giwonn/codeaware
cd codeaware && bun install
claude mcp add codeaware -- bun run src/index.ts
```

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

`claude_desktop_config.json`에 추가:

```json
{
  "mcpServers": {
    "codeaware": {
      "command": "bun",
      "args": ["run", "/path/to/codeaware/src/index.ts"]
    }
  }
}
```

</details>

* * *

## Project Structure

```
src/
├── analyzers/          ← 6 analysis dimensions
│   ├── hidden-context.ts    8 detection rules (killer feature)
│   ├── naming.ts            5 detection rules
│   ├── documentation.ts     5 detection rules
│   ├── structure.ts         3 detection rules
│   ├── coupling.ts          3 detection rules
│   └── test-coverage.ts     3 detection rules
├── scoring/            ← Level calculation
│   ├── file-scorer.ts       weighted sum + hidden context override
│   └── project-scorer.ts    worst-quartile weighting (top 25% = 60%)
├── context/            ← Context discovery workflow
│   ├── question-generator.ts
│   └── context-store.ts
├── tools/              ← MCP tool endpoints
├── prompts/            ← MCP prompt resources
├── parsers/            ← File reading + language detection
└── index.ts            ← MCP server entry point
```

* * *

## Why codeaware?

| Tool | Code Quality | AI Comprehensibility | Hidden Context | Improvement Roadmap |
|------|:---:|:---:|:---:|:---:|
| SonarQube MCP | O | X | X | X |
| CodeScene MCP | O | X | X | partial |
| Omen | O | X | X | priority only |
| **codeaware** | **O** | **O** | **O** | **O** |

기존 도구들은 cyclomatic complexity 같은 전통 메트릭만 측정합니다. codeaware는 **AI가 코드를 안전하게 다룰 수 있는가**라는 관점에서 진단합니다.

* * *

## Tech Stack

- **TypeScript** + **Bun** — io_uring 기반 파일 I/O로 수백~수천 파일 병렬 스캔
- **MCP SDK v1.x** — stdio transport로 Claude Desktop/IDE 연동
- **Regex 기반 분석** — AST 없이 모든 언어 지원. 진단 도구이므로 정밀도보다 범용성 우선
- **Zod** — MCP tool 입력 검증

## License

MIT
