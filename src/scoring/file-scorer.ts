import type { AnalyzerResult, Level } from "../analyzers/types";

const WEIGHTS: Record<string, number> = {
  naming: 0.10,
  structure: 0.15,
  coupling: 0.15,
  hiddenContext: 0.35,
  documentation: 0.15,
  testCoverage: 0.10,
};

export function scoreFile(results: AnalyzerResult[]): Level {
  const scoreMap = Object.fromEntries(results.map(r => [r.dimension, r.score]));

  // Hidden context override: critical threshold
  const hc = scoreMap.hiddenContext ?? 0;
  if (hc >= 0.7) return 6;

  // Weighted sum
  let weighted = 0;
  for (const [dim, weight] of Object.entries(WEIGHTS)) {
    weighted += (scoreMap[dim] ?? 0) * weight;
  }

  // Map 0.0-1.0 to Level 1-6
  const raw = Math.floor(weighted * 5) + 1;
  let level = Math.max(1, Math.min(6, raw)) as Level;

  // Hidden context override: min level 5
  if (hc >= 0.5) level = Math.max(5, level) as Level;

  return level;
}
