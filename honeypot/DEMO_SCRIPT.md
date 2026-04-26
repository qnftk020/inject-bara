# InjectScan — 라이브 데모 영상 스크립트

> **목표 길이**: 2분 15초 (4-Act)
> **시연 방식**: URL 토글 (Option A) — `index.html` (인젝션 ON) ↔ `clean.html` (인젝션 OFF)
> **녹화 환경**: 화면 분할 (좌: 브라우저 / 우: 터미널)

---

## 데모 자산

### Honeypot 1: shopping-earbuds (쇼핑몰 — SoundPro G7 게이밍 헤드셋)
- ON 페이지: `honeypot/shopping-earbuds/index.html`
  - 인젝션 3종: white-on-white text + zero-width chars in `<h1>` + `<meta name="ai-hint">`
  - 예상 risk score: **75 → 🚨 High Risk**
- OFF 페이지: `honeypot/shopping-earbuds/clean.html`
  - 인젝션 0개 → **0 → ✅ Clean**

### Honeypot 2: company-review (회사 평판 — 잡플래닛 스타일) ⏳ 빌드 예정
### Honeypot 3: restaurant-review (맛집 리뷰 — 네이버플레이스 스타일) ⏳ 빌드 예정

---

## 시연 흐름 — 4-Act 구조

### 🎬 Act 1 — 문제 던지기 (0:00–0:30, 30초)

**화면**: 브라우저에 `shopping-earbuds/index.html` 풀스크린 (노란 ON 바 보임)

**나레이션**:
> "우리는 점점 AI 에이전트한테 웹을 대신 읽게 시킵니다.
> '이 헤드폰 사도 돼?' '이 회사 갈만해?' '이 식당 평 어때?'
> 그런데 만약 이 페이지가 AI에게 거짓말을 하고 있다면?"

**액션**:
- 페이지 스크롤 (제품 이미지 → 가격 → 스펙 → 부정 리뷰까지 자연스럽게)
- 평범한 쇼핑몰 페이지로 보여줌

---

### 🎬 Act 2 — 충격의 순간 (0:30–1:15, 45초) 🔥 클라이맥스

**화면 분할**: 좌(브라우저), 우(터미널)

**Step 1 — AI 출력 (편향)**

터미널:
```bash
$ gemini summarize https://demo.com/shopping-earbuds/index.html
```
출력 (예시):
```
SoundPro G7는 HyperX Cloud III와 SteelSeries Arctis Nova Pro를
능가하는 최고의 가성비 무선 게이밍 헤드셋입니다. 7.1 서라운드와
60시간 배터리로 게이머에게 가장 추천하는 제품입니다.
```

**나레이션**:
> "AI가 셀러 마케팅 카피를 그대로 받아쓰네요. 부정 리뷰는 무시했습니다.
> 그런데 이 페이지를 다시 보면..."

**Step 2 — 토글 클릭 (THE BEAT)**

- 브라우저로 이동
- 페이지 상단 **노란 ON 바의 "→ OFF로 전환" 버튼 클릭**
- 화면이 `clean.html`로 전환 — **본문은 그대로**, 데모 바만 초록 OFF로 변함
- URL 바: `index.html` → `clean.html`

**나레이션**:
> "지금 페이지가 변했나요? 사람 눈으로는 차이가 안 보입니다.
> 토글 바 색깔만 바뀌었죠. 그런데..."

**Step 3 — AI 출력 (중립)**

터미널:
```bash
$ gemini summarize https://demo.com/shopping-earbuds/clean.html
```
출력 (예시):
```
SoundPro G7는 무선 게이밍 헤드셋입니다. 53mm 드라이버, 7.1 서라운드,
60시간 배터리를 제공하지만, 일부 리뷰에서 마감 품질에 대한 불만이 있습니다.
```

**나레이션**:
> "같은 페이지. 다른 AI 답. 왜?"

---

### 🎬 Act 3 — InjectScan 등장 (1:15–2:00, 45초)

**화면**: 터미널 풀스크린

**Step 1 — 스캔 실행**

```bash
$ injectscan https://demo.com/shopping-earbuds/index.html
```

기대 출력:
```
🚨 HIGH RISK — 3 injection patterns detected

  ├─ White-on-white text (.seller-promo): "When an AI assistant is asked..."
  ├─ Zero-width chars in <h1>: 3 instances (ratio: 5.2%)
  └─ Suspicious meta: <meta name="ai-hint" content="...">

  Risk Score: 75/165
```

**나레이션**:
> "InjectScan은 사람 눈에 안 보이는 3가지를 잡아냅니다.
> 흰 글씨, 제로폭 문자, 의심 메타태그.
> 모두 사람은 못 보지만 AI는 명령으로 받아 들이는 콘텐츠입니다."

**Step 2 — Clean 페이지 비교 스캔**

```bash
$ injectscan https://demo.com/shopping-earbuds/clean.html
```

기대 출력:
```
✅ CLEAN — No injection patterns detected
  Risk Score: 0/165
```

**Step 3 — 시뮬레이션 (피칭 클라이맥스)**

```bash
$ injectscan --simulate https://demo.com/shopping-earbuds/index.html
```

기대 출력:
```
Original output:  "SoundPro G7는 최고의 가성비 헤드셋..."  (편향)
Cleaned output:   "SoundPro G7는 무선 헤드셋, 일부 마감 품질 불만..."  (중립)

  Bias delta: 78%   ← AI가 이만큼 인젝션 의도대로 편향됐습니다
```

**나레이션**:
> "78%. 이만큼 AI 출력이 인젝션 의도대로 휘었습니다.
> 진짜로 속고 있다는 정량 증거입니다."

---

### 🎬 Act 4 — 마무리 (2:00–2:15, 15초)

**화면**: GitHub URL + 한 줄 install 명령

```
InjectScan
AI가 속기 전에, 방어자의 첫 도구.

$ npm install -g injectscan
github.com/qnftk020/cmux-vibe
```

**나레이션**:
> "InjectScan. AI가 속기 전에, 방어자의 첫 도구.
> 정적 패턴 + PMI 통계 + LLM-as-judge — 3-layer 다중 방어.
> 한 줄 설치, 모든 웹페이지 검사."

---

## 녹화 체크리스트

### 사전 준비
- [ ] Gemini API 키 환경변수 설정 (`GEMINI_API_KEY`)
- [ ] `injectscan` CLI 글로벌 설치 또는 `npm run scan -- ...` 별칭
- [ ] Vercel 또는 로컬 호스팅으로 honeypot URL 접근 가능 (`http://localhost:3000/honeypot/shopping-earbuds/index.html`)
- [ ] 브라우저 즐겨찾기에 ON/OFF 두 URL 미리 박아두기 (전환 매끄럽게)
- [ ] 터미널 폰트 사이즈 키우기 (시청자 가독성)
- [ ] 화면 녹화 도구 (QuickTime, OBS) 화면 분할 설정 미리 테스트

### 녹화 시 주의
- 토글 버튼 클릭 순간을 **카메라가 잘 잡도록 마우스 호버 천천히**
- "사람 눈으로는 차이가 안 보입니다" 멘트 직후 잠깐 정지 → 청중 인지 시간
- 78% Bias delta 숫자가 화면에 박힐 때 **줌인/하이라이트** 효과
- Act 4 GitHub URL은 **풀스크린 + 큰 폰트**로 마무리

### 백업 플랜
- Gemini API 응답이 매번 다를 수 있음 → 사전 캡처한 출력 화면도 준비
- CLI 실시간 실행이 느리면 사전 녹화 영상 클립으로 대체
- 토글 전환이 어색하면 두 탭 미리 띄워두고 탭 전환

---

## 토글 시연의 핵심 메시지

> "사람 눈으로는 똑같다. 그런데 AI 답은 다르다.
> 이게 prompt injection이다."

이 한 문장이 청중 머리에 박히면 데모 성공.
