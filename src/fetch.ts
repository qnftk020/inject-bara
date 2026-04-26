import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

export interface FetchResult {
  url: string;
  html: string;
  statusCode: number;
}

export interface FetchOptions {
  browser?: string;  // 'auto' | 'http' | 'playwright' | 'lightpanda' | boolean
  verbose?: boolean;
}

// --- Browser Adapter Interface ---

interface BrowserAdapter {
  name: string;
  available(): Promise<boolean>;
  fetch(url: string, verbose?: boolean): Promise<FetchResult>;
}

// --- HTTP Adapter (native fetch, no browser) ---

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const httpAdapter: BrowserAdapter = {
  name: 'http',
  async available() { return true; },
  async fetch(url) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { url, html: await res.text(), statusCode: res.status };
  },
};

// --- Playwright Adapter ---

const playwrightAdapter: BrowserAdapter = {
  name: 'playwright',
  async available() {
    try {
      await import('playwright');
      return true;
    } catch { return false; }
  },
  async fetch(url, verbose) {
    if (verbose) console.error('[fetch] Using Playwright headless browser...');
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      const html = await page.content();
      return { url, html, statusCode: response?.status() ?? 200 };
    } finally {
      await browser.close();
    }
  },
};

// --- Lightpanda Adapter ---

const lightpandaAdapter: BrowserAdapter = {
  name: 'lightpanda',
  async available() {
    try {
      execSync('which lightpanda', { stdio: 'ignore' });
      return true;
    } catch { return false; }
  },
  async fetch(url, verbose) {
    if (verbose) console.error('[fetch] Using Lightpanda browser...');
    // Lightpanda: WebDriver-compatible, 또는 CLI fetch 모드
    // 1) WebDriver 방식 (Playwright의 CDP와 호환)
    try {
      const { chromium } = await import('playwright');
      // Lightpanda가 CDP 서버를 제공하는 경우
      const cdpUrl = process.env.LIGHTPANDA_CDP_URL;
      if (cdpUrl) {
        const browser = await chromium.connectOverCDP(cdpUrl);
        try {
          const context = browser.contexts()[0] || await browser.newContext();
          const page = await context.newPage();
          const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
          const html = await page.content();
          return { url, html, statusCode: response?.status() ?? 200 };
        } finally {
          await browser.close();
        }
      }
    } catch { /* CDP 방식 실패 → CLI 폴백 */ }

    // 2) CLI 방식: lightpanda fetch <url>
    try {
      const html = execSync(`lightpanda fetch "${url}"`, {
        timeout: 20_000,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      });
      return { url, html, statusCode: 200 };
    } catch (err) {
      throw new Error(`Lightpanda fetch failed: ${err instanceof Error ? err.message : err}`);
    }
  },
};

// --- Adapter Registry ---

const ADAPTERS: Record<string, BrowserAdapter> = {
  http: httpAdapter,
  playwright: playwrightAdapter,
  lightpanda: lightpandaAdapter,
};

const BOT_BLOCK_CODES = new Set([403, 406, 429, 503]);

/** 사용 가능한 브라우저 어댑터 목록 반환 */
export async function listAvailableBrowsers(): Promise<string[]> {
  const available: string[] = [];
  for (const [name, adapter] of Object.entries(ADAPTERS)) {
    if (await adapter.available()) available.push(name);
  }
  return available;
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

  // 브라우저 지정 시 해당 어댑터 직접 사용
  const browserChoice = typeof options?.browser === 'string' ? options.browser
    : options?.browser === true ? 'auto' : undefined;

  if (browserChoice && browserChoice !== 'auto' && ADAPTERS[browserChoice]) {
    const adapter = ADAPTERS[browserChoice];
    if (!(await adapter.available())) {
      throw new Error(
        `Browser "${browserChoice}" is not available.\n` +
        `Install: ${browserChoice === 'playwright' ? 'npx playwright install chromium' : `install ${browserChoice}`}`
      );
    }
    return adapter.fetch(urlOrPath, options?.verbose);
  }

  // Auto-fallback: http → playwright → lightpanda
  try {
    return await httpAdapter.fetch(urlOrPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const statusMatch = msg.match(/HTTP (\d+)/);
    const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;

    if (!BOT_BLOCK_CODES.has(statusCode)) {
      throw new Error(`Failed to fetch ${urlOrPath}: ${msg}`);
    }

    if (options?.verbose) {
      console.error(`[fetch] HTTP ${statusCode} — bot protection detected, trying browser fallback...`);
    }

    // 사용 가능한 브라우저 어댑터 순서대로 시도
    const fallbackOrder = ['playwright', 'lightpanda'];
    for (const name of fallbackOrder) {
      const adapter = ADAPTERS[name];
      if (await adapter.available()) {
        try {
          return await adapter.fetch(urlOrPath, options?.verbose);
        } catch (adapterErr) {
          if (options?.verbose) {
            console.error(`[fetch] ${name} fallback failed:`, adapterErr instanceof Error ? adapterErr.message : adapterErr);
          }
          continue;
        }
      }
    }

    const available = await listAvailableBrowsers();
    throw new Error(
      `Bot protection detected (HTTP ${statusCode}). No browser adapter available.\n` +
      `Available: [${available.join(', ')}]\n` +
      `Install: npx playwright install chromium  OR  brew install nicholasgasior/lightpanda/lightpanda`
    );
  }
}
