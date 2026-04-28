import { NextRequest } from 'next/server';
import { checkInjectionEmbedding } from '@/embedding';
import { hasApiKey, judge, type EnrichedFragment } from '@/judge';
import { matchPmi } from '@/pmi/match';
import { checkRateLimit, corsPreflight, jsonError, jsonOk } from '../_shared';

interface JudgeRequestFragment {
  text: string;
  patternId?: string;
  location?: string;
}

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (limited) return limited;
  try {
    const { fragments, url } = await req.json();
    if (!Array.isArray(fragments) || fragments.length === 0) {
      return jsonError(new Error('fragments array required'), 'fragments array required', 400);
    }

    const normalized = normalizeFragments(fragments);
    if (normalized.length === 0) {
      return jsonError(new Error('fragments must include text'), 'fragments must include text', 400);
    }

    const fragmentTexts = normalized.map(fragment => fragment.text);
    const pmi = matchPmi(fragmentTexts.join(' '));
    const enriched = enrichFragments(normalized);

    const [embedding, judgeResult] = hasApiKey()
      ? await Promise.all([
          checkInjectionEmbedding(fragmentTexts).catch(() => null),
          judge(fragmentTexts, enriched).catch(() => null),
        ])
      : [null, null];

    return jsonOk({
      url,
      pmi,
      embedding,
      judge: judgeResult,
    });
  } catch (err: unknown) {
    return jsonError(err, 'judge failed');
  }
}

function normalizeFragments(fragments: any[]): JudgeRequestFragment[] {
  return fragments
    .map(fragment => ({
      text: typeof fragment?.text === 'string' ? fragment.text : '',
      patternId: typeof fragment?.patternId === 'string' ? fragment.patternId : 'unknown',
      location: typeof fragment?.location === 'string' ? fragment.location : 'unknown',
    }))
    .filter(fragment => fragment.text.length > 0);
}

function enrichFragments(fragments: JudgeRequestFragment[]): EnrichedFragment[] {
  return fragments.map(fragment => {
    const pmi = matchPmi(fragment.text);
    const topPair = pmi.topPairs[0];

    return {
      text: fragment.text,
      patternId: fragment.patternId || 'unknown',
      location: fragment.location || 'unknown',
      pmiScore: pmi.totalScore,
      pmiTopPair: topPair ? `${topPair.wordA}+${topPair.wordB}` : undefined,
    };
  });
}
