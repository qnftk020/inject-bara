import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface FetchResult {
  url: string;
  html: string;
  statusCode: number;
}

export async function fetchPage(urlOrPath: string, useBrowser = false): Promise<FetchResult> {
  // 로컬 파일
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    const abs = resolve(urlOrPath);
    if (!existsSync(abs)) {
      throw new Error(`File not found: ${abs}`);
    }
    return { url: abs, html: readFileSync(abs, 'utf-8'), statusCode: 200 };
  }

  // --browser 플래그면 바로 Playwright
  if (useBrowser) {
    return fetchWithBrowser(urlOrPath);
  }

  // 기본: fetch → 403이면 Playwright 자동 폴백
  const res = await fetch(urlOrPath, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 403) {
    console.error('[InjectScan] 403 blocked — retrying with headless browser...');
    return fetchWithBrowser(urlOrPath);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${urlOrPath}`);
  }
  return { url: urlOrPath, html: await res.text(), statusCode: res.status };
}

async function fetchWithBrowser(url: string): Promise<FetchResult> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    const html = await page.content();
    return { url, html, statusCode: response?.status() ?? 200 };
  } finally {
    await browser.close();
  }
}
