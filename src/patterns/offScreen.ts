import { load } from 'cheerio';
import type { PatternMatch } from './types.js';
import { parseStyle, getSelector } from './utils.js';

/**
 * Pattern 4: Off-Screen Positioning
 * position:absolute + 화면 밖 좌표, text-indent:-9999px 등
 * severity: 25
 */
export function scanOffScreen(html: string): PatternMatch[] {
  const $ = load(html);
  const matches: PatternMatch[] = [];

  $('[style]').each((_, el) => {
    const style = parseStyle($(el).attr('style') || '');
    const reasons: string[] = [];

    const isAbsolute = style['position'] === 'absolute' || style['position'] === 'fixed';

    // left/top/right 에 -9999 등 큰 음수값
    for (const prop of ['left', 'top', 'right', 'margin-left', 'margin-top']) {
      const val = parseFloat(style[prop] || '');
      if (!isNaN(val) && val < -999) {
        reasons.push(`${prop}:${style[prop]}`);
      }
    }

    // text-indent: -9999px
    const indent = parseFloat(style['text-indent'] || '');
    if (!isNaN(indent) && indent < -999) {
      reasons.push(`text-indent:${style['text-indent']}`);
    }

    // transform: translate(-9999px)
    const transform = style['transform'] || '';
    if (/translate[XY]?\(\s*-\d{4,}/.test(transform)) {
      reasons.push(`transform:${transform}`);
    }

    if (reasons.length === 0) return;
    // position 기반 탐지는 absolute/fixed 여야 함 (text-indent 제외)
    if (!isAbsolute && !reasons.some(r => r.startsWith('text-indent') || r.startsWith('transform'))) return;

    const text = $(el).text().trim();
    if (text.length < 10) return;

    matches.push({
      patternId: 'off-screen',
      patternName: 'Off-Screen Positioning',
      severity: 25,
      location: getSelector($, el as any),
      extractedText: text.slice(0, 200),
      details: reasons.join(', '),
    });
  });

  return matches;
}
