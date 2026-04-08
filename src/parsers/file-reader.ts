import { detectLanguage } from "./language-detector";

export interface FileInfo {
  path: string;
  content: string;
  language: string;
  lineCount: number;
}

export async function readFileInfo(filePath: string): Promise<FileInfo> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = await file.text();
  return {
    path: filePath,
    content,
    language: detectLanguage(filePath),
    lineCount: content.split("\n").length,
  };
}
