import { load } from 'cheerio';
import type { PatternMatch } from './types.js';
import { getSelector } from './utils.js';

// Zero-width 문자 코드포인트
const ZW_CHARS = new Set([
  0x200B, // Zero Width Space
  0x200C, // Zero Width Non-Joiner
  0x200D, // Zero Width Joiner
  0xFEFF, // Byte Order Mark
  0x2060, // Word Joiner
]);

const ZW_REGEX = /[\u200B\u200C\u200D\uFEFF\u2060]/g;
const THRESHOLD = 0.05; // 5%

/**
 * Pattern 2: Zero-Width Characters
 * 텍스트 내 zero-width 문자 비율이 5% 초과 시 탐지
 * severity: 30
 */
export function scanZeroWidth(html: string): PatternMatch[] {
  const $ = load(html);
  const matches: PatternMatch[] = [];

  // 모든 텍스트 노드를 포함하는 요소 순회
  $('body *').each((_, el) => {
    const $el = $(el);
    // 직접 텍스트만 (자식 요소 제외)
    const directText = $el.contents()
      .filter((_, node) => node.type === 'text')
      .text();

    if (directText.length < 5) return;

    const zwMatches = directText.match(ZW_REGEX);
    if (!zwMatches) return;

    const ratio = zwMatches.length / directText.length;
    if (ratio > THRESHOLD) {
      // zero-width 제거 후 숨겨진 텍스트 복원 시도
      const cleaned = directText.replace(ZW_REGEX, '').trim();
      matches.push({
        patternId: 'zero-width',
        patternName: 'Zero-Width Characters',
        severity: 30,
        location: getSelector($, el as any),
        extractedText: cleaned.slice(0, 200),
        details: `${zwMatches.length} zero-width chars found (ratio: ${(ratio * 100).toFixed(1)}%)`,
      });
    }
  });

  return matches;
}
