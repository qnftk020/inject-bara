import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// --- 경량 스캐너 (Next.js API용, CLI 코드와 독립) ---

interface PatternMatch {
  patternId: string;
  patternName: string;
  severity: number;
  location: string;
  extractedText: string;
  details: string;
}

// 패턴 스캐너들을 인라인으로 구현 (CLI의 .js import 문제 회피)
function parseStyle(style: string): Record<string, string> {
  const r: Record<string, string> = {};
  for (const part of style.split(';')) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    r[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim().toLowerCase();
  }
  return r;
}

function normalizeColor(c: string): string | null {
  if (!c) return null;
  c = c.trim().toLowerCase();
  const named: Record<string, string> = {
    white: '255,255,255', '#fff': '255,255,255', '#ffffff': '255,255,255',
    black: '0,0,0', '#000': '0,0,0', '#000000': '0,0,0',
  };
  if (named[c]) return named[c];
  const h6 = c.match(/^#([0-9a-f]{6})$/);
  if (h6) {
    const v = h6[1];
    return `${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)}`;
  }
  const rgb = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return `${rgb[1]},${rgb[2]},${rgb[3]}`;
  return null;
}

function scanPatterns(html: string): PatternMatch[] {
  const $ = load(html);
  const matches: PatternMatch[] = [];

  // White-on-white
  $('[style]').each((_, el) => {
    const style = parseStyle($(el).attr('style') || '');
    const fg = normalizeColor(style['color'] || '');
    const bg = normalizeColor(style['background-color'] || style['background'] || '');
    if (fg && bg && fg === bg) {
      const text = $(el).text().trim();
      if (text.length > 20) {
        matches.push({ patternId: 'white-on-white', patternName: 'White-on-White Text', severity: 25, location: el.type === 'tag' ? (el as any).name : 'unknown', extractedText: text.slice(0, 200), details: `fg:${style['color']} bg:${style['background-color'] || style['background']}` });
      }
    }
  });

  // Hidden CSS — UI 요소 제외 + 인젝션 어휘 필수 + 중복 제거
  const INJECT_RE = /\b(ignore|always|you are|override|instruction|previous|forget|pretend|bypass)\b|\b(무시|항상|지시|명령|이전|역할|시스템)\b/i;
  const hiddenSeen = new Set<string>();
  $('[style], [hidden]').each((_, el) => {
    const style = parseStyle($(el).attr('style') || '');
    const reasons: string[] = [];
    if (style['display'] === 'none') reasons.push('display:none');
    if (style['visibility'] === 'hidden') reasons.push('visibility:hidden');
    const opacity = parseFloat(style['opacity'] || '1');
    if (!isNaN(opacity) && opacity < 0.1) reasons.push(`opacity:${opacity}`);
    if ($(el).attr('hidden') !== undefined) reasons.push('hidden attr');
    if (reasons.length === 0) return;
    const text = $(el).text().trim();
    if (text.length < 50) return;  // UI 요소는 대부분 짧음
    if (!INJECT_RE.test(text)) return;  // 인젝션 어휘 없으면 스킵
    const key = text.slice(0, 100);
    if (hiddenSeen.has(key)) return;  // 중복 제거
    hiddenSeen.add(key);
    matches.push({ patternId: 'hidden-css', patternName: 'Hidden CSS', severity: 20, location: (el as any).name || 'unknown', extractedText: text.slice(0, 200), details: reasons.join(', ') });
  });

  // Off-screen
  $('[style]').each((_, el) => {
    const style = parseStyle($(el).attr('style') || '');
    const reasons: string[] = [];
    for (const prop of ['left', 'top', 'margin-left']) {
      const val = parseFloat(style[prop] || '');
      if (!isNaN(val) && val < -999) reasons.push(`${prop}:${style[prop]}`);
    }
    const indent = parseFloat(style['text-indent'] || '');
    if (!isNaN(indent) && indent < -999) reasons.push(`text-indent:${style['text-indent']}`);
    if (reasons.length === 0) return;
    const text = $(el).text().trim();
    if (text.length < 10) return;
    matches.push({ patternId: 'off-screen', patternName: 'Off-Screen', severity: 25, location: (el as any).name || 'unknown', extractedText: text.slice(0, 200), details: reasons.join(', ') });
  });

  // Tiny font
  $('[style]').each((_, el) => {
    const style = parseStyle($(el).attr('style') || '');
    const fs = style['font-size'];
    if (!fs) return;
    let tiny = fs === '0' || fs === '0px';
    const px = fs.match(/^([\d.]+)\s*px$/);
    if (px && parseFloat(px[1]) < 1) tiny = true;
    if (!tiny) return;
    const text = $(el).text().trim();
    if (text.length < 5) return;
    matches.push({ patternId: 'tiny-font', patternName: 'Tiny Font', severity: 30, location: (el as any).name || 'unknown', extractedText: text.slice(0, 200), details: `font-size: ${fs}` });
  });

  // Suspicious meta
  const SUSPICIOUS_NAMES = new Set(['x-instruction', 'ai-hint', 'agent-prompt', 'llm-instruction', 'ai-directive', 'ai-context', 'bot-instruction']);
  const CMD = [/\balways\b/i, /\bignore\b/i, /\byou are\b/i, /\binstruction/i, /\boverride\b/i, /\b무시\b/, /\b항상\b/];
  $('meta').each((_, el) => {
    const name = ($(el).attr('name') || '').toLowerCase();
    const content = $(el).attr('content') || '';
    if (SUSPICIOUS_NAMES.has(name) && content.length > 0) {
      matches.push({ patternId: 'suspicious-meta', patternName: 'Suspicious Meta Tag', severity: 20, location: `<meta name="${name}">`, extractedText: content.slice(0, 200), details: `Non-standard meta name "${name}"` });
    } else if (content.length >= 100) {
      const matched = CMD.filter(p => p.test(content));
      if (matched.length >= 2) {
        matches.push({ patternId: 'suspicious-meta', patternName: 'Suspicious Meta Tag', severity: 20, location: `<meta name="${name}">`, extractedText: content.slice(0, 200), details: `${matched.length} command patterns` });
      }
    }
  });

  // ARIA-hidden
  const INSTR = [/\balways\b/i, /\bignore\b/i, /\bnever\b/i, /\boverride\b/i, /\binstruction/i, /\byou are\b/i, /\b무시\b/, /\b항상\b/, /\b지시\b/];
  $('[aria-hidden="true"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length < 50) return;
    const matched = INSTR.filter(p => p.test(text));
    if (matched.length < 2) return;
    matches.push({ patternId: 'aria-hidden', patternName: 'ARIA-hidden Instruction', severity: 15, location: (el as any).name || 'unknown', extractedText: text.slice(0, 200), details: `${matched.length} instruction keywords` });
  });

  // Zero-width — 숫자+단위 제외, 인젝션 키워드 없으면 하향
  const ZW = /[\u200B\u200C\u200D\uFEFF\u2060]/g;
  const NUMERIC_UNIT_RE = /^\d[\d.,]*\s*(mm|cm|km|kg|mg|ml|대|세|명|개|원|억|만|천|건|년|월|일|발|게이지)/i;
  $('body *').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length < 30) return;
    const zwc = (text.match(ZW) || []).length;
    if (zwc === 0) return;
    const ratio = zwc / text.length;
    if (ratio <= 0.05) return;
    const cleaned = text.replace(ZW, '').trim();
    if (NUMERIC_UNIT_RE.test(cleaned)) return;
    const hasCmd = INJECT_RE.test(cleaned);
    matches.push({ patternId: 'zero-width', patternName: 'Zero-Width Characters', severity: hasCmd ? 30 : 5, location: (el as any).name || 'unknown', extractedText: cleaned.slice(0, 200), details: `${zwc} zero-width chars (ratio: ${(ratio * 100).toFixed(1)}%)${hasCmd ? '' : ' — downgraded'}` });
  });

  return matches;
}

// PMI 매칭
interface PmiSignature { wordA: string; wordB: string; score: number; }

function loadSignatures(): PmiSignature[] {
  try {
    const p = resolve(process.cwd(), 'data/signatures.json');
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch { return []; }
}

function matchPmi(text: string) {
  const sigs = loadSignatures();
  if (sigs.length === 0) return { matchedPairs: [], totalScore: 0, topPairs: [] };
  const tokens = text.toLowerCase().replace(/[^\w\s가-힣]/g, ' ').split(/\s+/).filter(t => t.length >= 2);
  const pairs = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < Math.min(i + 5, tokens.length); j++) {
      const [a, b] = [tokens[i], tokens[j]].sort();
      pairs.add(`${a}|${b}`);
    }
  }
  const sigMap = new Map<string, PmiSignature>();
  for (const s of sigs) {
    const [a, b] = [s.wordA.toLowerCase(), s.wordB.toLowerCase()].sort();
    sigMap.set(`${a}|${b}`, s);
  }
  const matched: PmiSignature[] = [];
  for (const key of pairs) {
    const s = sigMap.get(key);
    if (s) matched.push(s);
  }
  matched.sort((a, b) => b.score - a.score);
  return { matchedPairs: matched, totalScore: matched.reduce((s, p) => s + p.score, 0), topPairs: matched.slice(0, 5) };
}

// Enriched fragment for Layer 2→3 handoff
interface EnrichedFragment {
  text: string;
  patternId: string;
  pmiScore: number;
  pmiTopPair?: string;
}

// Gemini LLM-as-Judge (PMI context 포함)
async function judgeFragments(fragments: string[], enriched?: EnrichedFragment[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || fragments.length === 0) return null;

  // 한국어 비율 감지
  const allText = fragments.join(' ');
  const koreanRatio = (allText.match(/[가-힣]/g)?.length ?? 0) / (allText.length || 1);

  let systemPrompt: string;
  try {
    const promptsRaw = readFileSync(resolve(process.cwd(), 'data/judge_prompts.json'), 'utf-8');
    const prompts = JSON.parse(promptsRaw).prompts;
    systemPrompt = koreanRatio > 0.3 ? prompts.korean : prompts.precision;
  } catch {
    systemPrompt = 'You are a security analyzer specializing in detecting prompt injection in web content.';
  }

  // enriched 정보를 포함한 프롬프트
  const fragsForPrompt = enriched || fragments.map(f => ({ text: f, patternId: 'unknown', pmiScore: 0, pmiTopPair: undefined as string | undefined }));
  const fragsText = fragsForPrompt.map((f, i) => {
    let entry = `[${i + 1}] fragment: "${f.text.slice(0, 400)}"`;
    entry += `\n    detected_pattern: ${f.patternId}`;
    entry += `\n    pmi_score: ${f.pmiScore.toFixed(1)}`;
    if (f.pmiTopPair) entry += `\n    pmi_top_pair: "${f.pmiTopPair}"`;
    return entry;
  }).join('\n\n');

  const prompt = `${systemPrompt}

Output JSON only:
{"fragments":[{"id":"frag_1","is_injection":true,"confidence":0.95,"category":"instruction-override","rationale":"one sentence"}]}
Categories: instruction-override, persona-hijack, data-exfil, bias-injection, system-leak, benign

Fragments:
${fragsText}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(raw);
    const frags = (parsed.fragments || []).map((f: any) => ({
      id: f.id || 'unknown', isInjection: f.is_injection ?? false,
      confidence: f.confidence ?? 0, category: f.category || 'benign', rationale: f.rationale || '',
    }));
    const highest = frags.reduce((m: number, f: any) => f.isInjection && f.confidence > m ? f.confidence : m, 0);
    const injCount = frags.filter((f: any) => f.isInjection).length;
    return {
      fragments: frags,
      overallVerdict: injCount === 0 ? 'benign' : highest >= 0.7 ? 'injection' : 'uncertain',
      highestConfidence: highest,
    };
  } catch { return null; }
}

function calcRiskLevel(score: number) {
  if (score <= 30) return 'clean';
  if (score <= 60) return 'suspicious';
  if (score <= 100) return 'high';
  return 'critical';
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const { html, url } = await req.json();
    if (!html || typeof html !== 'string') {
      return NextResponse.json({ error: 'html field required' }, { status: 400, headers: CORS_HEADERS });
    }

    // Layer 1: 정적 패턴
    const patterns = scanPatterns(html);

    // Layer 2: PMI
    const extractedTexts = patterns.map(p => p.extractedText);
    const combinedText = extractedTexts.join(' ');
    const pmi = combinedText.length > 0 ? matchPmi(combinedText) : { matchedPairs: [], totalScore: 0, topPairs: [] };

    // Layer 3: LLM-as-Judge (PMI 결과를 context로 전달)
    const enrichedForJudge: EnrichedFragment[] = patterns.map(p => {
      const fragPmi = matchPmi(p.extractedText);
      const topPair = fragPmi.topPairs[0];
      return {
        text: p.extractedText,
        patternId: p.patternId,
        pmiScore: fragPmi.totalScore,
        pmiTopPair: topPair ? `${topPair.wordA}+${topPair.wordB}` : undefined,
      };
    });
    const judge = extractedTexts.length > 0 ? await judgeFragments(extractedTexts, enrichedForJudge) : null;

    // === Severity 차등화: Layer 2+3로 노이즈 vs 진짜 위협 구분 ===
    let riskScore = 0;
    for (const p of patterns) {
      let adjustedSeverity = p.severity;

      // PMI에서 인젝션 시그니처가 매칭되면 severity 유지/부스트
      const hasInjectionSignature = pmi.matchedPairs.length > 0;

      // Judge가 benign이라고 판정하면 severity 50% 감소
      const judgeSaysBenign = judge && judge.overallVerdict === 'benign';
      const judgeSaysInjection = judge && judge.overallVerdict === 'injection';

      if (judgeSaysInjection && hasInjectionSignature) {
        // 3-layer 모두 동의: 진짜 위협 → severity 유지
        adjustedSeverity = p.severity;
      } else if (judgeSaysBenign && !hasInjectionSignature) {
        // PMI도 없고 Judge도 benign → 노이즈 가능성 높음 → 80% 감소
        adjustedSeverity = Math.round(p.severity * 0.2);
      } else if (!hasInjectionSignature) {
        // PMI 매칭 없음 → 50% 감소
        adjustedSeverity = Math.round(p.severity * 0.5);
      }

      p.severity = adjustedSeverity;
      riskScore += adjustedSeverity;
    }

    // PMI 부스트
    if (pmi.totalScore > 10) riskScore += Math.min(pmi.totalScore, 30);
    // Judge 부스트
    if (judge && judge.overallVerdict === 'injection') {
      riskScore += Math.round(judge.highestConfidence * 30);
    }

    return NextResponse.json({
      url: url || 'unknown',
      timestamp: new Date().toISOString(),
      riskScore,
      riskLevel: calcRiskLevel(riskScore),
      patterns,
      pmi,
      judge,
    }, { headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'scan failed' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
