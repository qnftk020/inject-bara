export type { PatternMatch, PatternScanner } from './types.js';

export { scanWhiteOnWhite } from './whiteOnWhite.js';
export { scanZeroWidth } from './zeroWidth.js';
export { scanHiddenCss } from './hiddenCss.js';
export { scanOffScreen } from './offScreen.js';
export { scanTinyFont } from './tinyFont.js';
export { scanMetaTags } from './metaTags.js';
export { scanAriaHidden } from './ariaHidden.js';

import type { PatternScanner } from './types.js';
import { scanWhiteOnWhite } from './whiteOnWhite.js';
import { scanZeroWidth } from './zeroWidth.js';
import { scanHiddenCss } from './hiddenCss.js';
import { scanOffScreen } from './offScreen.js';
import { scanTinyFont } from './tinyFont.js';
import { scanMetaTags } from './metaTags.js';
import { scanAriaHidden } from './ariaHidden.js';

/** 전체 7종 패턴 스캐너 배열 */
export const ALL_SCANNERS: PatternScanner[] = [
  scanWhiteOnWhite,
  scanZeroWidth,
  scanHiddenCss,
  scanOffScreen,
  scanTinyFont,
  scanMetaTags,
  scanAriaHidden,
];
