export interface PatternMatch {
  patternId: string;
  patternName: string;
  severity: number;
  location: string;
  extractedText: string;
  details: string;
}

export type PatternScanner = (html: string) => PatternMatch[];
