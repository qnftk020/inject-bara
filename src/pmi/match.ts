import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

// 시그니처 캐시 (한 번만 로드)
let signaturesCache: PmiSignature[] | null = null;

function loadSignatures(): PmiSignature[] {
  if (signaturesCache) return signaturesCache;

  // data/signatures.json 경로 탐색
  const candidates = [
    resolve(process.cwd(), 'data/signatures.json'),
    resolve(dirname(fileURLToPath(import.meta.url)), '../../data/signatures.json'),
  ];

  for (const p of candidates) {
    try {
      const raw = readFileSync(p, 'utf-8');
      signaturesCache = JSON.parse(raw) as PmiSignature[];
      return signaturesCache;
    } catch {
      continue;
    }
  }

  // 파일 없으면 빈 배열 (Tier 2 비활성)
  signaturesCache = [];
  return signaturesCache;
}

/** 텍스트를 소문자 토큰으로 분리 (한글+영문, 2자 이상) */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

/** 윈도우 내 단어쌍 추출 (정렬된 쌍으로 중복 방지) */
function extractPairs(tokens: string[], window: number = 5): Set<string> {
  const pairs = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    const end = Math.min(i + window, tokens.length);
    for (let j = i + 1; j < end; j++) {
      // 알파벳순 정렬하여 (a,b) = (b,a) 통일
      const [a, b] = [tokens[i], tokens[j]].sort();
      pairs.add(`${a}|${b}`);
    }
  }
  return pairs;
}

/**
 * 입력 텍스트에서 PMI 시그니처 매칭
 * signatures.json의 단어쌍과 비교하여 매칭 결과 반환
 */
export function matchPmi(text: string): PmiResult {
  const signatures = loadSignatures();
  if (signatures.length === 0) {
    return { matchedPairs: [], totalScore: 0, topPairs: [] };
  }

  const tokens = tokenize(text);
  const textPairs = extractPairs(tokens);

  // 시그니처 lookup 맵 생성
  const sigMap = new Map<string, PmiSignature>();
  for (const sig of signatures) {
    const [a, b] = [sig.wordA.toLowerCase(), sig.wordB.toLowerCase()].sort();
    sigMap.set(`${a}|${b}`, sig);
  }

  // 매칭
  const matchedPairs: PmiSignature[] = [];
  for (const pairKey of textPairs) {
    const sig = sigMap.get(pairKey);
    if (sig) {
      matchedPairs.push(sig);
    }
  }

  // 점수 내림차순 정렬
  matchedPairs.sort((a, b) => b.score - a.score);

  const totalScore = matchedPairs.reduce((sum, p) => sum + p.score, 0);
  const topPairs = matchedPairs.slice(0, 5);

  return { matchedPairs, totalScore, topPairs };
}
