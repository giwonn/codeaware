# Changelog

## [0.1.0] - 2026-04-08

### Added
- 6개 분석기: hidden-context, naming, documentation, structure, coupling, test-coverage
- File scorer: 6차원 가중 점수 + hidden context override
- Project scorer: worst-quartile 가중 집계
- MCP tools: `scan_file`, `scan_project`, `get_improvement_roadmap`, `discover_context`, `save_context`
- MCP prompts: `plan_msa_migration`, `plan_eda_migration`, `analyze_domain_boundaries`, `guide_refactoring`
- Context discovery workflow: 숨은 맥락 질문 생성 → 사용자 답변 저장 → 리팩토링 가이드
