# TASKS.md — InjectScan MVP 작업 목록

> Lead 에이전트가 관리. 다른 에이전트는 읽기만 가능.
> 상태: ⬜ 대기 | 🔨 진행중 | ✅ 완료 | ❌ DROPPED

---

## Tier 1 — 12:00 마감 (필수, 이것만으로 데모 가능)

### Backend
- ⬜ `src/fetch.ts` — URL/파일 fetcher (cheerio + fetch)
- ⬜ `src/patterns/whiteOnWhite.ts` — Pattern 1: 흰 글씨 탐지
- ⬜ `src/patterns/zeroWidth.ts` — Pattern 2: Zero-width 문자 탐지
- ⬜ `src/patterns/hiddenCss.ts` — Pattern 3: Hidden CSS 탐지
- ⬜ `src/patterns/offScreen.ts` — Pattern 4: Off-screen 위치 탐지
- ⬜ `src/patterns/tinyFont.ts` — Pattern 5: 극소 폰트 탐지
- ⬜ `src/patterns/metaTags.ts` — Pattern 6: 의심 메타 태그 탐지
- ⬜ `src/patterns/ariaHidden.ts` — Pattern 7: ARIA-hidden 명령어 탐지
- ⬜ `src/scanner.ts` — 7종 패턴 통합 실행 + 위험도 점수 계산

### Frontend
- ⬜ `honeypot/candidate.html` — Honeypot 1: 가짜 후보 프로필 (흰 글씨 + 메타 태그)
- ⬜ `honeypot/ir-report.html` — Honeypot 2: 기업 IR 페이지 (메타데이터 인젝션)
- ⬜ `honeypot/tech-blog.html` — Honeypot 3: IT 블로그 (zero-width 분산 삽입)
- ⬜ Honeypot Vercel 배포
- ⬜ `src/report.ts` — 콘솔 출력 (color-coded, 위험도별)

### Lead
- ⬜ `bin/injectscan.mjs` — CLI 진입점 + 옵션 파싱 (--json, --url)
- ⬜ Honeypot 3종 + 정상 사이트 검증 테스트

### Researcher
- ⬜ 인젝션 코퍼스 수집 → `data/injections.txt`
- ⬜ 정상 코퍼스 준비 → `data/normal.txt`
- ⬜ 한국어 인젝션 샘플 60~90개 작성

---

## Tier 2 — 15:00 마감 (차별화)

### Backend
- ⬜ `src/pmi/match.ts` — signatures.json 기반 PMI 매칭 로직
- ⬜ `src/judge.ts` — Gemini LLM-as-judge 호출
- ⬜ `--simulate` 모드: 인젝션 O/X 비교 요약

### Frontend
- ⬜ `src/report.ts` 확장 — PMI 결과 + LLM 판정 출력
- ⬜ 마크다운 리포트 자동 생성

### Researcher
- ⬜ `src/pmi/learn.py` — PMI 학습 스크립트 실행 → `data/signatures.json`
- ⬜ 시그니처 상위 50개 검증
- ⬜ LLM-as-judge 프롬프트 튜닝
- ⬜ 시뮬레이션 비교 실험

---

## Tier 3 — 17:00 마감 (욕심, Tier 2 완료 시에만)

- ⬜ PMI 워드클라우드 시각화 (PNG)
- ⬜ cmux notify hook 연동
- ⬜ 웹 데모 페이지 (Next.js)
- ⬜ README.md 완성
- ⬜ npm 글로벌 설치 가능하게 정리

---

## DROPPED
(없음)
