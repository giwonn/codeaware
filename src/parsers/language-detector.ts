const EXTENSION_MAP: Record<string, string> = {
  ts: "typescript", tsx: "typescript",
  js: "javascript", jsx: "javascript", mjs: "javascript",
  py: "python",
  java: "java",
  go: "go",
  rs: "rust",
  kt: "kotlin", kts: "kotlin",
  rb: "ruby",
  php: "php",
  cs: "csharp",
  cpp: "cpp", cc: "cpp", cxx: "cpp", h: "cpp", hpp: "cpp",
  c: "c",
  swift: "swift",
  scala: "scala",
};

export function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MAP[ext] ?? "unknown";
}
