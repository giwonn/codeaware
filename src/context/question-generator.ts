import type { Evidence } from "../analyzers/types";
import type { ContextQuestion } from "./types";

const QUESTION_TEMPLATES: Record<string, (e: Evidence) => { question: string; why: string }> = {
  magic_number: (e) => ({
    question: `Line ${e.line}: "${e.code.trim()}" — What does this number mean? (business rule, external system code, threshold, etc.)`,
    why: "AI may change this number during refactoring, breaking business logic that depends on it.",
  }),
  hardcoded_date: (e) => ({
    question: `Line ${e.line}: "${e.code.trim()}" — What does this date represent? Is it a fixed cutoff or a configurable value?`,
    why: "Dates may be regulatory deadlines, contract milestones, or migration cutoffs that cannot be changed.",
  }),
  unexplained_catch: (e) => ({
    question: `Line ${e.line}: "${e.code.trim()}" — What failure scenario does this error handling address?`,
    why: "Catch blocks with conditional logic often encode lessons from past production incidents.",
  }),
  order_dependent_init: (e) => ({
    question: `Line ${e.line}: initialization sequence — Must these calls happen in this exact order? What breaks if reordered?`,
    why: "Undocumented order dependencies cause subtle bugs when code is refactored or parallelized.",
  }),
  env_specific_branch: (e) => ({
    question: `Line ${e.line}: "${e.code.trim()}" — When is this environment flag active? Can it be removed?`,
    why: "Environment branches may be tied to specific customers, deployments, or legacy compatibility.",
  }),
  todo_without_ticket: (e) => ({
    question: `Line ${e.line}: "${e.code.trim()}" — Is this TODO still relevant? What's the current status?`,
    why: "Stale TODOs may reference already-resolved issues or forgotten requirements.",
  }),
  commented_out_code: (e) => ({
    question: `Line ${e.line}: commented-out code block — Why was this code commented out? Is it safe to delete?`,
    why: "Commented code may be kept for rollback purposes or as a reference for future work.",
  }),
  unexplained_value_comparison: (e) => ({
    question: `Line ${e.line}: "${e.code.trim()}" — What does this comparison value represent?`,
    why: "Values may be external system status codes or business rule thresholds.",
  }),
};

export function generateQuestions(filePath: string, evidence: Evidence[]): ContextQuestion[] {
  if (evidence.length === 0) return [];

  // Group by signal + nearby lines (within 3 lines)
  const groups: Evidence[][] = [];
  const sorted = [...evidence].sort((a, b) => a.line - b.line);

  for (const e of sorted) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup[0].signal === e.signal && e.line - lastGroup[lastGroup.length - 1].line <= 3) {
      lastGroup.push(e);
    } else {
      groups.push([e]);
    }
  }

  return groups.map((group, idx) => {
    const representative = group[0];
    const template = QUESTION_TEMPLATES[representative.signal];
    const fallback = {
      question: `Line ${representative.line}: "${representative.code.trim()}" — What is the intent/context behind this code?`,
      why: "AI cannot determine the purpose of this code from the source alone.",
    };
    const { question, why } = template ? template(representative) : fallback;

    return {
      id: `${filePath}:${representative.signal}:${idx}`,
      filePath,
      line: representative.line,
      code: group.map(e => e.code).join("\n"),
      signal: representative.signal,
      question,
      why,
    };
  });
}
