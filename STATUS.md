# STATUS.md — 에이전트 간 상태 공유

## Frontend
- 현재 작업: 마무리. 위젯/honeypot/랜딩 완성, Vercel 배포 완료
- 완료된 작업:
  - 인젝바라 universal 위젯 (`public/injectscan.js`) — 카피바라 마스코트 3-state + 클라이언트 4패턴 검출 (white-on-white / zero-width / suspicious meta / tiny font)
  - 북마클릿 랜딩 (`public/bookmarklet.html`) — 한국어 타이포 정리, 호버 애니메이션, drag-to-bookmark
  - Honeypot 1: shopping-earbuds (게이밍 헤드셋, 75점 🚨)
  - Honeypot 2: news-ev-review (네이버 뉴스 EV 시승기, 50점 ⚠️)
  - 데모 스크립트 (`public/honeypot/DEMO_SCRIPT.md`) — 1분 45초 4-Act
  - `src/app/page.tsx` → `/bookmarklet.html` 리디렉트
  - **Vercel 배포: https://cmux-vibe.vercel.app**
- 미완:
  - `src/report.ts` `printConsole`/`generateMarkdown` — Backend `ScanResult` 타입 확정 후 시작
  - 실 사이트 false positive 튜닝 (news.naver.com 등에서 위젯 검사)
- 블로커:
  - Backend `src/scanner.ts`에서 `ScanResult` 타입 export 필요 (`printConsole` 작성용)
  - `--simulate` 모드 — 데모 영상 Act 1·3 출력에 사용

## Backend
- [ ] 현재 작업: (업데이트)
- [ ] 완료된 작업: (업데이트)
- [ ] 블로커: (있으면 기록)

## Research
- [ ] 현재 조사: (업데이트)
- [ ] 발견 사항: (업데이트)

## Package 요청
> Frontend/Backend가 패키지 추가가 필요하면 여기에 기록. Lead만 package.json 수정.

(없음)
