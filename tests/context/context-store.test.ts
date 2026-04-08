import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { loadContext, saveAnswer, clearContext } from "../../src/context/context-store";
import { rmSync, mkdirSync } from "fs";

const TEST_DIR = "tests/.tmp-context-test";

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("ContextStore", () => {
  test("save and load answer", async () => {
    await saveAnswer(TEST_DIR, {
      questionId: "test:magic_number:0",
      filePath: "payment.ts",
      line: 5,
      signal: "magic_number",
      question: "What does 3 mean?",
      answer: "3 = premium user tier from legacy CRM",
      answeredAt: new Date().toISOString(),
    });

    const store = await loadContext(TEST_DIR);
    expect(store.answers.length).toBe(1);
    expect(store.answers[0].answer).toBe("3 = premium user tier from legacy CRM");
  });

  test("multiple answers accumulate", async () => {
    await saveAnswer(TEST_DIR, {
      questionId: "a:magic_number:0",
      filePath: "a.ts", line: 1, signal: "magic_number",
      question: "q1", answer: "a1", answeredAt: new Date().toISOString(),
    });
    await saveAnswer(TEST_DIR, {
      questionId: "b:magic_number:0",
      filePath: "b.ts", line: 2, signal: "magic_number",
      question: "q2", answer: "a2", answeredAt: new Date().toISOString(),
    });

    const store = await loadContext(TEST_DIR);
    expect(store.answers.length).toBe(2);
  });

  test("clear removes all context", async () => {
    await saveAnswer(TEST_DIR, {
      questionId: "x:magic_number:0",
      filePath: "x.ts", line: 1, signal: "magic_number",
      question: "q", answer: "a", answeredAt: new Date().toISOString(),
    });
    await clearContext(TEST_DIR);

    const store = await loadContext(TEST_DIR);
    expect(store.answers.length).toBe(0);
  });
});
