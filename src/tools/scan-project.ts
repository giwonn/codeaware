import { scanProject as scanFiles } from "../utils/glob-scanner";
import { scanFile } from "./scan-file";
import { scoreProject } from "../scoring/project-scorer";
import { LEVEL_LABELS } from "../analyzers/types";
import type { Level, FileAnalysis } from "../analyzers/types";

export interface ProjectAnalysis {
  rootDir: string;
  totalFiles: number;
  level: Level;
  levelLabel: string;
  levelDistribution: Record<number, number>;
  worstFiles: { filePath: string; level: Level; levelLabel: string }[];
}

export async function scanProjectTool(rootDir: string): Promise<ProjectAnalysis> {
  const filePaths = await scanFiles(rootDir);
  const BATCH_SIZE = 20;
  const fileResults: FileAnalysis[] = [];

  for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
    const batch = filePaths.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(fp => scanFile(fp)));
    fileResults.push(...results);
  }

  const fileLevels = fileResults.map(f => f.level);
  const level = scoreProject(fileLevels);

  const levelDistribution: Record<number, number> = {};
  for (const l of fileLevels) {
    levelDistribution[l] = (levelDistribution[l] ?? 0) + 1;
  }

  const worstFiles = [...fileResults]
    .sort((a, b) => b.level - a.level)
    .slice(0, 10)
    .map(f => ({ filePath: f.filePath, level: f.level, levelLabel: f.levelLabel }));

  return {
    rootDir,
    totalFiles: filePaths.length,
    level,
    levelLabel: LEVEL_LABELS[level],
    levelDistribution,
    worstFiles,
  };
}
