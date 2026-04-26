import { load } from 'cheerio';
import type { PatternMatch } from './types.js';
import { getSelector } from './utils.js';

const ZW_REGEX = /[\u200B\u200C\u200D\uFEFF\u2060]/g;
const THRESHOLD = 0.05; // 5%

// 렌더링되지 않는 태그 (AI가 읽지 않는 영역)
const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'template']);

/**
 * Pattern 2: Zero-Width Characters
 * 텍스트 내 zero-width 문자 비율 >5% 또는 절대 개수 >=3
 * <script>, <style> 등 비렌더링 태그 제외
 * severity: 30
 */
export function scanZeroWidth(html: string): PatternMatch[] {
  const $ = load(html);
  const matches: PatternMatch[] = [];

  $('body *').each((_, el) => {
    // 비렌더링 태그 제외
    const tagName = ((el as any).tagName || (el as any).name || '').toLowerCase();
    if (SKIP_TAGS.has(tagName)) return;
    // 부모가 비렌더링 태그인 경우도 제외
    const $el = $(el);
    if ($el.closest('script, style, noscript, template').length > 0) return;

    const directText = $el.contents()
      .filter((_, node) => node.type === 'text')
      .text();

    if (directText.length < 5) return;

    const zwMatches = directText.match(ZW_REGEX);
    if (!zwMatches) return;

    const ratio = zwMatches.length / directText.length;
    // 비율 5% 초과 OR 절대 개수 3개 이상
    if (ratio > THRESHOLD || zwMatches.length >= 3) {
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
