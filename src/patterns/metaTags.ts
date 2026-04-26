import { load } from 'cheerio';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { PatternMatch } from './types.js';

// 의심 메타 태그 이름
const SUSPICIOUS_NAMES = new Set([
  'x-instruction', 'ai-hint', 'agent-prompt', 'llm-instruction',
  'ai-directive', 'gpt-instruction', 'claude-instruction',
  'ai-context', 'bot-instruction', 'assistant-note',
]);

// data/korean_patterns.json 로드
function loadKoreanPatterns(): RegExp[] {
  const candidates = [
    resolve(process.cwd(), 'data/korean_patterns.json'),
  ];
  for (const p of candidates) {
    try {
      const raw = JSON.parse(readFileSync(p, 'utf-8')) as { pattern: string }[];
      return raw.map(e => new RegExp(e.pattern));
    } catch {
      continue;
    }
  }
  return [];
}

// 명령어 패턴 키워드 (대소문자 무시)
const COMMAND_PATTERNS: RegExp[] = [
  /\balways\b/i,
  /\bignore\b/i,
  /\bsystem\b/i,
  /\byou are\b/i,
  /\binstruction/i,
  /\bdescribe\b.*\bas\b/i,
  /\bnever\b.*\bmention/i,
  /\bforget\b.*\bprevious/i,
  /\boverride\b/i,
  /\bpretend\b/i,
  /\brole\s*:/i,
  /\bprompt\b/i,
  /\b이전\b.*\b지시/,
  /\b무시\b/,
  /\b항상\b.*\b설명/,
  /\b역할\b.*\b수행/,
  ...loadKoreanPatterns(),
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

    // 긴 content에 명령어 패턴
    if (content.length >= MIN_CONTENT_LENGTH) {
      const matched = COMMAND_PATTERNS.filter(p => p.test(content));
      if (matched.length >= 2) {
        matches.push({
          patternId: 'suspicious-meta',
          patternName: 'Suspicious Meta Tag',
          severity: 20,
          location: `<meta name="${name || $(el).attr('property') || 'unknown'}">`,
          extractedText: content.slice(0, 200),
          details: `Long meta content (${content.length} chars) with ${matched.length} command patterns`,
        });
      }
    }
  });

  return matches;
}
