---
name: roadmap
description: "코드 개선 로드맵을 생성합니다. '/codeaware:roadmap' 으로 실행. 숨은 맥락 제거를 최우선으로 하는 단계별 개선 계획을 제시합니다."
---

# codeaware roadmap

프로젝트의 AI 이해도를 개선하기 위한 우선순위별 로드맵을 생성합니다.

## 실행 방법

1. 인자가 디렉토리 경로이면 → 해당 디렉토리에 대해 `get_improvement_roadmap` MCP tool 호출
2. 인자가 없으면 → 현재 작업 디렉토리에 대해 `get_improvement_roadmap` MCP tool 호출

## 출력 형식

결과를 받으면 다음 형식으로 사용자에게 보고하세요:

```
## 개선 로드맵

### Phase 1: 숨은 맥락 제거 (최우선)
| File | Priority | Reason |
|------|----------|--------|
| ... | critical/high/medium | ... |

### Phase 2: 문서화 개선
...

(이하 Phase 순서대로)
```

각 Phase는 dimension 우선순위를 따릅니다:
1. Hidden Context (숨은 맥락 제거)
2. Documentation (문서화)
3. Naming (이름 개선)
4. Structure (구조 정규화)
5. Coupling (결합도 감소)
6. Test Coverage (테스트 품질)
