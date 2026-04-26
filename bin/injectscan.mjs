#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { fetchPage } from '../src/fetch.ts';
import { scan } from '../src/scanner.ts';
import { printConsole, printJson } from '../src/report.ts';
import { writeFileSync } from 'fs';

const program = new Command();

program
  .name('injectscan')
  .description('Detect hidden prompt injection in web pages and documents')
  .version('0.1.0')
  .argument('<target>', 'URL or file path to scan')
  .option('-j, --json', 'Output results as JSON')
  .option('-s, --simulate', 'Run simulation mode (Tier 2)')
  .option('-o, --output <file>', 'Save results to file')
  .option('-v, --verbose', 'Verbose logging')
  .action(async (target, options) => {
    try {
      // 1. Fetch HTML
      if (options.verbose) console.error(`[InjectScan] Fetching: ${target}`);
      const { url, html } = await fetchPage(target);

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
      } else {
        printConsole(result);
      }

      // 4. File output
      if (options.output) {
        const content = JSON.stringify(result, null, 2);
        writeFileSync(options.output, content, 'utf-8');
        console.error(`[InjectScan] Results saved to ${options.output}`);
      }

      // Exit code: non-zero if high/critical
      if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
        process.exit(1);
      }
    } catch (err) {
      console.error(`[InjectScan] Error: ${err instanceof Error ? err.message : err}`);
      process.exit(2);
    }
  });

program.parse();
