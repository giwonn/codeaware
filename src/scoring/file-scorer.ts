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

  // Weighted sum — skip dimensions with score -1 (not applicable) and redistribute weight
  let weighted = 0;
  let totalWeight = 0;
  for (const [dim, weight] of Object.entries(WEIGHTS)) {
    const s = scoreMap[dim] ?? 0;
    if (s < 0) continue; // skip N/A dimensions
    weighted += s * weight;
    totalWeight += weight;
  }
  if (totalWeight > 0 && totalWeight < 1) {
    weighted = weighted / totalWeight; // normalize to 0-1 range
  }

  // Map 0.0-1.0 to Level 1-6
  const raw = Math.floor(weighted * 5) + 1;
  let level = Math.max(1, Math.min(6, raw)) as Level;

  // Hidden context override: min level 5
  if (hc >= 0.5) level = Math.max(5, level) as Level;

  return level;
}
