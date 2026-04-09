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

1. `scan_project` 결과의 worstFiles (level 높은 순 정렬됨)에서 상위 10개를 AI 판단 대상으로 선택
2. 10개 파일을 Read 도구로 읽음 (가능하면 병렬로). 파일을 읽을 수 없으면 (삭제됨, 권한 없음, 바이너리 등) 해당 파일의 AI 판단을 생략하고 이유를 표시
3. 각 파일에 대해 파일 스캔과 동일한 AI 판단 절차 수행 (evidence별 판정 + 종합 소견)
4. worstFiles가 10개를 초과하면, 출력 마지막에 "더 보여줘" 안내 문구 추가
5. 사용자가 "더 보여줘" / "나머지도" / "다음" 등을 요청하면, 이미 대화 컨텍스트에 있는 MCP 결과에서 다음 10개를 선택하여 동일 절차 수행 (첫 scan_project 호출의 전체 결과가 대화 컨텍스트에 남아있으므로 추가 MCP 호출 불필요)

### 주의사항

- regex 기반 점수(Level 1-6)는 변경하지 않음. AI 판단은 점수와 별개로 표시
- AI 판단은 evidence의 코드 맥락을 근거로 하며, 추측하지 않음
- 종합 소견은 행동 가능해야 함 ("주의 필요" 같은 모호한 표현 대신 구체적 권고)
- 파일을 Read할 수 없으면 (삭제됨, 권한 없음, 바이너리 등) 해당 파일의 AI 판단을 생략하고 이유를 표시

## 출력 언어

사용자의 대화 언어에 맞춰 출력하세요. 한국어로 대화 중이면 시그널 이름, 심각도, 판정 등 모든 항목을 한국어로 표시합니다.

### 시그널 이름 한글 매핑

- `magic_number` → 매직 넘버
- `hardcoded_date` → 하드코딩된 날짜
- `order_dependent_init` → 순서 의존 초기화
- `unexplained_catch` → 설명 없는 catch
- `unexplained_value_comparison` → 설명 없는 값 비교
- `env_specific_branch` → 환경별 분기
- `commented_out_code` → 주석 처리된 코드
- `todo_without_ticket` → 티켓 없는 TODO
- `generic_name` → 범용적 이름
- `single_letter_name` → 한 글자 이름
- `inconsistent_casing` → 네이밍 규칙 혼재
- `undocumented_export` → 문서 없는 export
- `uncommented_complex_condition` → 설명 없는 복잡 조건
- `unexplained_regex` → 설명 없는 정규식
- `mixed_export_styles` → export 스타일 혼재
- `inconsistent_error_handling` → 에러 처리 불일치
- `high_function_length_variance` → 함수 길이 편차 큼
- `high_import_count` → import 과다
- `global_state_access` → 전역 상태 접근
- `deep_relative_import` → 깊은 상대경로 import
- `unclear_test_name` → 불명확한 테스트 이름
- `magic_value_in_test` → 테스트 내 매직 값
- `no_edge_case_tests` → 엣지 케이스 테스트 부재

### 심각도 한글 매핑

- `high` → 높음
- `medium` → 보통
- `low` → 낮음

## 출력 형식

결과를 받으면 다음 형식으로 사용자에게 보고하세요:

### 파일 스캔 결과

```
## [파일명] — Level X: [Label]

| 차원 | 점수 | 시그널 |
|------|------|--------|
| ... | ... | ... |

### AI 분석

#### Evidence 판정
| # | Line | 시그널 | Regex 심각도 | AI 판정 | 이유 |
|---|------|--------|-------------|---------|------|
| 1 | 42 | 매직 넘버 | 높음 | 오탐 | 상수 RETRY_COUNT에 할당된 값 |
| 2 | 87 | 설명 없는 catch | 높음 | 확인됨 | 에러 타입별 분기 이유 불명 |
| 3 | 120 | 매직 넘버 | 높음 | 심각도 조정 ↓보통 | 테스트 fixture |

#### 종합 소견
이 파일의 calculatePrice() 함수에는 할인율 계산이 매직 넘버로 인코딩되어 있습니다.
리팩토링 시 비즈니스팀에 할인 정책을 확인하세요.
```

AI 판정 한글 매핑:
- `confirmed` → 확인됨
- `false_positive` → 오탐
- `severity_adjusted` → 심각도 조정

evidence가 없는 파일은 AI 분석 섹션을 생략합니다.

### 프로젝트 스캔 결과

```
## 프로젝트 진단 — Level X: [Label]

- 총 파일 수: N
- 레벨 분포: Level 1: n개, Level 2: n개, ...

### Worst Files (Top 10) — AI 분석 포함
| # | File | Level | 핵심 문제 | AI 소견 요약 |
|---|------|-------|----------|-------------|
| 1 | src/pricing.ts | 6 | 매직 넘버 ×5 | 할인 정책이 숫자로 하드코딩 |
| 2 | ... | ... | ... | ... |

> 나머지 N개 파일의 AI 분석을 보려면 "더 보여줘"라고 말씀하세요.
```

worstFiles가 10개 이하이면 "더 보여줘" 안내를 생략합니다.

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
