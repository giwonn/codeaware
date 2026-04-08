export interface ContextQuestion {
  id: string;
  filePath: string;
  line: number;
  code: string;
  signal: string;
  question: string;
  why: string;
}

export interface ContextAnswer {
  questionId: string;
  filePath: string;
  line: number;
  signal: string;
  question: string;
  answer: string;
  answeredAt: string;
}

export interface ContextStore {
  projectDir: string;
  answers: ContextAnswer[];
}
