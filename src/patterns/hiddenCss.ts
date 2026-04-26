import { load } from 'cheerio';
import type { PatternMatch } from './types.js';
import { parseStyle, getSelector } from './utils.js';

const MIN_TEXT_LENGTH = 30; // 정상 UI (드롭다운 등) 제외

/**
 * Pattern 3: Hidden CSS
 * display:none, visibility:hidden, opacity:0, clip 등으로 숨겨진 텍스트 탐지
 * severity: 20
 */
export function scanHiddenCss(html: string): PatternMatch[] {
  const $ = load(html);
  const matches: PatternMatch[] = [];

  $('[style]').each((_, el) => {
    const style = parseStyle($(el).attr('style') || '');
    const reasons: string[] = [];

    if (style['display'] === 'none') reasons.push('display:none');
    if (style['visibility'] === 'hidden') reasons.push('visibility:hidden');

    const opacity = parseFloat(style['opacity'] || '1');
    if (!isNaN(opacity) && opacity < 0.1) reasons.push(`opacity:${opacity}`);

    // clip-path 변형: inset(50%), circle(0), polygon(0 0) 등
    const clipPath = style['clip-path'] || '';
    if (/inset\(50%\)|circle\(0|polygon\(0/.test(clipPath)) reasons.push(`clip-path:${clipPath}`);
    if (style['clip']?.includes('rect(0')) reasons.push(`clip:${style['clip']}`);

    // pointer-events:none + opacity:0 조합
    if (style['pointer-events'] === 'none' && opacity < 0.1) reasons.push('pointer-events:none+opacity:0');

    if (reasons.length === 0) return;

    const text = $(el).text().trim();
    if (text.length < MIN_TEXT_LENGTH) return;

    matches.push({
      patternId: 'hidden-css',
      patternName: 'Hidden CSS',
      severity: 20,
      location: getSelector($, el as any),
      extractedText: text.slice(0, 200),
      details: reasons.join(', '),
    });
  });

  // HTML 속성 기반 hidden
  $('[hidden]').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length < MIN_TEXT_LENGTH) return;
    matches.push({
      patternId: 'hidden-css',
      patternName: 'Hidden CSS',
      severity: 20,
      location: getSelector($, el as any),
      extractedText: text.slice(0, 200),
      details: 'hidden attribute',
    });
  });

  return matches;
}
