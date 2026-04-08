import type { ContextAnswer, ContextStore } from "./types";
import { existsSync, mkdirSync } from "fs";

const CONTEXT_FILE = ".codeaware/context.json";

function contextPath(projectDir: string): string {
  return `${projectDir}/${CONTEXT_FILE}`;
}

export async function loadContext(projectDir: string): Promise<ContextStore> {
  const path = contextPath(projectDir);
  if (!existsSync(path)) {
    return { projectDir, answers: [] };
  }
  const raw = await Bun.file(path).text();
  return JSON.parse(raw) as ContextStore;
}

export async function saveAnswer(projectDir: string, answer: ContextAnswer): Promise<void> {
  const store = await loadContext(projectDir);

  const existing = store.answers.findIndex(a => a.questionId === answer.questionId);
  if (existing >= 0) {
    store.answers[existing] = answer;
  } else {
    store.answers.push(answer);
  }

  const dir = `${projectDir}/.codeaware`;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  await Bun.write(contextPath(projectDir), JSON.stringify(store, null, 2));
}

export async function clearContext(projectDir: string): Promise<void> {
  const path = contextPath(projectDir);
  if (existsSync(path)) {
    await Bun.write(path, JSON.stringify({ projectDir, answers: [] }, null, 2));
  }
}
