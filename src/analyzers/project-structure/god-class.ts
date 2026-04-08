import type { StructuralSignal, FileAnalysis } from "../types";
import { basename } from "path";

const IMPORT_THRESHOLD = 20;
const LINE_THRESHOLD = 500;

export function detectGodClass(fileResults: FileAnalysis[]): StructuralSignal[] {
  const signals: StructuralSignal[] = [];

  for (const file of fileResults) {
    const coupling = file.dimensions.coupling;
    const importCount = coupling?.evidence?.length ?? 0;

    if (importCount >= IMPORT_THRESHOLD && file.lineCount >= LINE_THRESHOLD) {
      const fileName = basename(file.filePath);
      signals.push({
        type: "god_class",
        severity: importCount >= 30 && file.lineCount >= 1000 ? "critical" : "high",
        description: `${fileName}이 과도한 의존성(import ${importCount}개)과 크기(${file.lineCount}줄)를 가짐`,
        suggestion: "책임을 분리하여 여러 클래스로 나누길 권장합니다",
        modules: [file.filePath],
      });
    }
  }

  return signals;
}
