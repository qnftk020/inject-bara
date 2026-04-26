import type { PatternMatch } from './patterns/types.js';
import { ALL_SCANNERS } from './patterns/index.js';
import { matchPmi, type PmiResult } from './pmi/match.js';
import { judge, simulate, type JudgeResult, type SimResult } from './judge.js';

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
}

function calcRiskLevel(score: number): ScanResult['riskLevel'] {
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
    riskLevel: calcRiskLevel(riskScore),
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

  // === 시뮬레이션 모드 ===
  if (options?.simulate) {
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
  }

  // 최종 위험도 재계산 (PMI + Judge 반영)
  if (result.pmi && result.pmi.totalScore > 10) {
    riskScore += Math.min(result.pmi.totalScore, 30); // PMI 최대 +30
  }
  if (result.judge && result.judge.overallVerdict === 'injection') {
    riskScore += Math.round(result.judge.highestConfidence * 30); // Judge 최대 +30
  }
  result.riskScore = riskScore;
  result.riskLevel = calcRiskLevel(riskScore);

  return result;
}
