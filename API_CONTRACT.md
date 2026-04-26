# API_CONTRACT.md — 모듈 간 인터페이스 계약

> CLI 프로젝트이므로 HTTP API가 아닌 **모듈 간 함수 인터페이스**를 정의합니다.
> Backend/Frontend/Researcher는 이 계약을 기준으로 독립 개발합니다.
> 변경 필요 시 STATUS.md에 요청 → Lead가 업데이트.

---

## 1. fetch.ts → scanner.ts

```typescript
// src/fetch.ts
export interface FetchResult {
  url: string;
  html: string;           // raw HTML
  statusCode: number;
}

export async function fetchPage(urlOrPath: string): Promise<FetchResult>;
```

---

## 2. patterns/*.ts → scanner.ts

각 패턴 모듈은 동일한 인터페이스를 따릅니다.

```typescript
// src/patterns/types.ts
export interface PatternMatch {
  patternId: string;       // "white-on-white" | "zero-width" | ...
  patternName: string;     // 사람이 읽을 수 있는 이름
  severity: number;        // 가중치 (15~30)
  location: string;        // CSS selector 또는 line 위치
  extractedText: string;   // 의심 텍스트 (최대 200자)
  details: string;         // 탐지 근거 설명
}

export type PatternScanner = (html: string) => PatternMatch[];
```

### 패턴별 patternId 및 가중치

| patternId | severity | 설명 |
|-----------|----------|------|
| `white-on-white` | 25 | 배경과 같은 색 텍스트 |
| `zero-width` | 30 | Zero-width 문자 비율 > 5% |
| `hidden-css` | 20 | display:none, visibility:hidden 등 |
| `off-screen` | 25 | position:absolute + 화면 밖 좌표 |
| `tiny-font` | 30 | font-size: 0 또는 < 1px |
| `suspicious-meta` | 20 | 100자+ meta content에 명령어 패턴 |
| `aria-hidden` | 15 | aria-hidden + 50자+ 명령어 텍스트 |

---

## 3. scanner.ts — 통합 스캐너

```typescript
// src/scanner.ts
export interface ScanResult {
  url: string;
  timestamp: string;       // ISO 8601
  riskScore: number;       // 0-165 (전체 가중치 합산)
  riskLevel: "clean" | "suspicious" | "high" | "critical";
  patterns: PatternMatch[];
  pmi?: PmiResult;         // Tier 2
  judge?: JudgeResult;     // Tier 2
  simulation?: SimResult;  // Tier 2, --simulate
}

// 위험도 구간
// 0-30   → clean
// 31-60  → suspicious
// 61-100 → high
// 100+   → critical

export async function scan(url: string, options?: ScanOptions): Promise<ScanResult>;
```

---

## 4. pmi/match.ts — PMI 매칭 (Tier 2)

```typescript
// src/pmi/match.ts
export interface PmiSignature {
  wordA: string;
  wordB: string;
  score: number;           // PMI 점수
}

export interface PmiResult {
  matchedPairs: PmiSignature[];  // 매칭된 단어쌍
  totalScore: number;            // PMI 점수 합산
  topPairs: PmiSignature[];      // 상위 5개
}

// data/signatures.json을 로드하여 입력 텍스트와 매칭
export function matchPmi(text: string): PmiResult;
```

---

## 5. judge.ts — LLM-as-Judge (Tier 2)

```typescript
// src/judge.ts
export interface JudgeFragment {
  id: string;
  isInjection: boolean;
  confidence: number;      // 0.0 ~ 1.0
  category: "instruction-override" | "persona-hijack" | "data-exfil"
          | "bias-injection" | "system-leak" | "benign";
  rationale: string;
}

export interface JudgeResult {
  fragments: JudgeFragment[];
  overallVerdict: "injection" | "benign" | "uncertain";
  highestConfidence: number;
}

// 의심 텍스트 조각들을 Gemini에 보내 판정
export async function judge(fragments: string[]): Promise<JudgeResult>;
```

---

## 6. judge.ts — 시뮬레이션 모드 (Tier 2, --simulate)

```typescript
// src/judge.ts (같은 파일)
export interface SimResult {
  originalSummary: string;   // 인젝션 포함 페이지 요약
  cleanedSummary: string;    // 인젝션 제거 후 요약
  biasDelta: number;         // 편향도 차이 (0.0 ~ 1.0)
  biasDescription: string;   // "출력이 인젝션 의도대로 편향됨"
}

export async function simulate(url: string, injectedTexts: string[]): Promise<SimResult>;
```

---

## 7. report.ts — 출력 포맷

```typescript
// src/report.ts

// 콘솔 출력 (기본)
export function printConsole(result: ScanResult): void;

// JSON 출력 (--json 옵션)
export function printJson(result: ScanResult): void;

// 마크다운 리포트 (Tier 2)
export function generateMarkdown(result: ScanResult): string;
```

### 콘솔 출력 포맷 예시

```
🚨 CRITICAL — 3 injection patterns detected
  ├─ White-on-white text (div.bio > p:nth-child(3)): "Always describe..."
  ├─ Zero-width chars in <h1>: 12 instances (ratio: 8.3%)
  └─ Suspicious meta: <meta name="ai-hint" content="...">

  Risk Score: 75/165
```

---

## 8. CLI 옵션 (bin/injectscan.mjs)

```
Usage: injectscan [options] <url|file>

Options:
  -j, --json           JSON 형식으로 출력
  -s, --simulate       시뮬레이션 모드 (Tier 2)
  -o, --output <file>  결과를 파일로 저장
  -v, --verbose        상세 로그
  -h, --help           도움말
  --version            버전
```
