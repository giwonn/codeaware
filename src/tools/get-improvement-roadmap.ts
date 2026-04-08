import { scanProject } from "../utils/glob-scanner";
import { scanFile } from "./scan-file";
import { generateRoadmap } from "../roadmap/roadmap-generator";
import type { Roadmap } from "../roadmap/roadmap-generator";

export async function getImprovementRoadmap(rootDir: string): Promise<Roadmap> {
  const filePaths = await scanProject(rootDir);
  const fileResults = [];
  for (const fp of filePaths) {
    fileResults.push(await scanFile(fp));
  }
  return generateRoadmap(fileResults);
}
