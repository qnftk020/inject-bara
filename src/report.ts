import chalk from 'chalk';
import type { ScanResult } from './scanner.js';

const RISK_ICONS: Record<ScanResult['riskLevel'], string> = {
  clean: chalk.green('✅ CLEAN'),
  suspicious: chalk.yellow('⚠️  SUSPICIOUS'),
  high: chalk.red('🚨 HIGH RISK'),
  critical: chalk.redBright.bold('🔴 CRITICAL'),
};

/** 콘솔 출력 (기본) */
export function printConsole(result: ScanResult): void {
  const icon = RISK_ICONS[result.riskLevel];
  const patternCount = result.patterns.length;

  console.log('');
  console.log(`${icon} — ${patternCount} injection pattern${patternCount !== 1 ? 's' : ''} detected`);
  console.log(chalk.dim(`  URL: ${result.url}`));
  console.log('');

  // 패턴 목록
  if (patternCount > 0) {
    result.patterns.forEach((p, i) => {
      const isLast = i === patternCount - 1;
      const prefix = isLast ? '  └─' : '  ├─';
      const truncated = p.extractedText.length > 60
        ? p.extractedText.slice(0, 60) + '...'
        : p.extractedText;
      console.log(`${prefix} ${chalk.bold(p.patternName)} ${chalk.dim(`(${p.location})`)}: "${truncated}"`);
      console.log(`  ${isLast ? '   ' : '│  '} ${chalk.dim(p.details)}`);
    });
    console.log('');
  }

  // Risk Score
  console.log(`  Risk Score: ${chalk.bold(String(result.riskScore))}/165`);
  console.log('');

  // PMI 결과
  if (result.pmi && result.pmi.matchedPairs.length > 0) {
    console.log(chalk.cyan('  PMI Signature Matches:'));
    for (const pair of result.pmi.topPairs) {
      console.log(`    ("${pair.wordA}", "${pair.wordB}") — pmi=${pair.score.toFixed(1)}`);
    }
    console.log('');
  }

  // LLM-as-Judge 결과
  if (result.judge) {
    const verdictColor = result.judge.overallVerdict === 'injection'
      ? chalk.red
      : result.judge.overallVerdict === 'uncertain'
        ? chalk.yellow
        : chalk.green;
    console.log(chalk.cyan('  LLM-as-Judge:'));
    console.log(`    Verdict: ${verdictColor(result.judge.overallVerdict.toUpperCase())} (confidence: ${result.judge.highestConfidence})`);
    for (const f of result.judge.fragments) {
      if (f.isInjection) {
        console.log(`    ${chalk.red('⚡')} [${f.id}] ${f.category} — ${f.rationale}`);
      }
    }
    console.log('');
  }

  // 시뮬레이션 결과
  if (result.simulation) {
    console.log(chalk.cyan('  Simulation (injection impact):'));
    console.log(`    Original: "${result.simulation.originalSummary.slice(0, 80)}..."`);
    console.log(`    Cleaned:  "${result.simulation.cleanedSummary.slice(0, 80)}..."`);
    console.log(`    Bias Delta: ${chalk.bold(String(result.simulation.biasDelta))} — ${result.simulation.biasDescription}`);
    console.log('');
  }
}

/** JSON 출력 (--json) */
export function printJson(result: ScanResult): void {
  console.log(JSON.stringify(result, null, 2));
}

/** 마크다운 리포트 (Tier 2) */
export function generateMarkdown(result: ScanResult): string {
  const lines: string[] = [];
  lines.push(`# InjectScan Report`);
  lines.push(`- **URL**: ${result.url}`);
  lines.push(`- **Time**: ${result.timestamp}`);
  lines.push(`- **Risk**: ${result.riskLevel.toUpperCase()} (${result.riskScore}/165)`);
  lines.push('');
  lines.push('## Detected Patterns');
  for (const p of result.patterns) {
    lines.push(`- **${p.patternName}** (${p.location}): "${p.extractedText.slice(0, 100)}"`);
    lines.push(`  - ${p.details}`);
  }
  if (result.pmi && result.pmi.matchedPairs.length > 0) {
    lines.push('');
    lines.push('## PMI Signatures');
    for (const pair of result.pmi.topPairs) {
      lines.push(`- ("${pair.wordA}", "${pair.wordB}") — score: ${pair.score.toFixed(1)}`);
    }
  }
  if (result.judge) {
    lines.push('');
    lines.push(`## LLM-as-Judge: ${result.judge.overallVerdict.toUpperCase()}`);
    for (const f of result.judge.fragments) {
      lines.push(`- [${f.id}] ${f.isInjection ? 'INJECTION' : 'benign'} (${f.confidence}) — ${f.category}: ${f.rationale}`);
    }
  }
  return lines.join('\n');
}
