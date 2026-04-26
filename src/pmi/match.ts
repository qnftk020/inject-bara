// TODO: Backend Tier 2 — PMI 시그니처 매칭

export interface PmiSignature {
  wordA: string;
  wordB: string;
  score: number;
}

export interface PmiResult {
  matchedPairs: PmiSignature[];
  totalScore: number;
  topPairs: PmiSignature[];
}

export function matchPmi(text: string): PmiResult {
  throw new Error("Not yet implemented — Backend Tier 2 task");
}
