# Scan AI Judgment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** scan 스킬에 AI 2차 판단을 추가하여, regex evidence에 대한 오탐 필터링 + 심각도 재평가 + 파일별 종합 소견을 제공한다.

**Architecture:** MCP 도구 코드는 변경 없음. `skills/scan/SKILL.md` 스킬 프롬프트만 수정하여 Claude가 scan 결과를 받은 후 파일을 Read하고 AI 판단을 수행하도록 지시한다.

**Tech Stack:** Markdown (스킬 프롬프트)

---

## File Structure

- Modify: `skills/scan/SKILL.md` — scan 스킬 프롬프트에 AI 판단 절차 및 출력 형식 추가

---

### Task 1: scan 스킬에 AI 판단 절차 추가

**Files:**
- Modify: `skills/scan/SKILL.md`

**설계 참조:** `docs/superpowers/specs/2026-04-09-scan-ai-judgment-design.md`

- [ ] **Step 1: 현재 SKILL.md 백업 확인**

Run: `git status`
Expected: clean working tree (이미 커밋된 상태)

- [ ] **Step 2: SKILL.md를 새 내용으로 교체**

`skills/scan/SKILL.md`를 아래 내용으로 교체한다:

```markdown
---
name: scan
description: "코드의 AI 이해도를 6단계 척도로 진단합니다. '/codeaware:scan' 또는 '/codeaware:scan path/to/file' 로 실행. 인자 없이 실행하면 현재 프로젝트 전체를 스캔합니다."
---

# codeaware scan

코드의 AI 이해도(AI Comprehensibility)를 6단계 척도로 진단하고, AI가 코드 맥락을 분석하여 오탐 필터링 및 종합 소견을 제공합니다.

## 실행 방법

1. 인자가 파일 경로이면 → `scan_file` MCP tool 호출
2. 인자가 디렉토리 경로이면 → `scan_project` MCP tool 호출
3. 인자가 없으면 → 현재 작업 디렉토리에 대해 `scan_project` MCP tool 호출

## AI 판단 절차

MCP 도구의 regex 결과를 받은 후, 다음 절차로 AI 2차 판단을 수행하세요.

### 파일 스캔 시

1. `scan_file` 결과에서 evidence가 1개 이상이면 AI 판단 수행
2. 해당 파일을 Read 도구로 읽음
3. 각 evidence에 대해 코드 맥락을 보고 판정:
   - **confirmed** — 실제 문제 맞음
   - **false_positive** — 오탐. regex가 잡았지만 맥락상 문제 아님 (예: 상수 선언에 할당된 매직 넘버, 테스트 fixture 등)
   - **severity_adjusted** — 심각도 변경. ↑ 또는 ↓ 와 변경된 심각도를 표시 (예: severity_adjusted ↓medium)
4. 각 판정에 한 줄 이유를 붙임
5. evidence별 판정 후, 파일 전체에 대해 2-3문장의 종합 소견 작성:
   - 이 파일에서 AI가 리팩토링 시 실수할 수 있는 핵심 위험
   - 구체적 행동 권고

evidence가 없으면 AI 판단을 생략하고 기존 형식대로 출력합니다.

### 프로젝트 스캔 시

1. `scan_project` 결과에서 worstFiles 상위 10개를 AI 판단 대상으로 선택
2. 10개 파일을 Read 도구로 읽음 (가능하면 병렬로)
3. 각 파일에 대해 파일 스캔과 동일한 AI 판단 절차 수행 (evidence별 판정 + 종합 소견)
4. level 4 이상 파일이 10개를 초과하면, 출력 마지막에 "더 보여줘" 안내 문구 추가
5. 사용자가 "더 보여줘" / "나머지도" / "다음" 등을 요청하면, 이미 대화 컨텍스트에 있는 MCP 결과에서 다음 10개를 선택하여 동일 절차 수행

### 주의사항

- regex 기반 점수(Level 1-6)는 변경하지 않음. AI 판단은 점수와 별개로 표시
- AI 판단은 evidence의 코드 맥락을 근거로 하며, 추측하지 않음
- 종합 소견은 행동 가능해야 함 ("주의 필요" 같은 모호한 표현 대신 구체적 권고)

## 출력 형식

결과를 받으면 다음 형식으로 사용자에게 보고하세요:

### 파일 스캔 결과

```
## [파일명] — Level X: [Label]

| Dimension | Score | Signals |
|-----------|-------|---------|
| ... | ... | ... |

### AI 분석

#### Evidence 판정
| # | Line | Signal | Regex 판정 | AI 판정 | 이유 |
|---|------|--------|-----------|---------|------|
| 1 | 42 | magic_number | high | false_positive | 상수 RETRY_COUNT에 할당된 값 |
| 2 | 87 | unexplained_catch | high | confirmed | 에러 타입별 분기 이유 불명 |
| 3 | 120 | magic_number | high | severity_adjusted ↓medium | 테스트 fixture |

#### 종합 소견
이 파일의 calculatePrice() 함수에는 할인율 계산이 매직 넘버로 인코딩되어 있습니다.
리팩토링 시 비즈니스팀에 할인 정책을 확인하세요.
```

evidence가 없는 파일은 AI 분석 섹션을 생략합니다.

### 프로젝트 스캔 결과

```
## 프로젝트 진단 — Level X: [Label]

- 총 파일 수: N
- 레벨 분포: Level 1: n개, Level 2: n개, ...
- Level 4 이상: M개 (상위 10개 AI 분석 완료)

### Worst Files (Top 10) — AI 분석 포함
| # | File | Level | 핵심 문제 | AI 소견 요약 |
|---|------|-------|----------|-------------|
| 1 | src/pricing.ts | 6 | magic_number ×5 | 할인 정책이 숫자로 하드코딩 |
| 2 | ... | ... | ... | ... |

> 나머지 M-10개 파일의 AI 분석을 보려면 "더 보여줘"라고 말씀하세요.
```

level 4 이상 파일이 10개 이하이면 "더 보여줘" 안내를 생략합니다.

### 구조적 신호가 있는 경우 추가 출력

`structuralSignals` 배열이 비어있지 않으면 아래 섹션을 추가로 출력하세요:

```
### 구조적 신호 & 리팩토링 방향

| # | 유형 | 심각도 | 설명 | 리팩토링 방향 |
|---|------|--------|------|--------------|
| 1 | ... | ... | ... | ... |
```

유형 매핑:
- `excessive_responsibility` → 과다 책임
- `domain_duplication` → 도메인 중복
- `layer_inconsistency` → 계층 불일치
- `dependency_violation` → 의존성 위반
- `circular_dependency` → 순환 참조
- `god_class` → God Class
```

- [ ] **Step 3: 변경 확인**

Run: `git diff skills/scan/SKILL.md`
Expected: frontmatter 유지, 본문에 "AI 판단 절차" 섹션과 새 출력 형식이 추가된 diff

- [ ] **Step 4: 수동 테스트 — 파일 스캔**

Claude Code에서 `/codeaware:scan src/analyzers/hidden-context.ts` 실행하여:
- 기존 regex 결과 테이블이 출력되는지 확인
- AI 분석 섹션 (Evidence 판정 테이블 + 종합 소견)이 출력되는지 확인
- false_positive 판정이 합리적인지 확인

- [ ] **Step 5: 수동 테스트 — 프로젝트 스캔**

Claude Code에서 `/codeaware:scan` (인자 없이) 실행하여:
- worst 10개 파일에 "AI 소견 요약" 컬럼이 포함되는지 확인
- level 4+ 파일이 10개 초과 시 "더 보여줘" 안내가 표시되는지 확인
- "더 보여줘"라고 입력 시 다음 파일들의 AI 분석이 출력되는지 확인

- [ ] **Step 6: 커밋**

```bash
git add skills/scan/SKILL.md
git commit -m "feat: add AI judgment to scan skill

Scan now performs AI 2nd-pass analysis on regex evidence:
- False positive filtering with contextual reasoning
- Severity re-evaluation based on code context
- Per-file synthesis with actionable recommendations
- Project scan shows top 10 with 'show more' pagination"
```
