export interface HealthResponse {
  status: 'ok';
  service: 'api';
}

export type QuestionType = 'single-choice' | 'multi-choice';

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  options: QuizOption[];
}

export interface QuizAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

export interface QuizSession {
  id: string;
  sourceUrl: string;
  topic: string;
  questions: QuizQuestion[];
  answers: QuizAnswer[];
  status: 'active' | 'completed';
  version: number;
}

export interface QuestionScore {
  questionId: string;
  score: number;
  weight: number;
}

export interface QuizResult {
  weightedAverage: number;
  questionScores: QuestionScore[];
}

export interface ApiClient {
  getHealth(): Promise<HealthResponse>;
  startQuiz(sourceUrl: string, topic: string): Promise<QuizSession>;
  getSession(sessionId: string): Promise<QuizSession>;
  submitAnswer(sessionId: string, answer: QuizAnswer, version: number): Promise<QuizSession>;
  getResult(sessionId: string): Promise<QuizResult>;
}
