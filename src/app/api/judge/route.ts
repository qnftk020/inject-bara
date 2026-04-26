import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// PMI
interface PmiSignature { wordA: string; wordB: string; score: number; }

function loadSignatures(): PmiSignature[] {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), 'data/signatures.json'), 'utf-8'));
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

// Gemini Judge
async function judgeFragments(fragments: { text: string; patternId: string; pmiScore: number; pmiTopPair?: string }[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || fragments.length === 0) return null;

  const allText = fragments.map(f => f.text).join(' ');
  const koreanRatio = (allText.match(/[가-힣]/g)?.length ?? 0) / (allText.length || 1);

  let systemPrompt: string;
  try {
    const prompts = JSON.parse(readFileSync(resolve(process.cwd(), 'data/judge_prompts.json'), 'utf-8')).prompts;
    systemPrompt = koreanRatio > 0.3 ? prompts.korean : prompts.precision;
  } catch {
    systemPrompt = 'You are a security analyzer specializing in detecting prompt injection in web content.';
  }

  const fragsText = fragments.map((f, i) => {
    let entry = `[${i + 1}] fragment: "${f.text.slice(0, 400)}"`;
    entry += `\n    detected_pattern: ${f.patternId}`;
    entry += `\n    pmi_score: ${f.pmiScore.toFixed(1)}`;
    if (f.pmiTopPair) entry += `\n    pmi_top_pair: "${f.pmiTopPair}"`;
    return entry;
  }).join('\n\n');

  const prompt = `${systemPrompt}\n\nOutput JSON only:\n{"fragments":[{"id":"frag_1","is_injection":true,"confidence":0.95,"category":"instruction-override","rationale":"one sentence"}]}\nCategories: instruction-override, persona-hijack, data-exfil, bias-injection, system-leak, benign\n\nFragments:\n${fragsText}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(15000),
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

export async function POST(req: NextRequest) {
  try {
    const { fragments, url } = await req.json();
    if (!fragments || !Array.isArray(fragments) || fragments.length === 0) {
      return NextResponse.json({ error: 'fragments array required' }, { status: 400, headers: CORS_HEADERS });
    }

    // Layer 2: PMI per fragment
    const combinedText = fragments.map((f: any) => f.text).join(' ');
    const pmi = matchPmi(combinedText);

    // Enrich fragments with PMI
    const enriched = fragments.map((f: any) => {
      const fragPmi = matchPmi(f.text);
      const topPair = fragPmi.topPairs[0];
      return {
        text: f.text,
        patternId: f.patternId || 'unknown',
        pmiScore: fragPmi.totalScore,
        pmiTopPair: topPair ? `${topPair.wordA}+${topPair.wordB}` : undefined,
      };
    });

    // Layer 3: LLM Judge
    const judge = await judgeFragments(enriched);

    return NextResponse.json({ pmi, judge, url }, { headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: CORS_HEADERS });
  }
}
