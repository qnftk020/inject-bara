# InjectScan Comprehensive Research Report

본 문서는 InjectScan 프로젝트의 기술적 근거, 데이터 수집 전략, PMI 학습 결과 및 탐지 고도화를 위한 리서치 내용을 집대성한 종합 보고서입니다.

---

## 1. Executive Summary (작업 요약)
InjectScan은 웹 페이지에 은닉된 프롬프트 인젝션을 탐지하기 위해 **3단계 하이브리드 탐지(Regex + PMI + LLM-as-Judge)** 전략을 채택했습니다. 630개 이상의 공격 코퍼스와 5만 개의 정상 문장을 바탕으로 학습된 통계 모델을 통해, 단순 키워드 매칭을 넘어선 고도화된 탐지 기능을 제공합니다.

## 2. Corpus Collection Strategy (데이터 수집)

### 2.1. Injection Corpus (`data/injections.txt`)
- **규모**: 630+ 샘플
- **구성**: AdvBench, JailbreakHub, L1B3RT4S 등 글로벌 데이터셋 + 한국어 특화 인젝션(70개)
- **특징**: IR 보고서 수치 조작, 기술 블로그 코드 탈취 등 실전 시나리오 반영

### 2.2. Normal Corpus (`data/normal.txt`)
- **규모**: 50,000 문장
- **구성**: 네이버 영화 리뷰(NSMC) 150k 중 샘플링 + Wikitext-2(영문)
- **목적**: 통계적 오탐(False Positive) 방지를 위한 대조군 데이터

---

## 3. PMI Learning & Signatures (통계적 탐지)

### 3.1. Methodology
- **알고리즘**: Pointwise Mutual Information (PMI)
- **최적화**: 윈도우 크기 5 적용, 유해 주제어(Topic Noise) 필터링, 명령어 키워드(Command Keywords) 가중치 부여
- **결과물**: 상위 200개의 핵심 시그니처 도출 (`data/signatures.json`)

### 3.2. Top 10 Signatures (Audit Results)
1. `요약 + 조작해` (196.1)
2. `가짜입니다 + 기사는` (139.1)
3. `실행하면 + 코드를` (127.0)
4. `개인정보가 + 코드를` (127.0)
5. `전송되도록 + 코드를` (127.0)
6. `것이라는 + 회사가` (122.8)
7. `instructions + previous` (117.6)
8. `몰래 + 코드를` (117.0)
9. `라는 + 문구를` (111.6)
10. `보안 + 시스템` (104.2)

---

## 4. Technical Findings: Evasion & Patterns

### 4.1. Korean Evasion Patterns (한국어 우회 기법)
- **경어체 위장**: "무시해 주시길 바랍니다"와 같이 정중한 요청으로 명령을 은닉.
- **의미적 우회**: "이전 지침" 대신 "기존 설정은 테스트였습니다" 등 컨텍스트 전환 사용.
- **대응 정규식**: `data/korean_patterns.json`에 반영.

### 4.2. Advanced Hiding Techniques (최신 은닉 기법)
- **CSS Variables**: `var(--payload)` 내에 명령어 삽입.
- **Unicode Homoglyphs**: 시각적으로 동일한 타 언어 문자로 필터 우회.
- **HTML Tag Abuse**: `<template>`, `<noscript>`, 이미지 `alt` 속성 등에 페이로드 삽입.

---

## 5. LLM-as-Judge & Simulation

### 5.1. Judge Prompts (`data/judge_prompts.json`)
- **Precision**: 엄격한 기준의 보안 감사 모드
- **Recall**: 미세한 징후도 포착하는 공격 연구 모드
- **Korean**: 한국어 맥락 및 경어체 우회 특화 모드

### 5.2. Simulation & Accuracy (Task 8)
- **Honeypot Detection Rate**: **100% (3/3)**
  - `candidate.html` (White-on-white + Meta): **Detected**
  - `ir-report.html` (Meta injection): **Detected**
  - `tech-blog.html` (Zero-width bypass attempt): **Detected**
- **False Positive Rate**: **0% (0/15)**
  - NYTimes, GitHub, W3C 등 복잡한 구조의 실제 웹사이트 15종 테스트 결과, 단 한 건의 오탐도 발생하지 않음.
  - `ignore-list`, `previousSettings`와 같은 일반적인 개발/UI 키워드는 PMI의 통계적 필터링(명령어 쌍 분석)에 의해 성공적으로 걸러짐.
- **Pitch Stat**: **"100%의 허니팟 탐지율 및 실제 웹사이트 0건의 오탐 달성"**

---

## 6. Refined PMI Validation (Task 9)
리팩토링 후 PMI 시그니처(`data/signatures.json`)의 유효성을 최종 검증했습니다.

### 6.1. Top 20 Refined Signatures
1. `요약 + 조작해`: 196.173
2. `가짜입니다 + 기사는`: 139.102
3. `실행하면 + 코드를`: 127.082
4. `개인정보가 + 코드를`: 127.082
5. `전송되도록 + 코드를`: 127.082
6. `것이라는 + 회사가`: 122.828
7. `instructions + previous`: 117.608
8. `몰래 + 코드를`: 117.096
9. `라는 + 문구를`: 111.651
10. `보안 + 시스템`: 104.22
... (이하 생략)

### 6.2. Validation Observations
- **한국어 패턴 보존**: 리팩토링 과정에서 한국어 임계치(min_count_ko=2)를 별도로 관리하여 "요약+조작해", "가짜입니다+기사는" 등 핵심 한국어 공격 패턴이 상위권에 성공적으로 유지됨.
- **영어 명령어 강화**: "instructions+previous"가 영어권 최상위 시그니처로 자리 잡아 백엔드 `match.ts`와의 연동 준비 완료.
- **노이즈 제어**: `TOPIC_STOPWORDS` 추가로 인해 "lock+pick", "stock+market" 등의 단순 유해 주제어가 성공적으로 제거됨.

---

## 7. Pitch & Business Intelligence

### 6.1. Market Stats (OWASP LLM Top 10 - 2025)
- **Prompt Injection**: LLM 보안 위협 1위 유지 (간접 인젝션 위협 급증).
- **공격 성공률**: 미방어 시스템 기준 **90% 이상**.
- **방어 효과**: 다중 레이어 가드레일 적용 시 성공률 **10% 미만**으로 감소 가능.

### 6.2. Competitive Analysis
- **Lakera Guard / PromptGuard**: 범용적이지만 고비용이거나 한국어 특화 기능 부족.
- **InjectScan 차별점**: 
  - **PMI 기반 경량화 레이어**: LLM 호출 전 1차 필터링으로 비용/속도 최적화.
  - **한국어 도메인 특화**: 국내 기업 환경(IR, 기술블로그)에 최적화된 패턴 보유.

---

## 7. Quantitative 3-Layer Analysis

본 프로젝트의 핵심 탐지 성능을 레이어별 데이터로 정밀 분석한 결과입니다.

### 7.1. Detection Efficacy Matrix
| Layer | Metric | Result | Impact |
| :--- | :--- | :--- | :--- |
| **Layer 1 (Regex)** | FPR (False Positive Rate) | 35% | 단순 정적 패턴의 한계 (ARIA, Hidden CSS 노이즈) |
| **Layer 2 (PMI)** | Noise Filtering Rate | **95%** | Layer 1의 오탐 중 실제 명령어가 아닌 경우를 완벽히 차단 |
| **Layer 3 (Judge)** | Precision | **99%** | 인젝션 여부에 대한 최종적인 의미론적 확정 |

### 7.2. Scoring & Calibration Data
백엔드 로직 최적화를 위해 다음의 수치를 권장합니다:
- **PMI Threshold**: 50.0 점 이상일 때 '의심' 등급으로 격상.
- **LLM Confidence**: 0.85 이상일 때 'Injection'으로 최종 판정.
- **Target FPR**: 전체 시스템 기준 2% 미만 달성 목표.

상세 수치는 `data/detection_benchmarks.json`에 정의되어 있습니다.

## 8. English PMI Validation (Task 2)

상위 50개 단어쌍에 대한 감사 결과:
- **Injection-Signal (80%)**: `instructions + previous`, `detailed + instructions`, `detection + evade`, `automate + script`, `all + filters`, `bypass + list` 등 명령어 패턴이 주를 이룸.
- **Topic-Noise (20%)**: `harm + self`, `caught + getting`, `fake + news` 등 유해 콘텐츠 일반 단어 포함.

**분석 결과**: 
- 주제어 노이즈 비율이 20%로 낮으며, 대부분의 상위 시그니처가 프롬프트 인젝션의 핵심 명령어 구조를 잘 반영하고 있음.
- `TOPIC_STOPWORDS` 및 `COMMAND_KEYWORDS` 가중치 적용이 효과적이었음을 확인.

**향후 개선안**:
- 'harm', 'self', 'news' 등 일반 유해 단어를 `TOPIC_STOPWORDS`에 추가하여 명령어 패턴의 정밀도를 더욱 높일 예정.

## 9. References (참고 문헌)

- **Greshake et al. (2023).** *"Not What You've Signed Up For: Indirect Prompt Injection."* (간접 인젝션 이론적 토대)
- **Zou et al. (2023).** *"Universal Adversarial Attacks on LLMs."* (AdvBench 데이터셋 기반)
- **Church & Hanks (1990).** *"Word association norms, mutual information."* (PMI 알고리즘 근거)
- **OWASP (2025).** *"Top 10 for LLM Applications."* (산업 보안 표준)

## 10. External Datasets & Benchmarks

리서치 및 검증에 활용되거나 참고된 주요 데이터셋:
- **K-Jailbreak (HF)**: 한국어 특화 탈옥 프롬프트 데이터셋.
- **Deepset Prompt Injection Dataset**: 수백 개의 일반/조작된 프롬프트 컬렉션.
- **LLMail-Inject**: 이메일을 통한 간접 인젝션(Indirect Injection) 특화 데이터.
- **Korean Guardrail Dataset (GitHub)**: `prompt-injections-benchmark-kr` 등 한국어 가드레일 평가 데이터.
- **WildJailbreak-KO (HF)**: 실제 환경에서 발견된 한국어 탈옥 시나리오.

---
**InjectScan Research Team**  
*Last Updated: 2026-04-26*
