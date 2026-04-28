import { NextRequest, NextResponse } from 'next/server';
import { fetchPage } from '@/fetch';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Simple in-memory rate limiter (per IP, 30 requests per minute)
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;
const ipHits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(req: NextRequest): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return null;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: CORS_HEADERS },
    );
  }
  return null;
}

export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function jsonOk<T>(body: T) {
  return NextResponse.json(body, { headers: CORS_HEADERS });
}

export function jsonError(error: unknown, fallback: string, status = 500) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json(
    { error: message },
    { status, headers: CORS_HEADERS },
  );
}

export async function resolveHtmlInput(body: any): Promise<{ url: string; html: string }> {
  if (typeof body?.html === 'string' && body.html.length > 0) {
    return { url: body.url || 'inline://html', html: body.html };
  }

  if (typeof body?.url === 'string' && body.url.length > 0) {
    const fetched = await fetchPage(body.url, {
      browser: body.browser,
      verbose: body.verbose,
    });
    return { url: fetched.url, html: fetched.html };
  }

  throw new Error('Provide either html or url');
}
