# CLAUDE.md — InjectScan 멀티 에이전트 규칙

## 프로젝트
- **InjectScan**: 웹페이지/문서의 숨겨진 AI 프롬프트 인젝션을 자동 탐지하는 CLI
- CMUX x AIM 해커톤 (2026-04-26), AI Safety & Security 트랙
- 3-layer 다중 방어: 정적 패턴 7종 + PMI 통계 시그니처 + LLM-as-judge

## 스택
- Node.js CLI (commander + chalk + cheerio)
- Next.js (Tier 3 웹 데모 페이지 + honeypot 호스팅용)
- Gemini API (LLM-as-judge + simulation)
- Python (PMI 학습 스크립트만)

## 에이전트 역할 및 디렉토리 경계 (절대 규칙)

### Lead
- 수정 가능: `bin/`, `src/scanner.ts`, `TASKS.md`, `API_CONTRACT.md`, `STATUS.md`, `README.md`, `package.json`, `tsconfig.json`
- 역할: CLI 진입점, 모듈 통합, 30분 merge, 최종 테스트

### Frontend
- 수정 가능: `honeypot/`, `src/report.ts`, `src/app/` (웹 데모), `public/`
- 읽기만: `API_CONTRACT.md`, `STATUS.md`, `src/scanner.ts` (ScanResult 타입 참조)
- 역할: Honeypot 제작, 콘솔/JSON/마크다운 출력, 웹 데모 페이지

### Backend
- 수정 가능: `src/fetch.ts`, `src/patterns/*`, `src/pmi/match.ts`, `src/judge.ts`
- 읽기만: `API_CONTRACT.md`, `STATUS.md`
- 역할: 스캔 엔진 코어 (패턴 7종 + PMI 매칭 + LLM-as-judge)

### Researcher (Gemini CLI)
- 수정 가능: `data/*`, `src/pmi/learn.py`, `RESEARCH_NOTES.md`
- 역할: 코퍼스 수집/정리, PMI 학습, 프롬프트 튜닝, 블로커 조사

## 충돌 방지 규칙
- 공유 파일 (`package.json`, `tsconfig.json`, `src/scanner.ts`)은 Lead만 수정
- 패키지 추가 → STATUS.md에 요청 → Lead가 통합
- merge 충돌은 Lead만 해결

## 핵심 인터페이스
- 모든 패턴 모듈은 `PatternScanner` 타입을 따름 (`src/patterns/types.ts`)
- `ScanResult`가 모듈 간 데이터 교환 중심 (`src/scanner.ts`)
- 상세 계약은 `API_CONTRACT.md` 참조

## 명령어
- `npm run scan -- <url>` — CLI 실행
- `npm run dev` — Next.js 개발 서버 (웹 데모)
- `npm run lint` — 린트
