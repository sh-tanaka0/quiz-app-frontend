// src/pages/AnswerInputScreen.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
// Vitest から Mock 型をインポート
import type { Mock } from "vitest";

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
  });

  // --- テストケースはここに追加していく ---
  // it('最初のテストケース', () => { /* ... */ });
});
