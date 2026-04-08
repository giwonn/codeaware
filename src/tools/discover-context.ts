import { scanFile } from "./scan-file";
import { generateQuestions } from "../context/question-generator";
import type { ContextQuestion } from "../context/types";

export async function discoverContext(filePath: string): Promise<ContextQuestion[]> {
  const analysis = await scanFile(filePath);
  const hiddenEvidence = analysis.dimensions.hiddenContext?.evidence ?? [];
  return generateQuestions(filePath, hiddenEvidence);
}
