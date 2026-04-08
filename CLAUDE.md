# codeaware — Project Instructions

## GitHub 계정

이 프로젝트에서 git push, gh 명령은 **giwonn** 계정으로 수행.
세션 시작 시 `gh auth status`로 확인. giwonn이 active가 아니면:

```bash
gh auth switch --user giwonn
```

## 릴리즈 워크플로우

새 버전 릴리즈 시 **모든 단계**를 순서대로 수행:

1. 코드 변경 커밋 + `git push origin main`
2. 태그 생성 + push: `git tag vX.Y.Z && git push origin vX.Y.Z`
   - 태그 push → GitHub Actions가 5개 플랫폼 바이너리 빌드 + Release 생성
3. CI 완료 확인: `gh run list --repo giwonn/codeaware --limit 1` → `gh run watch <id>`
4. **마켓플레이스 ref 업데이트** (빠뜨리면 사용자가 이전 버전을 받게 됨):
   ```bash
   # giwonn-plugins repo 클론 (없으면)
   git clone https://github.com/giwonn/giwonn-plugins /tmp/giwonn-plugins
   # marketplace.json의 codeaware ref를 새 태그로 변경 후 push
   ```
5. CHANGELOG.md 업데이트

## 마켓플레이스 구조

- **마켓플레이스 repo**: `giwonn/giwonn-plugins` — marketplace.json으로 플러그인 목록 관리
- **플러그인 repo들**: `giwonn/codeaware`, `giwonn/claude-daily-review`
- 새 플러그인 추가 시 giwonn-plugins의 marketplace.json에 항목 추가

## 바이너리 배포

- `bin/run.sh`가 플러그인 첫 실행 시 OS 감지 → GitHub Releases에서 바이너리 자동 다운로드
- CI: `.github/workflows/release.yml`이 `bun build --compile --target` 으로 크로스 컴파일
- 지원 플랫폼: darwin-arm64, darwin-x64, linux-x64, linux-arm64, windows-x64

## Tech Stack

- TypeScript + Bun
- MCP SDK v1.x (`@modelcontextprotocol/sdk`)
- Zod (입력 검증)
- Regex 기반 분석 (AST 아님)

## 테스트

```bash
bun test
```
