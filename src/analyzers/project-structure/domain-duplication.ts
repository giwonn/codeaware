import type { StructuralSignal } from "../types";
import type { ModuleInfo } from "./module-resolver";
import { relative, resolve } from "path";

const GENERIC_DIRS = new Set([
  "config", "common", "utils", "util", "shared", "lib", "helpers",
  "constants", "enums", "types", "dto", "model", "models",
  "converter", "converters", "mapper", "mappers",
  "exception", "exceptions", "error", "errors",
  "auth", "security", "filter", "interceptor",
  "src", "main", "java", "kotlin", "scala",
  "test", "tests", "resources",
]);

export function detectDomainDuplication(
  filePaths: string[],
  modules: ModuleInfo[],
): StructuralSignal[] {
  const domainToModules = new Map<string, Set<string>>();

  for (const mod of modules) {
    const moduleFiles = filePaths.filter(fp => resolve(fp).startsWith(mod.path));
    const domains = new Set<string>();

    for (const fp of moduleFiles) {
      const rel = relative(mod.path, resolve(fp));
      const parts = rel.split("/");
      for (const part of parts) {
        if (!GENERIC_DIRS.has(part.toLowerCase()) && !part.includes(".") && part.length > 1) {
          domains.add(part);
          break;
        }
      }
    }

    for (const domain of domains) {
      if (!domainToModules.has(domain)) {
        domainToModules.set(domain, new Set());
      }
      domainToModules.get(domain)!.add(mod.name);
    }
  }

  const signals: StructuralSignal[] = [];

  for (const [domain, moduleSet] of domainToModules) {
    if (moduleSet.size >= 2) {
      const moduleNames = [...moduleSet].sort();
      signals.push({
        type: "domain_duplication",
        severity: moduleSet.size >= 3 ? "high" : "medium",
        description: `${domain} 도메인이 ${moduleNames.join(", ")}에 중복 존재`,
        suggestion: `하나의 모듈로 응집하고 나머지는 호출 구조로 전환 권장`,
        modules: moduleNames,
      });
    }
  }

  return signals;
}
