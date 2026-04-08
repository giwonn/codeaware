import { scanProject } from "../utils/glob-scanner";
import { scanFile } from "./scan-file";
import { generateRoadmap } from "../roadmap/roadmap-generator";
import type { Roadmap } from "../roadmap/roadmap-generator";

export async function getImprovementRoadmap(rootDir: string): Promise<Roadmap> {
  const BATCH_SIZE = 20;
  const filePaths = await scanProject(rootDir);
  const fileResults = [];
  for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
    const batch = filePaths.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(fp => scanFile(fp)));
    fileResults.push(...results);
  }
  return generateRoadmap(fileResults);
}
