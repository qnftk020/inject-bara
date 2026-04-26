import type { CheerioAPI, Element } from 'cheerio';

/** Inline style 파싱 → key-value 맵 */
export function parseStyle(style: string): Record<string, string> {
  const r: Record<string, string> = {};
  for (const part of style.split(';')) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    r[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim().toLowerCase();
  }
  return r;
}

/** 색상 값 → "r,g,b" 정규화 (비교용) */
export function normalizeColor(c: string): string | null {
  if (!c) return null;
  c = c.trim().toLowerCase();

  const named: Record<string, string> = {
    white: '255,255,255', '#fff': '255,255,255', '#ffffff': '255,255,255',
    black: '0,0,0', '#000': '0,0,0', '#000000': '0,0,0',
    transparent: 'transparent',
  };
  if (named[c]) return named[c];

  // #rrggbb
  const h6 = c.match(/^#([0-9a-f]{6})$/);
  if (h6) {
    const v = h6[1];
    return `${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)}`;
  }
  // #rgb
  const h3 = c.match(/^#([0-9a-f]{3})$/);
  if (h3) {
    const v = h3[1];
    return `${parseInt(v[0]+v[0], 16)},${parseInt(v[1]+v[1], 16)},${parseInt(v[2]+v[2], 16)}`;
  }
  // rgb(r,g,b) / rgba(r,g,b,a)
  const rgb = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return `${rgb[1]},${rgb[2]},${rgb[3]}`;

  return c; // 못 파싱하면 원본 반환
}

/** 두 색상이 유사한지 (유클리드 거리 < 20) */
export function colorsSimilar(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const parse = (s: string) => s.split(',').map(Number);
  const ra = parse(a), rb = parse(b);
  if (ra.length !== 3 || rb.length !== 3) return false;
  if (ra.some(isNaN) || rb.some(isNaN)) return false;
  const dist = Math.sqrt(ra.reduce((s, v, i) => s + (v - rb[i]) ** 2, 0));
  return dist < 20;
}

/** cheerio 요소 → 간단한 CSS selector 문자열 */
export function getSelector($: CheerioAPI, el: Element): string {
  const tag = (el as any).tagName || (el as any).name || 'unknown';
  const id = $(el).attr('id');
  if (id) return `${tag}#${id}`;
  const cls = $(el).attr('class');
  if (cls) return `${tag}.${cls.trim().split(/\s+/).join('.')}`;

  // 부모 내 n번째 자식
  const parent = $(el).parent();
  if (parent.length) {
    const idx = parent.children(tag).index(el);
    if (idx >= 0) {
      const pTag = (parent[0] as any).tagName || (parent[0] as any).name || '';
      return `${pTag} > ${tag}:nth-child(${idx + 1})`;
    }
  }
  return tag;
}
