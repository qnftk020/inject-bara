#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("injectscan")
  .description("Detect hidden prompt injection in web pages and documents")
  .version("0.1.0")
  .argument("<target>", "URL or file path to scan")
  .option("-j, --json", "Output results as JSON")
  .option("-s, --simulate", "Run simulation mode (Tier 2)")
  .option("-o, --output <file>", "Save results to file")
  .option("-v, --verbose", "Verbose logging")
  .action(async (target, options) => {
    // TODO: Lead가 scanner + report 연결
    console.log(`[InjectScan] Scanning: ${target}`);
    console.log(`[InjectScan] Options:`, options);
    console.log(`[InjectScan] Not yet implemented — waiting for Backend patterns + Frontend report`);
  });

program.parse();
