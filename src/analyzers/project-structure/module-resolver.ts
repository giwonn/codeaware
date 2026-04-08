import { existsSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

export interface ModuleInfo {
  name: string;
  path: string;
}

const BUILD_FILES = [
  "build.gradle", "build.gradle.kts", "pom.xml",
  "settings.gradle", "settings.gradle.kts",
];

const MONOREPO_DIRS = ["packages", "apps", "modules"];

export function resolveModules(rootDir: string): ModuleInfo[] {
  const resolved = resolve(rootDir);

  // 1. Multi-module: build file at root → subdirs with src/ or build files
  if (BUILD_FILES.some(f => existsSync(join(resolved, f)))) {
    return getSubdirsWithSource(resolved);
  }

  // 2. Monorepo: packages/ or apps/ directory
  for (const dir of MONOREPO_DIRS) {
    const monoDir = join(resolved, dir);
    if (existsSync(monoDir) && statSync(monoDir).isDirectory()) {
      return getSubdirs(monoDir);
    }
  }

  // 3. Single project: src/ subdirectories
  const srcDir = join(resolved, "src");
  if (existsSync(srcDir) && statSync(srcDir).isDirectory()) {
    return getSubdirs(srcDir);
  }

  // 4. Fallback: root subdirectories
  return getSubdirs(resolved);
}

function getSubdirsWithSource(dir: string): ModuleInfo[] {
  return readdirSync(dir)
    .filter(name => {
      const full = join(dir, name);
      if (!statSync(full).isDirectory()) return false;
      if (name.startsWith(".")) return false;
      return existsSync(join(full, "src")) ||
        BUILD_FILES.some(f => existsSync(join(full, f)));
    })
    .map(name => ({ name, path: join(dir, name) }));
}

function getSubdirs(dir: string): ModuleInfo[] {
  return readdirSync(dir)
    .filter(name => {
      const full = join(dir, name);
      return statSync(full).isDirectory() && !name.startsWith(".");
    })
    .map(name => ({ name, path: join(dir, name) }));
}
