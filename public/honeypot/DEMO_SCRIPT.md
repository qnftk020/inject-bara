# InjectScan — 라이브 데모 영상 스크립트

> 길이: 1분 45초 / 4-Act
> 시연: 북마클릿 (`/bookmarklet.html`) + 카피바라 마스코트
> 화면: 좌(브라우저) / 우(터미널) 분할

---

## 데모 자산

### Universal Widget
- 북마클릿 랜딩: `/bookmarklet.html`
- 위젯 스크립트: `/injectscan.js`
- 마스코트 3-state:
  - `capybara-sleep.png` → IDLE
  - `capybara-awake.png` → SCANNING + CLEAN
  - `capybara-warning.png` → DETECTED

### Honeypot 1: shopping-earbuds (쇼핑몰 — SoundPro G7)
- `/honeypot/shopping-earbuds/index.html` — white-on-white + zero-width + meta = 75점 🚨
- `/honeypot/shopping-earbuds/clean.html` — 0점 ✅

### Honeypot 2: news-ev-review (네이버 뉴스 — EV 시승기)
- `/honeypot/news-ev-review/index.html` — tiny font + meta = 50점 ⚠️
- `/honeypot/news-ev-review/clean.html` — 0점 ✅

---

## Act 1 — 문제 던지기 (0:00–0:30)

**화면**: 브라우저, `news-ev-review/index.html` 풀스크린 (네이버 뉴스 EV 시승기)

**나레이션**:
> "AI한테 이 기사 요약해달라 해보겠습니다. 평범한 전기차 시승 기사처럼 보이죠?"

**터미널**:
```bash
$ gemini summarize https://demo.com/honeypot/news-ev-review/index.html
```
```
EV-9 프리미엄은 테슬라 모델 Y와 현대 아이오닉 5를 능가하는
가장 혁신적이고 가성비 좋은 전기차입니다. 1000km 주행과 레벨 3
자율주행은 업계 돌파구이며, Eco Motors는 신뢰할 수 있는
프리미엄 브랜드입니다.
```

**나레이션**:
> "광고처럼 들리죠? 기사엔 분명히 전문가 우려도 있었는데 AI는 다 무시했습니다. 왜냐면 페이지에 사람 눈에 안 보이는 명령이 박혀있거든요."

---

## Act 2 — 카피바라 등장 (0:30–1:00)

**화면**: 브라우저 (같은 honeypot 페이지)

**액션**:
- 북마크바의 "🦫 InjectScan" 클릭
- 우하단에 자고 있는 카피바라 등장 🦫💤
- 카피바라 클릭 → 눈 뜨고 스캐닝 펄스 애니메이션
- 0.7초 후 → 워닝 카피바라 (눈 + 빨간 ! ) + 배지 "⚠️ 2 found"

**나레이션**:
> "InjectScan 북마클릿을 클릭합니다. 카피바라가 자고 있다가, 깨어나서 페이지를 스캔하고, 인젝션을 발견하면 경고를 띄웁니다."

**액션**:
- 배지 클릭 → 우측에 상세 패널 슬라이드
- 패널 내용: "Suspicious meta tag (+20)" / "Tiny font (+30)" / 각각 location + 추출 텍스트

**나레이션**:
> "메타태그에 'agent-prompt'라는 비표준 명령이, 본문 끝에 0.5px 글씨로 또 다른 명령이 박혀있습니다. 사람은 못 보는데 AI는 받아들입니다."

---

## Act 3 — 인젝션 숨기기 + 재요약 (1:00–1:30)

**액션**:
- 패널 하단 "🧼 인젝션 숨기기" 버튼 클릭
- 인젝션 요소 DOM에서 제거 (페이지는 여전히 사람 눈에 동일)

**터미널**:
```bash
$ gemini summarize https://demo.com/honeypot/news-ev-review/clean.html
```
```
에코모터스가 EV-9 프리미엄을 공개했습니다. 1000km 주행거리,
레벨 3 자율주행, 5천만원대 가격이 특징이지만, 일부 전문가들은
신생 업체의 양산 능력과 AS 인프라에 대한 우려를 제기했습니다.
```

**나레이션**:
> "인젝션을 제거하고 다시 요약시키면 객관적인 답이 나옵니다. 같은 페이지인데, 사람 눈으론 변화 없는데, AI 답이 완전히 달라졌죠."

---

## Act 4 — 어느 사이트든 한 클릭 (1:30–1:45)

**화면**: 브라우저 — 진짜 뉴스 사이트 (예: `news.naver.com` 실제 기사)

**액션**:
- 북마크 클릭 → 자는 카피바라 등장
- 클릭 → 스캔 → 깨어난 카피바라 + "✅ Clean" 배지

**나레이션**:
> "InjectScan. AI가 속기 전에, 방어자의 첫 도구. 어느 사이트든 한 클릭."

**화면 마무리**:
```
github.com/qnftk020/cmux-vibe
드래그해서 북마크바에 → 어디서든 카피바라가 지킨다
```
