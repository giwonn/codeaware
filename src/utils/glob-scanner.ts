import { Glob } from "bun";

const DEFAULT_IGNORE = [
  "node_modules", "dist", "build", ".git", "vendor",
  "__pycache__", ".next", "coverage", ".cache", ".codeaware",
];

const CODE_EXTENSIONS = [
  "ts", "tsx", "js", "jsx", "mjs",
  "py", "java", "go", "rs", "kt", "kts",
  "rb", "php", "cs", "cpp", "cc", "c", "h",
  "swift", "scala",
];

export async function scanProject(
  rootDir: string,
  options?: { include?: string[]; exclude?: string[] },
): Promise<string[]> {
  const extensions = options?.include ?? CODE_EXTENSIONS;
  const ignore = [...DEFAULT_IGNORE, ...(options?.exclude ?? [])];
  const pattern = `**/*.{${extensions.join(",")}}`;

  const glob = new Glob(pattern);
  const files: string[] = [];

  for await (const file of glob.scan({ cwd: rootDir, dot: false })) {
    if (!ignore.some(dir => file.includes(`${dir}/`) || file.startsWith(`${dir}/`))) {
      files.push(`${rootDir}/${file}`);
    }
  }

  return files.sort();
}
