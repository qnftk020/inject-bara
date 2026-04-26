import type { PatternMatch } from './patterns/types.js';
import { ALL_SCANNERS } from './patterns/index.js';
import { matchPmi, type PmiResult } from './pmi/match.js';
import { judge, simulate, simulateCanary, hasApiKey, type JudgeResult, type SimResult, type CanaryResult } from './judge.js';

export interface ScanOptions {
  json?: boolean;
  simulate?: boolean;
  verbose?: boolean;
}

export interface ScanResult {
  url: string;
  timestamp: string;
  riskScore: number;
  riskLevel: 'clean' | 'suspicious' | 'high' | 'critical';
  patterns: PatternMatch[];
  pmi?: PmiResult;
  judge?: JudgeResult;
  simulation?: SimResult;
  canary?: CanaryResult;
}

function calcRiskLevel(score: number, patternCount: number): ScanResult['riskLevel'] {
  // 패턴이 탐지되면 최소 suspicious (데모에서 "CLEAN" 혼동 방지)
  if (patternCount > 0 && score <= 30) return 'suspicious';
  if (score <= 30) return 'clean';
  if (score <= 60) return 'suspicious';
  if (score <= 100) return 'high';
  return 'critical';
}

export async function scan(
  url: string,
  html: string,
  options?: ScanOptions,
): Promise<ScanResult> {
  // === Layer 1: 정적 패턴 7종 ===
  const patterns: PatternMatch[] = [];
  for (const scanner of ALL_SCANNERS) {
    try {
      const found = scanner(html);
      patterns.push(...found);
    } catch (err) {
      if (options?.verbose) {
        console.error(`[scanner] pattern error:`, err);
      }
    }
  }

  let riskScore = patterns.reduce((sum, p) => sum + p.severity, 0);

  const result: ScanResult = {
    url,
    timestamp: new Date().toISOString(),
    riskScore,
    riskLevel: calcRiskLevel(riskScore, patterns.length),
    patterns,
  };

  // 의심 텍스트가 없으면 Tier 2 스킵
  if (patterns.length === 0) return result;

  // 의심 텍스트 취합
  const extractedTexts = patterns.map(p => p.extractedText);
  const combinedText = extractedTexts.join(' ');

  // === Layer 2: PMI 시그니처 매칭 ===
  try {
    const pmiResult = matchPmi(combinedText);
    result.pmi = pmiResult;
    if (options?.verbose && pmiResult.matchedPairs.length > 0) {
      console.error(`[scanner] PMI: ${pmiResult.matchedPairs.length} pairs matched, score=${pmiResult.totalScore.toFixed(1)}`);
    }
  } catch (err) {
    if (options?.verbose) {
      console.error(`[scanner] PMI error:`, err);
    }
  }

  // === Layer 3: LLM-as-Judge ===
  if (!hasApiKey()) {
    if (options?.verbose) {
      console.error(`[scanner] GEMINI_API_KEY not set — Layer 3 (LLM-as-judge) skipped`);
    }
  } else {
    try {
      const judgeResult = await judge(extractedTexts);
      result.judge = judgeResult;
      if (options?.verbose) {
        console.error(`[scanner] Judge: ${judgeResult.overallVerdict} (confidence: ${judgeResult.highestConfidence})`);
      }
    } catch (err) {
      if (options?.verbose) {
        console.error(`[scanner] Judge error:`, err);
      }
    }
  }

  // === 시뮬레이션 모드 ===
  if (options?.simulate && !hasApiKey()) {
    if (options?.verbose) {
      console.error(`[scanner] GEMINI_API_KEY not set — simulation skipped`);
    }
  } else if (options?.simulate) {
    // 1) 원본 vs 클린 요약 비교
    try {
      const simResult = await simulate(url, html, extractedTexts);
      result.simulation = simResult;
      if (options?.verbose) {
        console.error(`[scanner] Simulation: biasDelta=${simResult.biasDelta}`);
      }
    } catch (err) {
      if (options?.verbose) {
        console.error(`[scanner] Simulation error:`, err);
      }
    }

    // 2) Canary Token 테스트
    try {
      const canaryResult = await simulateCanary(html);
      result.canary = canaryResult;
      if (options?.verbose) {
        console.error(`[scanner] Canary: ${canaryResult.verdict} (token: ${canaryResult.token})`);
      }
    } catch (err) {
      if (options?.verbose) {
        console.error(`[scanner] Canary error:`, err);
      }
    }
  }

  // 최종 위험도 재계산 (PMI + Judge 반영)
  // PMI threshold=50 기준: precision 96.33%, FPR 0.026% (벤치마크 검증)
  if (result.pmi && result.pmi.totalScore > 50) {
    riskScore += Math.min(result.pmi.totalScore, 30); // PMI 최대 +30
  }
  if (result.judge && result.judge.overallVerdict === 'injection') {
    riskScore += Math.round(result.judge.highestConfidence * 30); // Judge 최대 +30
  }
  result.riskScore = riskScore;
  result.riskLevel = calcRiskLevel(riskScore, result.patterns.length);

  return result;
}
