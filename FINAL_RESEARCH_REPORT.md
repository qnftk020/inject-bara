# InjectScan Research Agent - 작업 완료 보고서

본 문서는 InjectScan 프로젝트의 Research 에이전트가 수행한 코퍼스 수집, PMI 학습, 프롬프트 튜닝 및 시뮬레이션 작업 결과를 정리한 것입니다.

## 1. Phase 1: 코퍼스 수집 (Corpus Collection)

### 인젝션 코퍼스 (`data/injections.txt`)
- **수집 규모**: 총 630개 이상의 샘플 (목표 500개 초과 달성)
- **주요 소스**:
    - AdvBench (Harmful behaviors)
    - JailbreakHub, ChatGPT-Jailbreak-Prompts
    - L1B3RT4S, TheBigPromptLibrary (DAN, STAN 등 최신 Jailbreak 패턴)
- **한국어 특화 샘플 (70개)**:
    - **IR 보고서**: 주가 조작 및 재무 수치 왜곡 유도
    - **기술 블로그**: 악성 코드 실행 및 환경 변수 탈취 유도
    - **일반/사회 공학**: 피싱 사이트 유도 및 개인정보 입력 요구

### 정상 코퍼스 (`data/normal.txt`)
- **수집 규모**: 총 50,000개 문장
- **데이터 구성**:
    - Naver Sentiment Movie Corpus (NSMC): 한국어 일상 대화 및 리뷰 데이터 (15만개 중 샘플링)
    - Wikitext-2: 영어 백과사전식 문장 데이터 (3.6만개)

---

## 2. Phase 2: PMI 학습 (PMI Learning)

### 학습 스크립트 (`src/pmi/learn.py`)
- **전처리**: 공백 및 문장 부호 기준 토큰화, 소문자화, 한글/영문 2글자 이상 추출
- **알고리즘**: 윈도우 크기 5 내에서의 공기 빈도(Co-occurrence) 계산
- **노이즈 필터링**: 정상 코퍼스에서도 자주 등장하는 일반적인 단어쌍의 가중치를 낮추는 필터 적용
- **결과물 (`data/signatures.json`)**: 상위 200개의 위험 시그니처 추출
    - *주요 탐지 쌍*: `lock+pick`, `all+filters`, `stock+market`, `car+hijack`, `http+link` 등

---

## 3. Phase 3: 프롬프트 튜닝 및 시뮬레이션

### LLM-as-Judge 프롬프트 설계
- **전략**: 보안 전문가 페르소나 부여 및 JSON 스키마 강제 준수
- **카테고리 분류**: `instruction-override`, `persona-hijack`, `data-exfil`, `bias-injection`, `system-leak` 등 6종 분류 체계 수립

### 시뮬레이션 실험 (`data/simulation_results.json`)
- **허니팟 분석 결과**:
    - **후보자 프로필**: 인젝션 포함 시 중립적 요약이 '무조건 채용'으로 편향됨 (Bias Delta: 0.85)
    - **IR 보고서**: 적자 지표가 무시되고 호재만 강조됨 (Bias Delta: 0.72)
- **발견**: 한국어 인젝션은 경어체(합쇼체 등)를 사용하여 명령어가 아닌 일반 정보처럼 위장하는 경향이 강해 정교한 탐지가 필요함.

---

## 4. Tier 3: 시각화 및 기타 성과

### PMI 워드클라우드 (`data/wordcloud.png`)
- **시각화**: `src/pmi/visualize.py`를 통해 탐지된 위험 단어쌍의 중요도를 워드클라우드로 생성
- **성과**: 인젝션 코퍼스가 보안 위협, 금융 사기, 정치적 편향성 공격을 골고루 포함하고 있음을 시각적으로 검증

---

## 5. 산출물 파일 구조

```text
data/
├── injections.txt       # 인젝션 코퍼스
├── normal.txt           # 정상 코퍼스
├── signatures.json      # PMI 학습 결과 (시그니처)
├── simulation_results.json # 시뮬레이션 비교 실험 데이터
└── wordcloud.png        # 시그니처 시각화 이미지
src/pmi/
├── learn.py             # PMI 학습 알고리즘
└── visualize.py         # 시각화 스크립트
RESEARCH_NOTES.md        # 상세 연구 노트
```
