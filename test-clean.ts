import { scan } from './src/scanner.js';

const cleanHtml = `<!DOCTYPE html>
<html>
<head>
  <meta name="description" content="A technology company focused on innovation.">
  <meta name="og:title" content="Tech Corp">
</head>
<body>
  <h1>Welcome to Tech Corp</h1>
  <nav style="display: none;" class="mobile-menu">
    <a href="/about">About</a>
  </nav>
  <p>We build great products for our customers.</p>
  <span aria-hidden="true">\u00d7</span>
  <div style="color: #333; background-color: #fff;">
    <p>This is a normal paragraph with visible text.</p>
  </div>
  <footer>
    <p style="font-size: 12px;">Copyright 2026</p>
  </footer>
</body>
</html>`;

async function main() {
  const r = await scan('test://clean', cleanHtml);
  console.log('=== Clean Page Test ===');
  console.log('Risk Score:', r.riskScore);
  console.log('Risk Level:', r.riskLevel);
  console.log('Patterns found:', r.patterns.length);
  if (r.patterns.length > 0) {
    for (const p of r.patterns) {
      console.log('  FALSE POSITIVE:', p.patternId, '-', p.extractedText.slice(0, 60));
    }
  } else {
    console.log('No false positives!');
  }
}

main().catch(console.error);
