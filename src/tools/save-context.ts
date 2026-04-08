import { saveAnswer } from "../context/context-store";

export async function saveContextAnswer(
  projectDir: string,
  questionId: string,
  filePath: string,
  line: number,
  signal: string,
  question: string,
  answer: string,
): Promise<{ saved: boolean }> {
  await saveAnswer(projectDir, {
    questionId,
    filePath,
    line,
    signal,
    question,
    answer,
    answeredAt: new Date().toISOString(),
  });
  return { saved: true };
}
