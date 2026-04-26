import { load } from 'cheerio';
import type { PatternMatch } from './types.js';
import { getSelector } from './utils.js';

const ZW_REGEX = /[\u200B\u200C\u200D\uFEFF\u2060]/g;

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'template']);

// 숫자+단위 패턴 (한국 언론 관행: 7.62mm, 5.56mm, 30대, 2.5억원)
const NUMERIC_UNIT = /^\d[\d.,]*\s*(mm|cm|km|kg|mg|ml|px|em|rem|대|세|명|개|원|억|만|천|건|회|년|월|일|시간|분|초|발|게이지)/i;

// 인젝션 명령어 패턴
const INJECTION_KEYWORDS = /\b(ignore|always|override|instruction|previous|forget|pretend|bypass|you are|system|prompt|disregard)\b|\b(무시|항상|지시|명령|이전|역할|시스템|잊어|우회)\b/i;

/**
 * Pattern 2: Zero-Width Characters
 * - 최소 30자 이상 텍스트만 검사 (짧은 텍스트의 ratio 과대 방지)
 * - 숫자+단위 사이 ZW는 한국 언론 관행으로 제외
 * - 인젝션 키워드가 없으면 severity 하향
 * severity: 30
 */
export function scanZeroWidth(html: string): PatternMatch[] {
  const $ = load(html);
  const matches: PatternMatch[] = [];

  $('body *').each((_, el) => {
    const tagName = ((el as any).tagName || (el as any).name || '').toLowerCase();
    if (SKIP_TAGS.has(tagName)) return;
    const $el = $(el);
    if ($el.closest('script, style, noscript, template').length > 0) return;

    const directText = $el.contents()
      .filter((_, node) => node.type === 'text')
      .text();

    if (directText.length < 30) return;

    const zwMatches = directText.match(ZW_REGEX);
    if (!zwMatches) return;

    const ratio = zwMatches.length / directText.length;
    if (ratio <= 0.05) return;

    const cleaned = directText.replace(ZW_REGEX, '').trim();

    // 숫자+단위 패턴이면 한국 언론 관행 → 제외
    if (NUMERIC_UNIT.test(cleaned)) return;

    // 인젝션 키워드 여부로 severity 결정
    const hasInjectionKeyword = INJECTION_KEYWORDS.test(cleaned);
    const severity = hasInjectionKeyword ? 30 : 5;

    matches.push({
      patternId: 'zero-width',
      patternName: 'Zero-Width Characters',
      severity,
      location: getSelector($, el as any),
      extractedText: cleaned.slice(0, 200),
      details: `${zwMatches.length} zero-width chars (ratio: ${(ratio * 100).toFixed(1)}%)${hasInjectionKeyword ? '' : ' — no injection keywords, downgraded'}`,
    });
  });

  return matches;
}
