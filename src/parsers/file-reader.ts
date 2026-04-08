import { detectLanguage } from "./language-detector";

export interface FileInfo {
  path: string;
  content: string;
  language: string;
  lineCount: number;
}

export async function readFileInfo(filePath: string): Promise<FileInfo> {
  const content = await Bun.file(filePath).text();
  return {
    path: filePath,
    content,
    language: detectLanguage(filePath),
    lineCount: content.split("\n").length,
  };
}
