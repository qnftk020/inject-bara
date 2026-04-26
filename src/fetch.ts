import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface FetchResult {
  url: string;
  html: string;
  statusCode: number;
}

export async function fetchPage(urlOrPath: string): Promise<FetchResult> {
  // 로컬 파일
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    const abs = resolve(urlOrPath);
    if (!existsSync(abs)) {
      throw new Error(`File not found: ${abs}`);
    }
    return { url: abs, html: readFileSync(abs, 'utf-8'), statusCode: 200 };
  }

  // URL fetch
  const res = await fetch(urlOrPath, {
    headers: { 'User-Agent': 'InjectScan/1.0' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${urlOrPath}`);
  }
  return { url: urlOrPath, html: await res.text(), statusCode: res.status };
}
