# Changelog

## [0.4.0] - 2026-04-08

### Added
- `scan_project` 응답에 `structuralSignals` 필드 추가 — 프로젝트 레벨 구조적 이상 감지 + 리팩토링 방향 제안
- 6종 구조적 신호 감지기: excessive_responsibility, domain_duplication, layer_inconsistency, dependency_violation, circular_dependency, god_class
- module-resolver: 멀티모듈/모노레포/단일 프로젝트 자동 식별
- import-parser: Java, TypeScript/JS, Python, Go, Kotlin 다언어 import 파싱
- 도메인 중복 감지: 디렉토리명 블랙리스트가 아닌 구조적 분석(레이어 하위 디렉토리 존재 여부)으로 비즈니스 도메인 판별
- scan 스킬 출력 포맷에 구조적 신호 테이블 추가

## [0.3.0] - 2026-04-08

### Fixed
- MCP 서버 경로에 CLAUDE_PLUGIN_ROOT 환경변수 사용

## [0.2.0] - 2026-04-08

### Added
- Slash command skills: `/codeaware:scan`, `/codeaware:roadmap`, `/codeaware:discover`

## [0.1.0] - 2026-04-08

### Added
- 6개 분석기: hidden-context, naming, documentation, structure, coupling, test-coverage
- File scorer: 6차원 가중 점수 + hidden context override
- Project scorer: worst-quartile 가중 집계
- MCP tools: `scan_file`, `scan_project`, `get_improvement_roadmap`, `discover_context`, `save_context`
- MCP prompts: `plan_msa_migration`, `plan_eda_migration`, `analyze_domain_boundaries`, `guide_refactoring`
- Context discovery workflow: 숨은 맥락 질문 생성 → 사용자 답변 저장 → 리팩토링 가이드
