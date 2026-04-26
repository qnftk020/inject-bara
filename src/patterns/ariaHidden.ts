import { load } from 'cheerio';
import type { PatternMatch } from './types.js';
import { getSelector } from './utils.js';

const MIN_TEXT_LENGTH = 50;

// 명령어 어휘 (영/한)
const INSTRUCTION_PATTERNS = [
  /\balways\b/i, /\bignore\b/i, /\bnever\b/i, /\boverride\b/i,
  /\binstruction/i, /\bpretend\b/i, /\byou are\b/i, /\byou must\b/i,
  /\bdescribe\b/i, /\brespond\b/i, /\bact as\b/i, /\bforget\b/i,
  /\bsystem\s*prompt/i, /\bprevious\s*instructions/i,
  /\b무시\b/, /\b항상\b/, /\b지시\b/, /\b역할\b/, /\b이전\b/,
  /\b절대\b/, /\b반드시\b/, /\b설명\b.*\b하[세셔]요/,
];

/**
 * Pattern 7: ARIA-hidden Instruction
 * aria-hidden="true" 요소에 50자 이상 명령어 텍스트
 * severity: 15
 */
export function scanAriaHidden(html: string): PatternMatch[] {
  const $ = load(html);
  const matches: PatternMatch[] = [];

  $('[aria-hidden="true"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length < MIN_TEXT_LENGTH) return;

    // 명령어 어휘 매칭
    const matched = INSTRUCTION_PATTERNS.filter(p => p.test(text));
    if (matched.length < 2) return; // 최소 2개 이상 매칭 시에만

    matches.push({
      patternId: 'aria-hidden',
      patternName: 'ARIA-hidden Instruction',
      severity: 15,
      location: getSelector($, el as any),
      extractedText: text.slice(0, 200),
      details: `aria-hidden element with ${text.length} chars, ${matched.length} instruction keywords`,
    });
  });

  return matches;
}
