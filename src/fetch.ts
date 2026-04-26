import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface FetchResult {
  url: string;
  html: string;
  statusCode: number;
}

export interface FetchOptions {
  browser?: boolean;
  verbose?: boolean;
}

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const BOT_BLOCK_CODES = new Set([403, 406, 429, 503]);

async function fetchWithHttp(url: string): Promise<FetchResult> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return { url, html: await res.text(), statusCode: res.status };
}

async function fetchWithPlaywright(url: string, verbose?: boolean): Promise<FetchResult> {
  if (verbose) console.error('[fetch] Using Playwright headless browser...');
  // Dynamic import — Playwright가 없으면 에러
  let chromium: any;
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch {
    throw new Error(
      'Playwright not installed. Run: npx playwright install chromium\n' +
      'Or use a local HTML file instead of a URL.'
    );
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const html = await page.content();
    return { url, html, statusCode: response?.status() ?? 200 };
  } finally {
    await browser.close();
  }
}

export async function fetchPage(urlOrPath: string, options?: FetchOptions): Promise<FetchResult> {
  // 로컬 파일
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    const abs = resolve(urlOrPath);
    if (!existsSync(abs)) {
      throw new Error(`File not found: ${abs}`);
    }
    return { url: abs, html: readFileSync(abs, 'utf-8'), statusCode: 200 };
  }

  // --browser 플래그: 바로 Playwright
  if (options?.browser) {
    return fetchWithPlaywright(urlOrPath, options.verbose);
  }

  // Auto-fallback: HTTP 먼저, 403이면 Playwright 재시도
  try {
    return await fetchWithHttp(urlOrPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const statusMatch = msg.match(/HTTP (\d+)/);
    const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;

    if (BOT_BLOCK_CODES.has(statusCode)) {
      if (options?.verbose) {
        console.error(`[fetch] HTTP ${statusCode} — bot protection detected, retrying with Playwright...`);
      }
      try {
        return await fetchWithPlaywright(urlOrPath, options?.verbose);
      } catch (pwErr) {
        throw new Error(
          `Bot protection detected (HTTP ${statusCode}). ` +
          `Playwright fallback also failed: ${pwErr instanceof Error ? pwErr.message : pwErr}\n` +
          `Try: npx playwright install chromium`
        );
      }
    }

    throw new Error(`Failed to fetch ${urlOrPath}: ${msg}`);
  }
}
