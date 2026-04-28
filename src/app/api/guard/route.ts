import { NextRequest } from 'next/server';
import { guard } from '@/guard';
import { checkRateLimit, corsPreflight, jsonError, jsonOk, resolveHtmlInput } from '../_shared';

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (limited) return limited;
  try {
    const body = await req.json();
    const policy = body.policy ?? 'warn';
    const threshold = body.threshold ?? body.failOn ?? 'high';
    const { url, html } = await resolveHtmlInput(body);

    const result = await guard(url, html, {
      policy,
      threshold,
      simulate: body.simulate,
      verbose: body.verbose,
    });

    return jsonOk(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'guard failed';
    const status = message.includes('Provide either html or url') ? 400 : 500;
    return jsonError(err, message, status);
  }
}
