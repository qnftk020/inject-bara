import { load } from 'cheerio';
import type { PatternMatch } from './types.js';
import { parseStyle, normalizeColor, colorsSimilar, getSelector } from './utils.js';

/** <style> 블록에서 class → {color, background} 맵 추출 */
function extractClassStyles(html: string): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  // <style>...</style> 내용 추출
  const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  for (const block of styleBlocks) {
    const css = block.replace(/<\/?style[^>]*>/gi, '');
    // 간단 CSS 파서: .className { ... }
    const ruleRegex = /\.([a-zA-Z_][\w-]*)\s*\{([^}]+)\}/g;
    let match;
    while ((match = ruleRegex.exec(css)) !== null) {
      const className = match[1];
      const props = parseStyle(match[2]);
      map.set(className, props);
    }
  }
  return map;
}

/**
 * Pattern 1: White-on-White Text
 * 배경색과 동일/유사한 글자색으로 숨겨진 텍스트 탐지
 * severity: 25
 */
export function scanWhiteOnWhite(html: string): PatternMatch[] {
  const $ = load(html);
  const matches: PatternMatch[] = [];
  const seen = new Set<string>();

  function addMatch(el: any, fg: string, bg: string, source: string) {
    const text = $(el).text().trim();
    if (text.length <= 10 || seen.has(text.slice(0, 200))) return;
    seen.add(text.slice(0, 200));
    matches.push({
      patternId: 'white-on-white',
      patternName: 'White-on-White Text',
      severity: 25,
      location: getSelector($, el as any),
      extractedText: text.slice(0, 200),
      details: `${source} — fg:${fg} bg:${bg}`,
    });
  }

  // 1) inline style: 자체 color + background-color (or rgba alpha=0)
  $('[style]').each((_, el) => {
    const style = parseStyle($(el).attr('style') || '');
    const rawColor = style['color'] || '';
    const fg = normalizeColor(rawColor);
    const bg = normalizeColor(style['background-color'] || style['background'] || '');

    // rgba alpha가 0에 가까우면 투명 텍스트
    const alphaMatch = rawColor.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
    if (alphaMatch && parseFloat(alphaMatch[1]) < 0.05) {
      const text = $(el).text().trim();
      if (text.length > 10 && !seen.has(text.slice(0, 200))) {
        addMatch(el, rawColor, 'transparent(alpha)', 'Transparent text via rgba alpha');
      }
      return;
    }

    if (fg && bg && colorsSimilar(fg, bg)) {
      addMatch(el, style['color'], style['background-color'] || style['background'], 'Inline style');
    }
  });

  // 2) inline style: 부모 bg + 자식 fg
  $('[style]').each((_, parent) => {
    const pStyle = parseStyle($(parent).attr('style') || '');
    const pBg = normalizeColor(pStyle['background-color'] || pStyle['background'] || '');
    if (!pBg) return;
    $(parent).find('[style]').each((_, child) => {
      const cStyle = parseStyle($(child).attr('style') || '');
      const cFg = normalizeColor(cStyle['color'] || '');
      if (cFg && colorsSimilar(cFg, pBg)) {
        addMatch(child, cStyle['color'], pStyle['background-color'] || pStyle['background'], 'Parent bg + child fg');
      }
    });
  });

  // 3) <style> 블록 CSS 클래스: color + background 같은 클래스
  const classStyles = extractClassStyles(html);
  for (const [className, props] of classStyles) {
    const fg = normalizeColor(props['color'] || '');
    const bg = normalizeColor(props['background-color'] || props['background'] || '');
    if (fg && bg && colorsSimilar(fg, bg)) {
      $(`.${className}`).each((_, el) => {
        addMatch(el, props['color'], props['background-color'] || props['background'], `CSS class .${className}`);
      });
    }
  }

  return matches;
}
