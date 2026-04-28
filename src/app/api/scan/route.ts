import { NextRequest } from 'next/server';
import { scan } from '@/scanner';
import { checkRateLimit, corsPreflight, jsonError, jsonOk, resolveHtmlInput } from '../_shared';

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req);
  if (limited) return limited;
  try {
    const body = await req.json();
    const { url, html } = await resolveHtmlInput(body);

    const result = await scan(url, html, {
      simulate: body.simulate,
      verbose: body.verbose,
    });

    return jsonOk(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'scan failed';
    const status = message.includes('Provide either html or url') ? 400 : 500;
    return jsonError(err, message, status);
  }
}
