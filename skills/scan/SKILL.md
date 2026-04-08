---
name: scan
description: "코드의 AI 이해도를 6단계 척도로 진단합니다. '/codeaware:scan' 또는 '/codeaware:scan path/to/file' 로 실행. 인자 없이 실행하면 현재 프로젝트 전체를 스캔합니다."
---

# codeaware scan

코드의 AI 이해도(AI Comprehensibility)를 6단계 척도로 진단합니다.

## 실행 방법

1. 인자가 파일 경로이면 → `scan_file` MCP tool 호출
2. 인자가 디렉토리 경로이면 → `scan_project` MCP tool 호출
3. 인자가 없으면 → 현재 작업 디렉토리에 대해 `scan_project` MCP tool 호출

## 출력 형식

결과를 받으면 다음 형식으로 사용자에게 보고하세요:

### 파일 스캔 결과
```
## [파일명] — Level X: [Label]

| Dimension | Score | Signals |
|-----------|-------|---------|
| ... | ... | ... |

### 주요 발견사항
- (evidence 중 severity가 high/critical인 항목을 요약)
```

### 프로젝트 스캔 결과
```
## 프로젝트 진단 — Level X: [Label]

- 총 파일 수: N
- 레벨 분포: Level 1: n개, Level 2: n개, ...

### Worst Files (Top 10)
| File | Level | Label |
|------|-------|-------|
| ... | ... | ... |
```

### 구조적 신호가 있는 경우 추가 출력

`structuralSignals` 배열이 비어있지 않으면 아래 섹션을 추가로 출력하세요:

```
## 구조적 신호 & 리팩토링 방향

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
