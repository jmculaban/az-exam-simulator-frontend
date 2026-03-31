export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "MATCHING"
  | "ORDERING";

export interface Question {
  id: string;
  text: string;
  type: QuestionType;

  options?: string[];
  optionMap?: Record<string, string>;

  userAnswer?: UserAnswer;

  isAnswered: boolean;
  isFlagged: boolean;
  isVisited: boolean;
}

export interface Section {
  id: string;
  title: string;
  questions: Question[];
}

export interface ResumeExamResponse {
  sessionId: string;
  examCode: string;
  status: string;
  
  timer: ExamTimer;
  navigation: Navigation;

  sections: Section[];
}

export interface ExamResult {
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  sections: SectionResult[];
}

export interface SectionResult {
  sectionId: string;
  title: string;
  correct: number;
  total: number;
  score: number;
}

export interface ExamTimer {
  remainingSeconds: number;
  expired: boolean;
}

export interface Navigation {
  total: number;
  answered: number;
  flagged: number;
  notVisited: number;
}

export type UserAnswer =
  | string
  | string[]
  | Record<string, string>

export interface ReviewQuestion {
  id: string;
  text: string;
  type: QuestionType;

  options?: string[];
  optionMap?: Record<string, string>;

  userAnswer?: UserAnswer;
  correctAnswer?: UserAnswer;

  isCorrect: boolean;
}

export interface ReviewSection {
  id: string;
  title: string;
  questions: ReviewQuestion[];
}

export interface ReviewExamResponse {
  sessionId: string;
  examCode: string;
  correct: number;
  total: number;
  passed: boolean;
  sections: ReviewSection[];
}