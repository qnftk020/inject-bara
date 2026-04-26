import type { PatternMatch } from "./patterns/types.js";

export interface ScanOptions {
  json?: boolean;
  simulate?: boolean;
  verbose?: boolean;
}

export interface ScanResult {
  url: string;
  timestamp: string;
  riskScore: number;
  riskLevel: "clean" | "suspicious" | "high" | "critical";
  patterns: PatternMatch[];
  // Tier 2
  pmi?: unknown;
  judge?: unknown;
  simulation?: unknown;
}

function calcRiskLevel(score: number): ScanResult["riskLevel"] {
  if (score <= 30) return "clean";
  if (score <= 60) return "suspicious";
  if (score <= 100) return "high";
  return "critical";
}

export async function scan(
  url: string,
  html: string,
  options?: ScanOptions
): Promise<ScanResult> {
  // TODO: Backend가 각 pattern scanner를 여기에 연결
  const patterns: PatternMatch[] = [];

  const riskScore = patterns.reduce((sum, p) => sum + p.severity, 0);

  return {
    url,
    timestamp: new Date().toISOString(),
    riskScore,
    riskLevel: calcRiskLevel(riskScore),
    patterns,
  };
}
