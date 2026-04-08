import type { StructuralSignal } from "../types";
import type { ModuleInfo } from "./module-resolver";
import { relative, resolve, dirname } from "path";

// Directories that are part of source layout, not domain names
const SOURCE_LAYOUT_DIRS = new Set([
  "src", "main", "java", "kotlin", "scala", "python", "go",
  "test", "tests", "resources", "webapp",
  // Build artifacts
  "bin", "generated", "build", "out", "target", "dist",
  "classes", "generated-sources", "generated-test-sources",
]);

// Architecture layer markers — a directory that contains these as children is likely a domain package
const LAYER_MARKERS = new Set([
  "controller", "controllers", "service", "services",
  "repository", "repositories", "dao",
  "dto", "dtos", "vo", "vos", "param", "params",
  "model", "models", "entity", "entities",
  "domain", "application", "infrastructure", "infra",
  "presentation", "usecase", "usecases",
  "port", "ports", "adapter", "adapters",
  "interfaces", "facade", "facades",
  "in", "out", "input", "output",
]);

// Known Java package prefixes (not domains)
const PACKAGE_PREFIXES = new Set([
  "kr", "co", "com", "org", "net", "io", "de", "jp",
]);

/**
 * Identifies business domain directories by structure, not by name.
 * A directory is a business domain if its children include architecture layer directories
 * (service/, controller/, repository/, dto/, etc.)
 */
function extractDomains(filePaths: string[], mod: ModuleInfo, moduleNameSegments: Set<string>): Set<string> {
  const domains = new Set<string>();

  // Build parent→children map from file paths
  const dirChildren = new Map<string, Set<string>>();

  for (const fp of filePaths) {
    const rel = relative(mod.path, resolve(fp));
    const parts = rel.split("/");

    // Walk the path segments, recording parent→child relationships
    for (let i = 0; i < parts.length - 1; i++) {
      const parent = parts.slice(0, i + 1).join("/");
      const child = parts[i + 1];
      if (!child.includes(".")) { // skip file names
        if (!dirChildren.has(parent)) dirChildren.set(parent, new Set());
        dirChildren.get(parent)!.add(child.toLowerCase());
      }
    }
  }

  // A directory is a business domain if it has architecture layer children
  for (const [dirPath, children] of dirChildren) {
    const hasLayerChild = [...children].some(c => LAYER_MARKERS.has(c));
    if (!hasLayerChild) continue;

    // The domain name is the last segment of this directory path
    const segments = dirPath.split("/");
    const domainName = segments[segments.length - 1];
    const lower = domainName.toLowerCase();

    // Skip if the directory itself is an architecture layer, not a business domain
    if (LAYER_MARKERS.has(lower)) continue;
    if (SOURCE_LAYOUT_DIRS.has(lower)) continue;
    if (PACKAGE_PREFIXES.has(lower)) continue;
    if (moduleNameSegments.has(lower)) continue;
    if (domainName.length <= 1) continue;

    domains.add(domainName);
  }

  return domains;
}

export function detectDomainDuplication(
  filePaths: string[],
  modules: ModuleInfo[],
): StructuralSignal[] {
  const domainToModules = new Map<string, Set<string>>();

  const moduleNameSegments = new Set<string>();
  for (const mod of modules) {
    for (const seg of mod.name.toLowerCase().split("-")) {
      if (seg.length > 1) moduleNameSegments.add(seg);
    }
  }

  for (const mod of modules) {
    const moduleFiles = filePaths.filter(fp => resolve(fp).startsWith(mod.path));
    const domains = extractDomains(moduleFiles, mod, moduleNameSegments);

    for (const domain of domains) {
      if (!domainToModules.has(domain)) {
        domainToModules.set(domain, new Set());
      }
      domainToModules.get(domain)!.add(mod.name);
    }
  }

  const signals: StructuralSignal[] = [];
  const totalModules = modules.length;

  for (const [domain, moduleSet] of domainToModules) {
    if (moduleSet.size < 2) continue;

    // Skip if it appears in almost all modules — likely a cross-cutting concern, not a domain
    if (totalModules >= 4 && moduleSet.size / totalModules >= 0.8) continue;

    const moduleNames = [...moduleSet].sort();
    signals.push({
      type: "domain_duplication",
      severity: moduleSet.size >= 3 ? "high" : "medium",
      description: `${domain} 도메인이 ${moduleNames.join(", ")}에 중복 존재`,
      suggestion: `하나의 모듈로 응집하고 나머지는 호출 구조로 전환 권장`,
      modules: moduleNames,
    });
  }

  // Sort by module count (most widespread first), limit to top 20
  signals.sort((a, b) => b.modules.length - a.modules.length);
  return signals.slice(0, 20);
}
