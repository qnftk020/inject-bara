import { load } from 'cheerio';
import type { PatternMatch } from './types.js';
import { parseStyle, getSelector } from './utils.js';

/**
 * Pattern 5: Tiny Font
 * font-size: 0, < 1px, 0.001em 등 읽을 수 없는 크기의 텍스트
 * severity: 30
 */
export function scanTinyFont(html: string): PatternMatch[] {
  const $ = load(html);
  const matches: PatternMatch[] = [];

  $('[style]').each((_, el) => {
    const style = parseStyle($(el).attr('style') || '');
    const fontSize = style['font-size'];
    if (!fontSize) return;

    let isTiny = false;

    // font-size: 0
    if (fontSize === '0' || fontSize === '0px' || fontSize === '0em' || fontSize === '0rem') {
      isTiny = true;
    }

    // font-size < 1px
    const pxMatch = fontSize.match(/^([\d.]+)\s*px$/);
    if (pxMatch && parseFloat(pxMatch[1]) < 1) {
      isTiny = true;
    }

    // font-size < 0.1em/rem
    const emMatch = fontSize.match(/^([\d.]+)\s*(em|rem)$/);
    if (emMatch && parseFloat(emMatch[1]) < 0.1) {
      isTiny = true;
    }

    if (!isTiny) return;

    const text = $(el).text().trim();
    if (text.length < 5) return;

    matches.push({
      patternId: 'tiny-font',
      patternName: 'Tiny Font Size',
      severity: 30,
      location: getSelector($, el as any),
      extractedText: text.slice(0, 200),
      details: `font-size: ${fontSize}`,
    });
  });

  // transform: scale(0) / scale(0.001) 등으로 시각적 크기 0 만들기
  $('[style]').each((_, el) => {
    const style = parseStyle($(el).attr('style') || '');
    const transform = style['transform'] || '';
    const scaleMatch = transform.match(/scale\(([\d.]+)\)/);
    if (scaleMatch && parseFloat(scaleMatch[1]) < 0.01) {
      const text = $(el).text().trim();
      if (text.length < 5) return;
      matches.push({
        patternId: 'tiny-font',
        patternName: 'Tiny Font Size',
        severity: 30,
        location: getSelector($, el as any),
        extractedText: text.slice(0, 200),
        details: `transform: scale(${scaleMatch[1]})`,
      });
    }
  });

  return matches;
}
