#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { fetchPage } from '../src/fetch.ts';
import { scan } from '../src/scanner.ts';
import { printConsole, printJson, generateMarkdown } from '../src/report.ts';
import { writeFileSync } from 'fs';

const program = new Command();

program
  .name('injectscan')
  .description('Detect hidden prompt injection in web pages and documents')
  .version('0.1.0')
  .argument('<target>', 'URL or file path to scan')
  .option('-j, --json', 'Output results as JSON')
  .option('-s, --simulate', 'Run simulation mode (Tier 2)')
  .option('-m, --markdown', 'Output results as Markdown')
  .option('-b, --browser [engine]', 'Use headless browser: auto|playwright|lightpanda (default: auto)')
  .option('-o, --output <file>', 'Save results to file')
  .option('-v, --verbose', 'Verbose logging')
  .action(async (target, options) => {
    try {
      // 1. Fetch HTML
      if (options.verbose) console.error(`[InjectScan] Fetching: ${target}`);
      const { url, html } = await fetchPage(target, {
        browser: options.browser,
        verbose: options.verbose,
      });

      // 2. Scan
      if (options.verbose) console.error(`[InjectScan] Scanning...`);
      const result = await scan(url, html, {
        json: options.json,
        simulate: options.simulate,
        verbose: options.verbose,
      });

      // 3. Output
      if (options.json) {
        printJson(result);
      } else if (options.markdown) {
        console.log(generateMarkdown(result));
      } else {
        printConsole(result);
      }

      // 4. File output
      if (options.output) {
        const content = options.markdown
          ? generateMarkdown(result)
          : JSON.stringify(result, null, 2);
        writeFileSync(options.output, content, 'utf-8');
        console.error(`[InjectScan] Results saved to ${options.output}`);
      }

      // Exit code: non-zero if high/critical
      if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
        process.exit(1);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('HTTP 403') || msg.includes('HTTP 406')) {
        console.error(`[InjectScan] ❌ 봇 차단: 이 사이트는 자동화된 접근을 차단합니다.`);
        console.error(`  → --browser 옵션으로 재시도: npm run scan -- --browser ${target}`);
      } else if (msg.includes('HTTP 5')) {
        console.error(`[InjectScan] ❌ 서버 오류: 대상 사이트가 응답하지 않습니다 (${msg})`);
      } else if (msg.includes('timeout') || msg.includes('Timeout')) {
        console.error(`[InjectScan] ❌ 시간 초과: 사이트가 응답하지 않습니다. 네트워크를 확인하세요.`);
      } else if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
        console.error(`[InjectScan] ❌ DNS 실패: 사이트를 찾을 수 없습니다. URL을 확인하세요.`);
      } else {
        console.error(`[InjectScan] ❌ 오류: ${msg}`);
      }
      process.exit(2);
    }
  });

program.parse();
