import { describe, test, expect } from "bun:test";
import { generateQuestions } from "../../src/context/question-generator";
import type { Evidence } from "../../src/analyzers/types";

describe("generateQuestions", () => {
  test("generates question for magic number", () => {
    const evidence: Evidence[] = [{
      line: 5,
      code: "if (userType === 3) {",
      signal: "magic_number",
      explanation: "Unexplained numeric literal 3",
      severity: "high",
    }];
    const questions = generateQuestions("payment.ts", evidence);
    expect(questions.length).toBe(1);
    expect(questions[0].signal).toBe("magic_number");
    expect(questions[0].question).toContain("3");
    expect(questions[0].filePath).toBe("payment.ts");
  });

  test("generates question for unexplained catch", () => {
    const evidence: Evidence[] = [{
      line: 12,
      code: "if (amount > 50000) { return {status: 'pending', code: 4012} }",
      signal: "unexplained_catch",
      explanation: "Conditional logic in catch block without explanation",
      severity: "high",
    }];
    const questions = generateQuestions("payment.ts", evidence);
    expect(questions[0].why).toBeDefined();
    expect(questions[0].why.length).toBeGreaterThan(0);
  });

  test("generates question for hardcoded date", () => {
    const evidence: Evidence[] = [{
      line: 3,
      code: 'const cutoff = "2024-01-15"',
      signal: "hardcoded_date",
      explanation: "Hardcoded date literal",
      severity: "medium",
    }];
    const questions = generateQuestions("config.ts", evidence);
    expect(questions[0].question).toContain("2024-01-15");
  });

  test("deduplicates similar signals on nearby lines", () => {
    const evidence: Evidence[] = [
      { line: 5, code: "x === 3", signal: "magic_number", explanation: "a", severity: "high" },
      { line: 6, code: "y === 3", signal: "magic_number", explanation: "b", severity: "high" },
    ];
    const questions = generateQuestions("test.ts", evidence);
    expect(questions.length).toBe(1);
  });

  test("no evidence → no questions", () => {
    const questions = generateQuestions("clean.ts", []);
    expect(questions.length).toBe(0);
  });
});
