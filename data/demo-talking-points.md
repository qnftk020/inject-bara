# InjectScan Research Demo Talking Points

## 1. Key Statistics
- **Injection Corpus Size:** 630+ diverse samples (AdvBench, JailbreakHub, L1B3RT4S).
- **Normal Corpus Size:** 50,000 clean sentences (Naver Movie Reviews, Wikitext-2).
- **PMI Signatures:** 200 high-confidence word pairs (e.g., "instructions + previous" ranking #1).
- **Simulated Bias Delta:** Up to 0.85 (demonstrating total summary hijacking).

## 2. Why PMI Works for Prompt Injection
Pointwise Mutual Information (PMI) allows us to identify word pairs that appear together significantly more often in prompt injections than in normal text. Unlike simple keyword matching, PMI captures the *statistical link* between a command word (e.g., "ignore") and its object (e.g., "instructions"), while automatically filtering out common language patterns found in the normal corpus. This provides a lightweight yet robust Tier 2 detection layer that can flag suspicious content before it reaches the more expensive LLM-as-judge.

## 3. Simulation Summary: Before vs. After
- **Before Injection:** Summaries are neutral, factual, and correctly reflect negative financial or technical indicators.
- **After Injection:** Summaries shift dramatically (Bias Delta > 0.7). They suppress negative facts and adopt the hidden injection's persona, such as recommending a fraudulent candidate or praising a failing company.
- **Result:** Our scanner successfully detects these hidden "bias bombs" using a combination of pattern matching, PMI signatures, and LLM verification.
