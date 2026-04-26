import type { ScanResult } from "./scanner.js";

// TODO: Frontend가 구현
// 콘솔 출력 (기본)
export function printConsole(result: ScanResult): void {
  throw new Error("Not yet implemented — Frontend task");
}

// JSON 출력 (--json)
export function printJson(result: ScanResult): void {
  console.log(JSON.stringify(result, null, 2));
}

// 마크다운 리포트 (Tier 2)
export function generateMarkdown(result: ScanResult): string {
  throw new Error("Not yet implemented — Frontend Tier 2 task");
}
