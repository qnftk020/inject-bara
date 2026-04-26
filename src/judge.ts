// TODO: Backend Tier 2 — Gemini LLM-as-Judge + Simulation

export interface JudgeFragment {
  id: string;
  isInjection: boolean;
  confidence: number;
  category:
    | "instruction-override"
    | "persona-hijack"
    | "data-exfil"
    | "bias-injection"
    | "system-leak"
    | "benign";
  rationale: string;
}

export interface JudgeResult {
  fragments: JudgeFragment[];
  overallVerdict: "injection" | "benign" | "uncertain";
  highestConfidence: number;
}

export interface SimResult {
  originalSummary: string;
  cleanedSummary: string;
  biasDelta: number;
  biasDescription: string;
}

export async function judge(fragments: string[]): Promise<JudgeResult> {
  throw new Error("Not yet implemented — Backend Tier 2 task");
}

export async function simulate(
  url: string,
  injectedTexts: string[]
): Promise<SimResult> {
  throw new Error("Not yet implemented — Backend Tier 2 task");
}
