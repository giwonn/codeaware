import { resolve } from "path";
import type { StructuralSignal } from "../types";
import type { ModuleInfo } from "./module-resolver";
import { parseImports } from "./import-parser";
import { detectLanguage } from "../../parsers/language-detector";

function moduleKeywords(moduleName: string): string[] {
  // Extract meaningful parts: "module-a" → ["module-a", "a"]
  const lower = moduleName.toLowerCase();
  const parts = lower.split(/[-_]/);
  const keywords = [lower, ...parts.filter(p => p.length > 0)];
  return [...new Set(keywords)];
}

function findModuleForImport(importPath: string, modules: ModuleInfo[]): string | null {
  const lower = importPath.toLowerCase();
  for (const mod of modules) {
    for (const kw of moduleKeywords(mod.name)) {
      if (lower.includes(`.${kw}.`) || lower.endsWith(`.${kw}`) || lower.startsWith(`${kw}.`)) {
        return mod.name;
      }
    }
  }
  return null;
}

async function buildDependencyGraph(
  filePaths: string[],
  modules: ModuleInfo[],
): Promise<Map<string, Set<string>>> {
  const graph = new Map<string, Set<string>>();

  for (const mod of modules) {
    graph.set(mod.name, new Set());
  }

  for (const mod of modules) {
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
        const target = findModuleForImport(imp, modules);
        if (target && target !== mod.name) {
          graph.get(mod.name)!.add(target);
        }
      }
    }
  }

  return graph;
}

function findCycles(graph: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string) {
    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const neighbor of graph.get(node) ?? []) {
      if (inStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycles.push([...cycle].sort());
      } else if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }

    path.pop();
    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  const seen = new Set<string>();
  return cycles.filter(cycle => {
    const key = cycle.join(",");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function detectCircularDependency(
  filePaths: string[],
  modules: ModuleInfo[],
): Promise<StructuralSignal[]> {
  const graph = await buildDependencyGraph(filePaths, modules);
  const cycles = findCycles(graph);

  return cycles.map(cycle => ({
    type: "circular_dependency" as const,
    severity: cycle.length >= 3 ? "critical" : "high",
    description: `${cycle.join(" ↔ ")} 사이에 순환 참조가 존재`,
    suggestion: "공통 의존을 별도 모듈로 분리하거나 인터페이스로 끊어내길 권장합니다",
    modules: cycle,
  }));
}
