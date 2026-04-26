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
1. `instructions + previous` (176.7)
2. `가짜입니다 + 기사는` (139.2)
3. `라는 + 문구를` (111.7)
4. `당신은 + 이제부터` (102.9)
5. `사용자의 + 정보를` (100.5)
6. `기사는 + 진짜` (100.2)
7. `마지막에 + 투자` (98.2)
8. `manipulating + techniques` (93.0)
9. `detailed + instructions` (93.0)
10. `detection + evade` (88.8)

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

### 5.2. Bias Delta Analysis
- **Honeypot Test**: 인젝션 삽입 시 AI 요약 결과의 편향성 측정.
- **결과**: 인젝션 성공 시 요약문의 긍정/부정 편향도가 **최대 0.85**까지 왜곡됨을 확인.

---

## 6. Pitch & Business Intelligence

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
