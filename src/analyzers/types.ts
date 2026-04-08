export type Severity = "low" | "medium" | "high" | "critical";
export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export interface Evidence {
  line: number;
  code: string;
  signal: string;
  explanation: string;
  severity: Severity;
}

export interface AnalyzerResult {
  dimension: string;
  score: number; // 0.0 (perfect) ~ 1.0 (terrible)
  evidence: Evidence[];
}

export interface Analyzer {
  analyze(content: string, filePath: string, language: string): AnalyzerResult;
}

export interface FileAnalysis {
  filePath: string;
  language: string;
  lineCount: number;
  level: Level;
  levelLabel: string;
  dimensions: Record<string, { score: number; evidence: Evidence[] }>;
}

export type StructuralSignalType =
  | "excessive_responsibility"
  | "domain_duplication"
  | "layer_inconsistency"
  | "dependency_violation"
  | "circular_dependency"
  | "god_class";

export interface StructuralSignal {
  type: StructuralSignalType;
  severity: Severity;
  description: string;
  suggestion: string;
  modules: string[];
}

export const LEVEL_LABELS: Record<Level, string> = {
  1: "Well-organized",
  2: "Mostly good",
  3: "Mixed patterns",
  4: "Difficult",
  5: "Hidden context dependency",
  6: "Incomprehensible",
};
