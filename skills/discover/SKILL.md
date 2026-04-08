---
name: discover
description: "리팩토링 전 숨은 맥락을 발견합니다. '/codeaware:discover path/to/file' 로 실행. AI가 모르는 것을 사용자에게 질문하여 안전한 리팩토링을 준비합니다."
---

# codeaware discover

리팩토링 전에 AI가 모르는 숨은 맥락을 사용자와의 대화로 밝혀내는 워크플로우입니다.

## 실행 방법

1. 인자로 받은 파일 경로에 대해 `discover_context` MCP tool 호출
2. 인자가 없으면 사용자에게 파일 경로를 물어보세요

## 워크플로우

### Step 1: 질문 생성
`discover_context` 결과로 질문 목록을 받으면, 하나씩 사용자에게 물어보세요.

질문 형식:
```
### 질문 1/N — [signal type]
**파일**: [filePath], Line [line]
**코드**: `[code]`

[question]

> 💡 [why] (왜 이 질문이 중요한지)
```

### Step 2: 답변 저장
사용자가 답변하면 즉시 `save_context` MCP tool을 호출하여 저장하세요.

### Step 3: 다음 질문
모든 질문에 답변을 받을 때까지 반복합니다.

### Step 4: 완료 보고
모든 질문이 완료되면:
```
## 맥락 수집 완료

- 총 N개 질문 중 N개 답변 완료
- 저장 위치: [project_dir]/.codeaware/context.json

이제 `guide_refactoring` 프롬프트를 사용하여 안전한 리팩토링을 시작할 수 있습니다.
```

### 질문이 없는 경우
`discover_context`가 빈 결과를 반환하면:
```
숨은 맥락이 감지되지 않았습니다. 이 파일은 AI 기반 리팩토링에 안전합니다.
```
