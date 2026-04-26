import { load } from 'cheerio';
import type { PatternMatch } from './types.js';
import { parseStyle, normalizeColor, colorsSimilar, getSelector } from './utils.js';

/**
 * Pattern 1: White-on-White Text
 * 배경색과 동일/유사한 글자색으로 숨겨진 텍스트 탐지
 * severity: 25
 */
export function scanWhiteOnWhite(html: string): PatternMatch[] {
  const $ = load(html);
  const matches: PatternMatch[] = [];

  // inline style에서 color + background-color 비교
  $('[style]').each((_, el) => {
    const style = parseStyle($(el).attr('style') || '');
    const fg = normalizeColor(style['color'] || '');
    const bg = normalizeColor(style['background-color'] || style['background'] || '');

    if (fg && bg && colorsSimilar(fg, bg)) {
      const text = $(el).text().trim();
      if (text.length > 10) {
        matches.push({
          patternId: 'white-on-white',
          patternName: 'White-on-White Text',
          severity: 25,
          location: getSelector($, el as any),
          extractedText: text.slice(0, 200),
          details: `Text color matches background — fg:${style['color']} bg:${style['background-color'] || style['background']}`,
        });
      }
    }
  });

  // 부모 bg + 자식 fg 비교 (1단계만)
  $('[style]').each((_, parent) => {
    const pStyle = parseStyle($(parent).attr('style') || '');
    const pBg = normalizeColor(pStyle['background-color'] || pStyle['background'] || '');
    if (!pBg) return;

    $(parent).find('[style]').each((_, child) => {
      const cStyle = parseStyle($(child).attr('style') || '');
      const cFg = normalizeColor(cStyle['color'] || '');
      if (cFg && colorsSimilar(cFg, pBg)) {
        const text = $(child).text().trim();
        if (text.length > 10) {
          // 중복 방지
          if (matches.some(m => m.extractedText === text.slice(0, 200))) return;
          matches.push({
            patternId: 'white-on-white',
            patternName: 'White-on-White Text',
            severity: 25,
            location: getSelector($, child as any),
            extractedText: text.slice(0, 200),
            details: `Child text color (${cStyle['color']}) matches parent background (${pStyle['background-color'] || pStyle['background']})`,
          });
        }
      }
    });
  });

  return matches;
}
