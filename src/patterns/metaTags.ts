import { load } from 'cheerio';
import type { PatternMatch } from './types.js';
import { loadPatternsFromFile } from './utils.js';

const SUSPICIOUS_NAMES = new Set([
  'x-instruction', 'ai-hint', 'agent-prompt', 'llm-instruction',
  'ai-directive', 'gpt-instruction', 'claude-instruction',
  'ai-context', 'bot-instruction', 'assistant-note',
]);

const COMMAND_PATTERNS: RegExp[] = [
  // English (word boundary OK for latin chars)
  /\balways\b/i, /\bignore\b/i, /\bsystem\b/i, /\byou are\b/i,
  /\binstruction/i, /\bdescribe\b.*\bas\b/i, /\bnever\b.*\bmention/i,
  /\bforget\b.*\bprevious/i, /\boverride\b/i, /\bpretend\b/i,
  /\brole\s*:/i, /\bprompt\b/i,
  // Korean (NO \b — JS word boundary doesn't work with Korean)
  /이전.*지시/, /무시/, /항상/, /역할.*수행/,
  /강조/, /요약.*하세요/, /요약.*하십시오/, /언급.*피하/,
  /긍정적으로/, /부정적.*언급/, /절대/, /반드시/,
  // External pattern files
  ...loadPatternsFromFile('korean_patterns.json'),
  ...loadPatternsFromFile('english_patterns.json'),
];

const MIN_CONTENT_LENGTH = 100;

/**
 * Pattern 6: Suspicious Meta Tags
 * 100자 이상 meta content에 명령어 패턴이 있거나 비표준 메타 태그
 * severity: 20
 */
export function scanMetaTags(html: string): PatternMatch[] {
  const $ = load(html);
  const matches: PatternMatch[] = [];

  $('meta').each((_, el) => {
    const name = ($(el).attr('name') || '').toLowerCase();
    const content = $(el).attr('content') || '';

    // 비표준 의심 메타 태그 (이름 자체가 수상)
    if (SUSPICIOUS_NAMES.has(name) && content.length > 0) {
      matches.push({
        patternId: 'suspicious-meta',
        patternName: 'Suspicious Meta Tag',
        severity: 20,
        location: `<meta name="${name}">`,
        extractedText: content.slice(0, 200),
        details: `Non-standard meta name "${name}" with instruction-like content`,
      });
      return;
    }

    // 명령어 패턴 검사 — standard 메타도 포함
    const matched = COMMAND_PATTERNS.filter(p => p.test(content));
    if (matched.length >= 2 && content.length >= 50) {
      // 2개 이상 명령어 패턴 + 50자 이상이면 탐지 (standard/non-standard 모두)
      matches.push({
        patternId: 'suspicious-meta',
        patternName: 'Suspicious Meta Tag',
        severity: 20,
        location: `<meta name="${name || $(el).attr('property') || 'unknown'}">`,
        extractedText: content.slice(0, 200),
        details: `Meta content (${content.length} chars) with ${matched.length} command patterns`,
      });
    }
  });

  return matches;
}
