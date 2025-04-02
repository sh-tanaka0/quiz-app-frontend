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

// useLocation の state の型
export interface LocationState {
  quizResults: QuizResult[]; // 型を QuizResult[] に修正
  totalQuestions: number;
  correctQuestions: number;
}

// カテゴリごとの集計データ型 (グラフ・フィルタ用)
export interface CategoryProgressData {
  category: string; // カテゴリ名
  successRate: number; // 正解率 (%)
  totalAttempts: number; // 解答数
  correctCount: number; // 正解数
  description: string; // カテゴリ説明
}

// RechartsのカスタムツールチップのProps型
export interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CategoryProgressData }>;
  label?: string;
}

// サマリーセクションのProps型
export interface SummaryData {
  totalQuestions: number;
  correctQuestions: number;
  correctRate: number;
}

// 通知レベルの型
export type NotificationLevel = "normal" | "notice" | "warning" | "critical";
