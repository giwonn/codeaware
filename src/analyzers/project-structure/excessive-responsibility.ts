import { resolve } from "path";
import type { StructuralSignal } from "../types";
import type { ModuleInfo } from "./module-resolver";

const SERVICE_PATTERN = /Service[^/]*\.\w+$/i;
const REPO_PATTERN = /Repository[^/]*\.\w+$/i;
const CONTROLLER_PATTERN = /Controller[^/]*\.\w+$/i;

const THRESHOLD = 50;

export function detectExcessiveResponsibility(
  filePaths: string[],
  modules: ModuleInfo[],
): StructuralSignal[] {
  const signals: StructuralSignal[] = [];
  const resolvedPaths = filePaths.map(fp => resolve(fp));

  for (const mod of modules) {
    const moduleFiles = resolvedPaths.filter(fp => fp.startsWith(mod.path));
    const serviceCount = moduleFiles.filter(fp => SERVICE_PATTERN.test(fp)).length;
    const repoCount = moduleFiles.filter(fp => REPO_PATTERN.test(fp)).length;
    const controllerCount = moduleFiles.filter(fp => CONTROLLER_PATTERN.test(fp)).length;

    if (serviceCount >= THRESHOLD) {
      signals.push({
        type: "excessive_responsibility",
        severity: serviceCount >= 100 ? "critical" : "high",
        description: `${mod.name}에 Service ${serviceCount}개, Repository ${repoCount}개, Controller ${controllerCount}개 존재`,
        suggestion: "이 모듈의 책임이 과다합니다. 도메인별로 분리하거나 비즈니스 로직을 도메인 계층으로 이관을 권장합니다",
        modules: [mod.name],
      });
    }
  }

  return signals;
}
