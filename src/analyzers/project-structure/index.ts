import type { StructuralSignal, FileAnalysis } from "../types";
import { resolveModules } from "./module-resolver";
import { detectExcessiveResponsibility } from "./excessive-responsibility";
import { detectDomainDuplication } from "./domain-duplication";
import { detectLayerInconsistency } from "./layer-inconsistency";
import { detectDependencyViolation } from "./dependency-violation";
import { detectCircularDependency } from "./circular-dependency";
import { detectGodClass } from "./god-class";

export async function analyzeProjectStructure(
  rootDir: string,
  filePaths: string[],
  fileResults: FileAnalysis[],
): Promise<StructuralSignal[]> {
  const modules = resolveModules(rootDir);

  if (modules.length < 2) {
    return detectGodClass(fileResults);
  }

  const [depViolations, circularDeps] = await Promise.all([
    detectDependencyViolation(filePaths, modules),
    detectCircularDependency(filePaths, modules),
  ]);

  return [
    ...detectExcessiveResponsibility(filePaths, modules),
    ...detectDomainDuplication(filePaths, modules),
    ...detectLayerInconsistency(filePaths, modules),
    ...depViolations,
    ...circularDeps,
    ...detectGodClass(fileResults),
  ];
}
