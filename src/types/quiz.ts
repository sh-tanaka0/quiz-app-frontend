export interface ProblemOption {
  id: string;
  text: string;
}

export interface Problem {
  id: string;
  category?: string;
  text: string;
  options: ProblemOption[];
  correctAnswer?: string;
  explanation?: string;
  displayOrder?: string[]; // 選択肢の表示順 (APIから提供される場合)
}

export interface QuizResult {
  questionId: string;
  category: string;
  isCorrect: boolean;
  userAnswer: string | null;
  correctAnswer: string | undefined;
  displayOrder?: string[];
  question: string;
  options: ProblemOption[];
  explanation: string;
}

// 解答提出APIのリクエストボディの型
export interface AnswerSubmission {
  questionId: string;
  answer: string | null; // 解答は必須か？ 仕様による
  // displayOrder?: string[]; // API仕様に応じて追加
}

export interface AnswerPayload {
  sessionId: string | null;
  answers: AnswerSubmission[];
}

// 問題取得APIのレスポンス型
export interface QuestionsApiResponse {
  sessionId: string;
  questions: Problem[];
  timeLimit: number;
}

// 解答提出APIのレスポンス型
export interface AnswersApiResponse {
  results: QuizResult[];
  // 他にもあれば追加
}

// 通知レベルの型
export type NotificationLevel = "normal" | "notice" | "warning" | "critical";
