// src/pages/AnswerInputScreen.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
// Vitest から Mock 型をインポート
import type { Mock } from "vitest";
import { useTimer } from "@/hooks/useTimer"; // パスを調整
import type { TimerState } from "@/hooks/useTimer"; // パスを調整

// テスト対象コンポーネント
import AnswerInputScreen from "../pages/AnswerInputScreen"; // パスを調整

// 関連する型定義
import type { Problem, AnswerPayload, AnswersApiResponse } from "@/types/quiz"; // パスを調整

// ==================================
// モック設定
// ==================================

// --- API Service Mocks ---
import * as apiService from "@/services/api"; // 元のAPIサービス (型推論用)
const mockFetchQuizQuestions = vi.fn();
const mockSubmitQuizAnswers = vi.fn();

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof apiService>("@/services/api");
  return {
    ...actual, // 他のエクスポートがあれば維持
    fetchQuizQuestions: mockFetchQuizQuestions,
    submitQuizAnswers: mockSubmitQuizAnswers,
  };
});

// --- React Router DOM Mocks ---
const mockNavigate = vi.fn();
const mockSearchParamsGet = vi.fn();
const mockBlockerProceed = vi.fn();
const mockBlockerReset = vi.fn();

// useBlocker が返すオブジェクトの型定義
type Blocker = {
  state: "blocked" | "unblocked" | "proceeding";
  proceed: Mock; // インポートした Mock 型を使用
  reset: Mock; // インポートした Mock 型を使用
};
// useBlocker の戻り値を制御する変数 (let に変更)
let mockReturnedBlocker: Blocker | null = null;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  // useSearchParams が返す配列の第一要素 (searchParams オブジェクト) のモック
  const mockSearchParams = { get: mockSearchParamsGet };
  return {
    ...(typeof actual === "object" ? actual : {}), // 元のエクスポートを維持
    useNavigate: () => mockNavigate, // useNavigate のモック
    useSearchParams: () => [mockSearchParams, vi.fn()], // useSearchParams のモック
    useBlocker: () => mockReturnedBlocker, // useBlocker のモック (制御変数を使用)
  };
});

// useTimer のモックが返すデフォルトの状態
const defaultMockTimerState: TimerState = {
  timeRemaining: 300, // 例: 5分
  warningLevel: "normal",
  timerColorClass: "text-gray-700",
  formattedTime: "05:00",
  notification: { show: false, message: "", level: "normal" },
  isTimerRunning: true,
};

// 現在のテストケースで useTimer が返す状態を保持する変数 (letで宣言)
let currentMockTimerState: TimerState = { ...defaultMockTimerState };

// useTimer フック自体のモック関数。常に currentMockTimerState を返す。
const mockUseTimer = vi.fn(() => currentMockTimerState);

// テストケース内でタイマーの状態を更新するためのヘルパー関数
const setMockTimerState = (newState: Partial<TimerState>) => {
  currentMockTimerState = { ...currentMockTimerState, ...newState };
  // 必要であれば、モック関数が返すオブジェクト参照を更新するなどして再レンダリングを促す場合もあるが、
  // 通常はテスト内で状態を設定 -> 操作 -> 検証 の順で行えば問題ないことが多い。
};

// 3. vi.mock を使用して useTimer をモック化:
// '@/hooks/useTimer' モジュール全体をモック化し、useTimer エクスポートをモック関数に差し替える
vi.mock("@/hooks/useTimer", () => ({
  useTimer: mockUseTimer,
}));

// ==================================
// テストスイート
// ==================================
describe("AnswerInputScreen", () => {
  beforeEach(() => {
    // 各テストの前にすべてのモックの呼び出し履歴等をクリア
    vi.clearAllMocks();

    // useSearchParams の get 動作をリセット (テストごとに設定するため)
    mockSearchParamsGet.mockReset();
    // useBlocker の戻り値をリセット (デフォルトはブロックしない状態)
    mockReturnedBlocker = null; // let なので再代入可能
    // useTimer モックの状態と呼び出し履歴をリセット
    mockUseTimer.mockClear();
    currentMockTimerState = { ...defaultMockTimerState }; // 状態をデフォルトに戻す
  });

  // --- テストケースはここに追加していく ---
  // it('最初のテストケース', () => { /* ... */ });
});
