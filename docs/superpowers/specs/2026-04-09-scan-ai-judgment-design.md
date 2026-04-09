# Scan AI Judgment — 설계 문서

## 배경

현재 `/codeaware:scan`은 100% regex + 휴리스틱 기반 정적 분석이다. AI는 MCP 도구 결과를 포맷팅해서 보여줄 뿐, 코드 판단에 개입하지 않는다. 이로 인해:

- 매직 넘버가 상수 선언에 할당된 경우에도 오탐으로 잡힘
- evidence가 실제로 문제인지 맥락 판단 없이 나열됨
- "그래서 이 파일 어떻게 해야 하는데?"라는 행동 가능한 인사이트가 없음

## 목표

scan 스킬에 AI 2차 판단을 추가하여, regex가 잡은 evidence에 대해 오탐 필터링 + 심각도 재평가 + 파일별 종합 소견을 제공한다.

## 설계 결정 요약

| 항목 | 결정 | 이유 |
|------|------|------|
| AI 판단 위치 | 스킬 레이어 (Claude) | MCP 바이너리에 LLM API 의존성 추가 불필요, 추가 비용 없음 |
| AI 판단 범위 | 오탐 필터링 + 심각도 재평가 + 종합 소견 | 필터링만으로는 새 가치 부족, 소견까지 있어야 행동 가능 |
| 적용 대상 | scan_file + scan_project 둘 다 | 어떤 스캔이든 AI 인사이트가 기본 제공되어야 함 |
| 프로젝트 스캔 AI 대상 수 | worst 10개, 추가 요청 시 다음 10개 | 정보 과부하 방지, 토큰 절약, 점진적 개선 워크플로우 |
| 코드 확보 방식 | 스킬이 Read 도구로 직접 읽음 | MCP 응답 비대화 방지, 필요한 파일만 선택적으로 |
| 점수 반영 | 없음 (regex 점수 그대로) | 재현성과 비교 가능성 보장 |
| 구현 방식 | 기존 scan 스킬 확장 | 사용자 경험 변화 없음, 단일 진입점 유지 |
| 변경 파일 | `skills/scan/SKILL.md` 하나만 | MCP 도구 코드 변경 없음 |

## 아키텍처

### 전체 흐름

```
사용자 → /codeaware:scan → MCP 호출 → regex 결과 수신
  │
  ├─ [파일 스캔] evidence 있음?
  │   ├─ Yes → 파일 Read → AI 2차 판단 → 통합 출력
  │   └─ No → 기존 형식 그대로 출력
  │
  └─ [프로젝트 스캔]
      ├─ 기존 요약 출력 (레벨 분포, 구조적 신호 등)
      ├─ worst 10개 파일 Read → AI 2차 판단 → 통합 출력
      └─ level 4+ 파일이 10개 초과 시 "더 보여줘" 안내
          └─ 사용자 요청 시 → 다음 10개 Read → AI 판단 → 출력
```

### 변경 없는 부분

- MCP 도구 코드 (`src/tools/scan-file.ts`, `src/tools/scan-project.ts`)
- 분석기 코드 (`src/analyzers/*`)
- 점수 계산 코드 (`src/scoring/*`)
- Level 1-6 체계

## AI 판단 프로세스

### Step 1. 대상 선별

- **파일 스캔**: evidence가 1개 이상이면 AI 판단 수행
- **프로젝트 스캔**: MCP가 반환한 worstFiles 상위 10개를 그대로 사용 (level 높은 순 정렬, MCP 기본 동작)

### Step 2. 파일 코드 읽기

- 대상 파일들을 Read 도구로 읽음
- 프로젝트 스캔 시 10개 파일을 병렬로 Read

### Step 3. Evidence별 판정

각 evidence에 대해 AI가 코드 맥락을 보고 판정:

| 판정 | 의미 |
|------|------|
| **confirmed** | 실제 문제 맞음 |
| **false_positive** | 오탐 — regex가 잡았지만 맥락상 문제 아님 |
| **severity_adjusted** | 심각도 변경 (예: medium → high 또는 그 반대) |

각 판정에 한 줄 이유를 붙인다.

### Step 4. 파일 종합 소견

evidence별 판정 후, 파일 전체에 대해 2-3문장의 종합 소견 작성:
- 이 파일에서 AI가 리팩토링 시 실수할 수 있는 핵심 위험
- 구체적 행동 권고

## 출력 형식

### 파일 스캔 출력

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

### 프로젝트 스캔 출력

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

### 구조적 신호 & 리팩토링 방향
(기존과 동일)
```

## "더 보여줘" 처리

별도 MCP 호출이나 상태 저장 불필요. 첫 스캔에서 MCP가 전체 결과를 반환하고 대화 컨텍스트에 남아있으므로:

1. 스킬이 처음에는 worst 10개만 AI 분석
2. 사용자가 "더 보여줘" / "나머지도" / "다음" 등 요청 시
3. 대화 컨텍스트의 MCP 결과에서 다음 10개 선택 → Read → AI 판단 → 출력

## 범위 외 (변경하지 않는 것)

- MCP 도구 코드
- 분석기/점수 계산 로직
- Level 1-6 점수 체계
- `/codeaware:discover`, `/codeaware:roadmap` 스킬
- plugin.json 버전
