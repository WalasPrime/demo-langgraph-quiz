export type QuestionType = 'single-choice' | 'multi-choice';

export interface QuizOption {
  id: string;
  label: string;
}

export interface BaseQuestion {
  id: string;
  prompt: string;
  options: readonly QuizOption[];
}

export interface SingleChoiceQuestion extends BaseQuestion {
  type: 'single-choice';
  correctOptionId: string;
}

export interface MultiChoiceQuestion extends BaseQuestion {
  type: 'multi-choice';
  requiredOptionIds: readonly string[];
}

export type QuizQuestion = SingleChoiceQuestion | MultiChoiceQuestion;

export interface QuizAnswer {
  questionId: string;
  selectedOptionIds: readonly string[];
}

export interface QuizSession {
  id: string;
  sourceUrl: string;
  topic: string;
  questions: readonly QuizQuestion[];
  answers: readonly QuizAnswer[];
  status: 'active' | 'completed';
  version: number;
  score?: QuizScore;
}

export type PublicQuizQuestion = Omit<QuizQuestion, 'correctOptionId' | 'requiredOptionIds'> & {
  type: QuestionType;
};

export interface PublicQuizSession {
  id: string;
  sourceUrl: string;
  topic: string;
  questions: readonly PublicQuizQuestion[];
  answers: readonly QuizAnswer[];
  status: QuizSession['status'];
  version: number;
}

export interface QuestionScore {
  questionId: string;
  score: number;
  weight: number;
}

export interface QuizScore {
  weightedAverage: number;
  questionScores: readonly QuestionScore[];
}