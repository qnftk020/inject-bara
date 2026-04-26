# STATUS.md — 에이전트 간 상태 공유

## Frontend
- [ ] 현재 작업: (업데이트)
- [ ] 완료된 작업: (업데이트)
- [ ] 블로커: (있으면 기록)

## Backend
- [x] 완료: Layer 1 패턴 7종, CLI 연결, report.ts, judge.ts, PMI match, 영어/한국어 패턴 통합
- [ ] 블로커: **403 봇 차단 사이트 스캔 불가** (아래 상세)

### 블로커: HTTP 403 봇 차단 대응
일부 사이트(Cloudflare, Akamai 등 WAF 사용)에서 fetch 요청이 403으로 차단됨.
브라우저 User-Agent로 변경해도 차단됨 (JS challenge 기반 방어 추정).

**테스트 결과:**
- virtualdojolab.com → OK
- open.spotify.com → OK
- bigfishaudio.com → **403 차단**

**검토 필요한 해결 방안:**
1. **Playwright headless browser** — JS 렌더링 + cookie 자동 처리로 대부분 우회 가능. 단, 설치 무겁고 느림.
2. **Puppeteer stealth plugin** — Playwright보다 가볍고 stealth 플러그인으로 봇 탐지 회피.
3. **--browser 플래그** — 기본은 cheerio(빠름), 403 시 자동 또는 수동으로 headless browser 폴백.
4. **사전 렌더링 서비스** — 외부 API(ScrapingBee 등) 활용. 비용 발생.
5. **에러 메시지 개선** — 최소한 "이 사이트는 봇 방어가 활성화되어 있습니다. --browser 옵션으로 재시도하세요" 안내.

**추천:** 데모 시간 고려 시 옵션 3 (--browser 플래그 + Playwright 폴백)이 현실적.
Playwright는 이미 Node.js 생태계에서 검증됨. 시간 부족 시 옵션 5 (에러 메시지 개선)만이라도.

## Research
- [x] Phase 1: Corpus Collection 완료 (630+ injections, 50k normal sentences)
- [x] Phase 2: PMI Learning 완료 (src/pmi/learn.py -> data/signatures.json)
- [x] Task 1-3: PMI 시그니처 정밀화, 한국어 우회 패턴, Judge 프롬프트 다변화 완료
- [x] Task 4-6: 영어 패턴 연구, 오탐 검증용 URL셋, 피칭 레퍼런스 수집 완료
- [x] Task 7-9: 데모용 허니팟(3종) 제작 및 최종 성능 지표(탐지율 100%) 확보 완료
- [x] 발견 사항: "허니팟 탐지율 100%, 실제 사이트 오탐 0건" 달성. 모든 연구 결과는 RESEARCH_REPORT.md에 통합됨.

## Package 요청
> Frontend/Backend가 패키지 추가가 필요하면 여기에 기록. Lead만 package.json 수정.

(없음)
