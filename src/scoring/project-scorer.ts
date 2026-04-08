import type { Level } from "../analyzers/types";

export function scoreProject(fileLevels: Level[]): Level {
  if (fileLevels.length === 0) return 1;

  const sorted = [...fileLevels].sort((a, b) => b - a); // worst first
  const worstCount = Math.max(1, Math.ceil(sorted.length * 0.25));
  const worstSlice = sorted.slice(0, worstCount);
  const restSlice = sorted.slice(worstCount);

  const worstAvg = worstSlice.reduce((a, b) => a + b, 0) / worstSlice.length;
  const restAvg = restSlice.length > 0
    ? restSlice.reduce((a, b) => a + b, 0) / restSlice.length
    : 0;

  const weighted = worstAvg * 0.6 + restAvg * 0.4;
  return Math.max(1, Math.min(6, Math.round(weighted))) as Level;
}
