import { resolve } from "path";
import type { StructuralSignal } from "../types";
import type { ModuleInfo } from "./module-resolver";
import { parseImports } from "./import-parser";
import { detectLanguage } from "../../parsers/language-detector";

// Lower index = lower layer (should not depend on higher)
const LAYER_KEYWORDS: string[][] = [
  ["domain", "entity", "model", "core"],            // 0: domain
  ["application", "usecase", "service", "services"], // 1: application
  ["infrastructure", "infra", "repository", "persistence"], // 2: infrastructure
  ["presentation", "controller", "api", "admin", "svc", "web", "gateway"], // 3: presentation
];

function inferLayerRank(moduleName: string): number {
  const lower = moduleName.toLowerCase();
  for (let rank = 0; rank < LAYER_KEYWORDS.length; rank++) {
    if (LAYER_KEYWORDS[rank].some(kw => lower.includes(kw))) {
      return rank;
    }
  }
  return -1;
}

function moduleKeywords(moduleName: string): string[] {
  // Extract meaningful parts: "module-domain" → ["module-domain", "domain"]
  const lower = moduleName.toLowerCase();
  const parts = lower.split(/[-_]/);
  const keywords = [lower, ...parts.filter(p => p.length > 2)];
  return [...new Set(keywords)];
}

function findModuleForImport(importPath: string, modules: ModuleInfo[]): string | null {
  const lower = importPath.toLowerCase();
  for (const mod of modules) {
    for (const kw of moduleKeywords(mod.name)) {
      // Match as a word segment (e.g. ".admin." or ".admin" at end)
      if (lower.includes(`.${kw}.`) || lower.endsWith(`.${kw}`) || lower.startsWith(`${kw}.`)) {
        return mod.name;
      }
    }
  }
  return null;
}

export async function detectDependencyViolation(
  filePaths: string[],
  modules: ModuleInfo[],
): Promise<StructuralSignal[]> {
  const violations = new Map<string, { from: string; to: string; count: number }>();

  for (const mod of modules) {
    const sourceRank = inferLayerRank(mod.name);
    if (sourceRank < 0) continue;

    const resolvedModPath = resolve(mod.path);
    const moduleFiles = filePaths.filter(fp => resolve(fp).startsWith(resolvedModPath));

    for (const fp of moduleFiles) {
      const language = detectLanguage(fp);
      if (language === "unknown") continue;

      let content: string;
      try {
        content = await Bun.file(resolve(fp)).text();
      } catch {
        continue;
      }

      const imports = parseImports(content, language);

      for (const imp of imports) {
        const targetModule = findModuleForImport(imp, modules);
        if (!targetModule || targetModule === mod.name) continue;

        const targetRank = inferLayerRank(targetModule);
        if (targetRank < 0) continue;

        if (sourceRank < targetRank) {
          const key = `${mod.name}->${targetModule}`;
          const existing = violations.get(key);
          if (existing) {
            existing.count++;
          } else {
            violations.set(key, { from: mod.name, to: targetModule, count: 1 });
          }
        }
      }
    }
  }

  return [...violations.values()].map(v => ({
    type: "dependency_violation" as const,
    severity: v.count >= 10 ? "critical" : v.count >= 3 ? "high" : "medium",
    description: `${v.from}이 상위 계층 ${v.to}을 참조 (${v.count}건)`,
    suggestion: "의존성 방향을 역전하거나 인터페이스를 통한 간접 참조를 권장합니다",
    modules: [v.from, v.to],
  }));
}
