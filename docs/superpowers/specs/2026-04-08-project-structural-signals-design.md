# scan_project 구조적 신호 감지 확장

## 배경

codeaware의 `scan_project`는 파일 단위 AI 이해도(Level 1~6)를 진단한다. 하지만 프로젝트 레벨의 구조적 문제(모듈 간 중복, 계층 불일치 등)는 감지하지 못한다.

실제로 wiseai-aiu 프로젝트를 scan했을 때 Level 1(Well-organized)이 나왔지만, 수동 탐색으로 admin/svc/domain 간 도메인 중복, 모놀리스 분리 과정의 혼재 등 구조적 문제가 발견되었다.

## 목표

`scan_project` 응답에 `structuralSignals` 필드를 추가하여, 파일 품질 진단과 함께 **구조적 이상 신호 + 리팩토링 방향 제안**을 한번에 반환한다.

## 설계

### 타입 정의

`src/analyzers/types.ts`에 추가:

```typescript
type StructuralSignalType = 
  | "excessive_responsibility"
  | "domain_duplication"
  | "layer_inconsistency"
  | "dependency_violation"
  | "circular_dependency"
  | "god_class";

interface StructuralSignal {
  type: StructuralSignalType;
  severity: Severity;
  description: string;
  suggestion: string;
  modules: string[];
}

interface ProjectStructureAnalyzer {
  analyze(filePaths: string[], fileResults: FileAnalysis[]): StructuralSignal[];
}
```

### 응답 구조 변경

`ProjectAnalysis`에 `structuralSignals: StructuralSignal[]` 필드 추가. 기존 필드는 모두 유지.

### 6개 신호 감지 로직

#### 1. excessive_responsibility — 모듈 내 과다한 책임
- **입력**: filePaths
- **감지**: 모듈(1차 디렉토리) 내 `*Service*`, `*Repository*`, `*Controller*` 패턴 파일 수 카운팅. Service 파일 50개 이상 시 트리거.
- **suggestion**: "이 모듈의 책임이 과다합니다. 도메인별로 분리하거나 비즈니스 로직을 도메인 계층으로 이관을 권장합니다"

#### 2. domain_duplication — 모듈 간 도메인 중복
- **입력**: filePaths
- **감지**: 2차 이상 디렉토리명이 2개 이상 모듈에 존재하는지 비교. `config`, `common`, `utils` 등 범용 디렉토리는 제외.
- **suggestion**: "{domain}이 {modules}에 중복 존재. 하나의 모듈로 응집하고 나머지는 호출 구조로 전환 권장"

#### 3. layer_inconsistency — 계층 구조 불일치
- **입력**: filePaths
- **감지**: 모듈별 디렉토리 구조 패턴 비교. DDD 패턴(`application/usecase/domain/infrastructure`)과 전통 패턴(`controller/service/repository`)이 혼재하는 경우.
- **suggestion**: "모듈 간 계층 구조가 불일치합니다. 통일된 아키텍처 패턴 적용을 권장합니다"

#### 4. dependency_violation — 의존성 방향 위반
- **입력**: filePaths + import 라인 파싱 (파일 상위 N줄)
- **감지**: import 구문을 regex로 파싱 (Java/TS/JS/Python/Go 커버). 모듈 계층을 추론하고 하위→상위 참조 감지.
- **suggestion**: "{파일}이 상위 계층 {모듈}을 참조합니다. 의존성 방향을 역전하거나 인터페이스를 통한 간접 참조를 권장합니다"

#### 5. circular_dependency — 순환 참조
- **입력**: filePaths + import 라인 파싱
- **감지**: 모듈 간 import 관계를 그래프로 구성 후 DFS로 사이클 탐지. 모듈(1차 디렉토리) 단위로 분석.
- **suggestion**: "{moduleA}와 {moduleB} 사이에 순환 참조가 존재합니다. 공통 의존을 별도 모듈로 분리하거나 인터페이스로 끊어내길 권장합니다"

#### 6. god_class — God class
- **입력**: fileResults (기존 scan 결과 재활용)
- **감지**: import 20개 이상 & 500줄 이상인 파일.
- **suggestion**: "{파일}이 과도한 의존성과 크기를 가집니다. 책임을 분리하여 여러 클래스로 나누길 권장합니다"

### 실행 흐름

```
scanProjectTool(rootDir)
  1. glob-scanner → filePaths 수집
  2. 파일별 scanFile (기존, 배치 처리) → FileAnalysis[]
  3. scoreProject (기존) → level
  4. ProjectStructureAnalyzer.analyze(filePaths, fileResults) → StructuralSignal[]
  5. 결과 조합 → ProjectAnalysis 반환
```

### 파일 구조

```
src/analyzers/
  types.ts                              # StructuralSignal 타입 추가
  structure.ts                          # 기존 (파일 단위, 변경 없음)
  project-structure/
    index.ts                            # ProjectStructureAnalyzer 메인
    excessive-responsibility.ts
    domain-duplication.ts
    layer-inconsistency.ts
    dependency-violation.ts
    circular-dependency.ts
    god-class.ts
```

### 성능

- 신호 1~3: filePaths만 사용, 추가 I/O 없음
- 신호 4~5: import 라인만 파싱 필요 (파일 상위 N줄만 읽음)
- 신호 6: 기존 FileAnalysis 결과 재활용, 추가 I/O 없음

### 스킬 출력 포맷

structuralSignals가 있으면 기존 레벨 진단 아래에 추가 표시:

```
## 프로젝트 진단 — Level 1: Well-organized
(기존 레벨 분포, worst files 등)

## 구조적 신호 & 리팩토링 방향
| # | 유형 | 심각도 | 설명 | 리팩토링 방향 |
|---|------|--------|------|--------------|
| 1 | 도메인 중복 | high | calllog가 admin, svc, domain에 중복 | domain으로 응집, admin/svc는 호출 구조로 전환 |
| 2 | 과다 책임 | high | admin에 Service 268개 | 도메인별 분리 또는 domain 계층으로 이관 |
```

### 언어 지원

regex 기반으로 다언어 지원. import 파싱 대상:
- Java: `import kr.co.wiseai.domain...`
- TS/JS: `import ... from "..."` / `require("...")`
- Python: `from ... import ...` / `import ...`
- Go: `import "..."`

AST는 사용하지 않으며, codeaware의 기존 철학(regex 기반 분석)을 유지한다.

### 모듈 식별 전략

"모듈"이란 프로젝트 루트 직하의 소스 코드를 포함하는 1차 디렉토리를 의미한다. 식별 기준:

1. **멀티모듈 프로젝트** (build.gradle, settings.gradle, pom.xml 등이 루트에 존재): 루트 직하 디렉토리 중 `src/` 또는 빌드 파일을 포함하는 것을 모듈로 인식. 예: `wiseai-admin/`, `wiseai-domain/`
2. **단일 프로젝트** (src/ 가 루트에 바로 존재): `src/` 아래 1차 디렉토리를 모듈로 취급. 예: `src/controllers/`, `src/services/`
3. **모노레포** (packages/, apps/ 등): packages/apps 아래 1차 디렉토리를 모듈로 인식.

자동 감지하되, 판별 불가 시 루트 직하 디렉토리를 모듈로 간주한다.
