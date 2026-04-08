import type { StructuralSignal } from "../types";
import type { ModuleInfo } from "./module-resolver";
import { relative, resolve } from "path";

const DDD_MARKERS = new Set(["domain", "application", "usecase", "infrastructure", "port", "adapter"]);
const TRADITIONAL_MARKERS = new Set(["controller", "controllers", "service", "services", "repository", "repositories", "dao"]);

type LayerPattern = "ddd" | "traditional" | "unknown";

function detectPattern(filePaths: string[], mod: ModuleInfo): LayerPattern {
  let dddScore = 0;
  let traditionalScore = 0;

  for (const fp of filePaths) {
    const rel = relative(mod.path, resolve(fp));
    const parts = rel.split("/").map(p => p.toLowerCase());
    for (const part of parts) {
      if (DDD_MARKERS.has(part)) dddScore++;
      if (TRADITIONAL_MARKERS.has(part)) traditionalScore++;
    }
  }

  if (dddScore === 0 && traditionalScore === 0) return "unknown";
  if (dddScore > traditionalScore) return "ddd";
  if (traditionalScore > dddScore) return "traditional";
  return "unknown";
}

export function detectLayerInconsistency(
  filePaths: string[],
  modules: ModuleInfo[],
): StructuralSignal[] {
  const modulePatterns = new Map<string, LayerPattern>();

  for (const mod of modules) {
    const moduleFiles = filePaths.filter(fp => resolve(fp).startsWith(mod.path));
    if (moduleFiles.length === 0) continue;
    modulePatterns.set(mod.name, detectPattern(moduleFiles, mod));
  }

  const dddModules = [...modulePatterns.entries()].filter(([, p]) => p === "ddd").map(([n]) => n);
  const tradModules = [...modulePatterns.entries()].filter(([, p]) => p === "traditional").map(([n]) => n);

  if (dddModules.length > 0 && tradModules.length > 0) {
    return [{
      type: "layer_inconsistency",
      severity: "medium",
      description: `계층 구조 불일치: DDD 패턴(${dddModules.join(", ")}) vs 전통 패턴(${tradModules.join(", ")})`,
      suggestion: "모듈 간 계층 구조가 불일치합니다. 통일된 아키텍처 패턴 적용을 권장합니다",
      modules: [...dddModules, ...tradModules].sort(),
    }];
  }

  return [];
}
