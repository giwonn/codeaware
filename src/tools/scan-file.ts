import { readFileInfo } from "../parsers/file-reader";
import { HiddenContextAnalyzer } from "../analyzers/hidden-context";
import { NamingAnalyzer } from "../analyzers/naming";
import { DocumentationAnalyzer } from "../analyzers/documentation";
import { StructureAnalyzer } from "../analyzers/structure";
import { CouplingAnalyzer } from "../analyzers/coupling";
import { TestCoverageAnalyzer } from "../analyzers/test-coverage";
import { scoreFile } from "../scoring/file-scorer";
import { LEVEL_LABELS } from "../analyzers/types";
import type { FileAnalysis } from "../analyzers/types";

const analyzers = [
  new HiddenContextAnalyzer(),
  new NamingAnalyzer(),
  new DocumentationAnalyzer(),
  new StructureAnalyzer(),
  new CouplingAnalyzer(),
  new TestCoverageAnalyzer(),
];

export async function scanFile(filePath: string): Promise<FileAnalysis> {
  const file = await readFileInfo(filePath);
  const results = analyzers.map(a => a.analyze(file.content, file.path, file.language));
  const level = scoreFile(results);

  return {
    filePath: file.path,
    language: file.language,
    lineCount: file.lineCount,
    level,
    levelLabel: LEVEL_LABELS[level],
    dimensions: Object.fromEntries(
      results.map(r => [r.dimension, { score: r.score, evidence: r.evidence }]),
    ),
  };
}
