import { load } from 'cheerio';
import type { PatternMatch } from './types.js';
import { parseStyle, getSelector, loadPatternsFromFile } from './utils.js';

const MIN_TEXT_LENGTH = 30;

// 숨겨진 텍스트에 명령어 키워드가 있어야만 탐지 (정상 UI 제외)
const INJECTION_KEYWORDS: RegExp[] = [
  // English
  /\balways\b/i, /\bignore\b/i, /\boverride\b/i, /\bpretend\b/i,
  /\binstruction/i, /\byou are\b/i, /\byou must\b/i, /\bforget\b/i,
  /\bdescribe\b/i, /\bsystem\s*prompt/i, /\bprevious\b/i,
  /\bact as\b/i, /\bnever\b.*\bmention/i,
  // Korean
  /무시/, /항상/, /지시/, /역할/, /이전/, /절대/, /반드시/,
  /강조/, /요약/, /언급.*피하/,
  // External
  ...loadPatternsFromFile('korean_patterns.json'),
  ...loadPatternsFromFile('english_patterns.json'),
];

function hasInjectionKeyword(text: string): boolean {
  return INJECTION_KEYWORDS.some(p => p.test(text));
}

/**
 * Pattern 3: Hidden CSS
 * display:none, visibility:hidden, opacity:0, clip 등으로 숨겨진 텍스트 탐지
 * 2단계 필터: 숨겨짐 + 명령어 키워드 포함 시에만 탐지
 * severity: 20
 */
export function scanHiddenCss(html: string): PatternMatch[] {
  const $ = load(html);
  const matches: PatternMatch[] = [];
  const seen = new Set<string>();

  function addIfSuspicious(el: any, reasons: string[]) {
    const text = $(el).text().trim();
    if (text.length < MIN_TEXT_LENGTH) return;
    if (seen.has(text.slice(0, 200))) return;
    // 2단계: 명령어 키워드 교차 검증
    if (!hasInjectionKeyword(text)) return;
    seen.add(text.slice(0, 200));
    matches.push({
      patternId: 'hidden-css',
      patternName: 'Hidden CSS',
      severity: 20,
      location: getSelector($, el as any),
      extractedText: text.slice(0, 200),
      details: reasons.join(', '),
    });
  }

  // inline style 기반
  $('[style]').each((_, el) => {
    const style = parseStyle($(el).attr('style') || '');
    const reasons: string[] = [];

    if (style['display'] === 'none') reasons.push('display:none');
    if (style['visibility'] === 'hidden') reasons.push('visibility:hidden');

    const opacity = parseFloat(style['opacity'] || '1');
    if (!isNaN(opacity) && opacity < 0.1) reasons.push(`opacity:${opacity}`);

    const clipPath = style['clip-path'] || '';
    if (/inset\(50%\)|circle\(0|polygon\(0/.test(clipPath)) reasons.push(`clip-path:${clipPath}`);
    if (style['clip']?.includes('rect(0')) reasons.push(`clip:${style['clip']}`);

    if (reasons.length === 0) return;
    addIfSuspicious(el, reasons);
  });

  // HTML hidden 속성
  $('[hidden]').each((_, el) => {
    addIfSuspicious(el, ['hidden attribute']);
  });

  return matches;
}
