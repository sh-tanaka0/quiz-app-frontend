/* eslint-disable @typescript-eslint/no-explicit-any */
// テストファイルでは型安全性よりもテストのしやすさを優先するため、anyを許容します

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
// Vitest から Mock 型をインポート (MockInstance の代わりに Mock を使用)
import type { Mock, MockInstance } from "vitest";

// テスト対象コンポーネント
import AnswerInputScreen from "../pages/AnswerInputScreen"; // パスを調整

// 関連する型定義・コンポーネント・フック
import type { Problem, AnswerPayload, AnswersApiResponse } from "@/types/quiz"; // パスを調整
import type { ProblemItemProps } from "@/components/quiz/ProblemItem"; // パス調整
import type { NotificationToastProps } from "@/components/quiz/NotificationToast"; // パス調整
import type { ConfirmationDialogProps } from "@/components/common/ConfirmationDialog"; // パス調整
import type { TimerState, TimerOptions } from "@/hooks/useTimer"; // 型取得のため
import * as apiService from "@/services/api"; // 型推論用

// ==================================
// モック設定
// ==================================

// --- API Service Mocks ---
const mockFetchQuizQuestions = vi.fn();
const mockSubmitQuizAnswers = vi.fn();
vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof apiService>("@/services/api");
  return {
    ...actual,
    fetchQuizQuestions: mockFetchQuizQuestions,
    submitQuizAnswers: mockSubmitQuizAnswers,
  };
});

// --- React Router DOM Mocks ---
const mockNavigate = vi.fn();
const mockSearchParamsGet = vi.fn();
const mockBlockerProceed = vi.fn();
const mockBlockerReset = vi.fn();
type Blocker = {
  state: "blocked" | "unblocked" | "proceeding";
  proceed: Mock;
  reset: Mock;
};
let mockReturnedBlocker: Blocker | null = null;
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  const mockSearchParams = { get: mockSearchParamsGet };
  return {
    ...(typeof actual === "object" ? actual : {}),
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, vi.fn()],
    useBlocker: () => mockReturnedBlocker,
  };
});

// --- useTimer Mock ---
const defaultMockTimerState: TimerState = {
  timeRemaining: 300,
  warningLevel: "normal",
  timerColorClass: "text-gray-700",
  formattedTime: "05:00",
  notification: { show: false, message: "", level: "normal" },
  isTimerRunning: true,
};
let currentMockTimerState: TimerState = { ...defaultMockTimerState };
const mockUseTimer = vi.fn(() => currentMockTimerState);
const setMockTimerState = (newState: Partial<TimerState>) => {
  currentMockTimerState = { ...currentMockTimerState, ...newState };
};
vi.mock("@/hooks/useTimer", () => ({ useTimer: mockUseTimer }));

// --- Child Component Mocks ---
const mockProblemItemProps: ProblemItemProps[] = [];
const mockNotificationToastProps: NotificationToastProps[] = [];
const mockConfirmationDialogProps: ConfirmationDialogProps[] = [];
vi.mock("@/components/quiz/ProblemItem", () => ({
  default: vi.fn((props: ProblemItemProps) => {
    mockProblemItemProps.push(props);
    return (
      <div data-testid={`mock-problem-item-${props.problem.questionId}`}>
        Question: {props.problem.question}
      </div>
    );
  }),
}));
vi.mock("@/components/quiz/NotificationToast", () => ({
  default: vi.fn((props: NotificationToastProps) => {
    mockNotificationToastProps.push(props);
    if (!props.show) return null;
    return (
      <div
        data-testid="mock-notification-toast"
        data-level={props.level}
        data-color={props.colorClass}
      >
        {props.message}
      </div>
    );
  }),
}));
vi.mock("@/components/common/ConfirmationDialog", () => ({
  default: vi.fn((props: ConfirmationDialogProps) => {
    mockConfirmationDialogProps.push(props);
    if (!props.show) return null;
    return (
      <div data-testid="mock-confirmation-dialog">
        <p>{props.message}</p>
        <button data-testid="mock-confirm-button" onClick={props.onConfirm}>
          {props.confirmText || "OK"}
        </button>
        <button data-testid="mock-cancel-button" onClick={props.onCancel}>
          {props.cancelText || "キャンセル"}
        </button>
      </div>
    );
  }),
}));

// --- Browser API Mock ---
// Mock<[引数の型タプル], 戻り値の型> を使用
let mockConfirmSpy: MockInstance<typeof window.confirm>;

// ==================================
// テストスイート
// ==================================
describe("AnswerInputScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamsGet.mockReset();
    mockReturnedBlocker = null;
    currentMockTimerState = { ...defaultMockTimerState };
    mockProblemItemProps.length = 0;
    mockNotificationToastProps.length = 0;
    mockConfirmationDialogProps.length = 0;
    // window.confirm のスパイを設定 (Mock<...> 型を使用)
    mockConfirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => true);
  });

  afterEach(() => {
    // スパイなどを確実に元の状態に戻す
    vi.restoreAllMocks();
  });

  // --- Helper Function for Rendering ---
  const renderAndWaitForInit = async (mockProblems: Problem[] = []) => {
    mockFetchQuizQuestions.mockResolvedValue({
      sessionId: "sid-test",
      questions: mockProblems,
    });
    render(
      <BrowserRouter>
        <AnswerInputScreen />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(mockFetchQuizQuestions).toHaveBeenCalled();
      if (mockProblems.length > 0) {
        expect(mockProblemItemProps.length).toBe(mockProblems.length);
      }
    });
  };

  // --- テストケース ---

  describe("初期化と問題読み込み (Initialization and Data Loading)", () => {
    it("URLパラメータを読み取り、API呼び出しとタイマー初期化に使用する", async () => {
      const expectedTimeLimit = 30;
      const expectedCount = 5;
      const expectedBookSource = "programming_principles";
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === "timeLimit") return expectedTimeLimit.toString();
        if (key === "count") return expectedCount.toString();
        if (key === "bookSource") return expectedBookSource;
        return null;
      });
      const expectedTotalTime = expectedTimeLimit * expectedCount;
      setMockTimerState({ timeRemaining: expectedTotalTime });

      await renderAndWaitForInit([]);

      expect(mockFetchQuizQuestions).toHaveBeenCalledWith(
        expectedBookSource,
        expectedCount,
        expectedTimeLimit
      );
      expect(mockUseTimer).toHaveBeenCalledWith(
        expectedTotalTime,
        expect.anything()
      );
      expect(currentMockTimerState.timeRemaining).toBe(expectedTotalTime);
    });

    it("問題取得中にローディング状態が表示される", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let resolveFetch: (value: any) => void;
      mockFetchQuizQuestions.mockImplementation(
        () =>
          new Promise((res) => {
            resolveFetch = res;
          })
      );
      mockSearchParamsGet.mockReturnValue("10");
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      expect(screen.getByText("問題を読み込んでいます...")).toBeInTheDocument();
    });

    it("問題取得成功時に問題リストとタイマーが表示される", async () => {
      const mockProblems: Problem[] = [
        {
          questionId: "q1",
          category: "cat1",
          question: "Question 1?",
          options: [
            { id: "a", text: "Opt A" },
            { id: "b", text: "Opt B" },
          ],
          correctAnswer: "a",
          explanation: "Exp 1",
        },
        {
          questionId: "q2",
          category: "cat2",
          question: "Question 2?",
          options: [
            { id: "c", text: "Opt C" },
            { id: "d", text: "Opt D" },
          ],
          correctAnswer: "d",
          explanation: "Exp 2",
        },
      ];
      const timerDisplayValue = "01:00";
      setMockTimerState({ formattedTime: timerDisplayValue });

      await renderAndWaitForInit(mockProblems);

      expect(
        screen.queryByText("問題を読み込んでいます...")
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/エラー:/)).not.toBeInTheDocument();
      expect(screen.getByText(timerDisplayValue)).toBeInTheDocument();
      expect(mockProblemItemProps.length).toBe(mockProblems.length);
      expect(mockProblemItemProps[0].problem).toEqual(mockProblems[0]);
      expect(
        screen.getByText(`問題解答 (${mockProblems.length}問)`)
      ).toBeInTheDocument();
    });

    it("問題取得失敗時にエラーメッセージが表示される", async () => {
      const errorMessage = "サーバーエラーが発生しました";
      mockFetchQuizQuestions.mockRejectedValue(new Error(errorMessage));
      mockSearchParamsGet.mockReturnValue("10");

      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );

      expect(
        await screen.findByText(`エラー: ${errorMessage}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByText("問題を読み込んでいます...")
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/問題解答/)).not.toBeInTheDocument();
      expect(mockProblemItemProps.length).toBe(0);
    });
  });

  // --- 機能テスト (問題読み込み成功後) ---
  describe("機能テスト (問題読み込み成功後)", () => {
    const mockProblems: Problem[] = [
      {
        questionId: "q1",
        question: "Q1",
        options: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
        ],
        correctAnswer: "a",
        explanation: "",
        category: "catA",
      },
      {
        questionId: "q2",
        question: "Q2",
        options: [
          { id: "c", text: "C" },
          { id: "d", text: "D" },
        ],
        correctAnswer: "c",
        explanation: "",
        category: "catB",
      },
    ];
    const mockSessionId = "s1";

    beforeEach(async () => {
      mockFetchQuizQuestions.mockResolvedValue({
        sessionId: mockSessionId,
        questions: mockProblems,
      });
      mockSearchParamsGet.mockReturnValue("10");
      setMockTimerState({ timeRemaining: 100, isTimerRunning: true });
      mockSubmitQuizAnswers.mockResolvedValue({ results: [] });
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBe(mockProblems.length)
      );
    });

    describe("タイマー機能との連携 (Timer Interaction)", () => {
      it("モックタイマーの残り時間 (formattedTime) が正しく表示される", () => {
        const expectedFormattedTime = "03:45";
        setMockTimerState({ formattedTime: expectedFormattedTime });
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        expect(screen.getByText(expectedFormattedTime)).toBeInTheDocument();
      });

      it("モックタイマーの警告レベルに応じてタイマー表示要素に色クラスが付与される", () => {
        const expectedFormattedTime = "01:23";
        const expectedColorClass = "text-orange-500";
        setMockTimerState({
          warningLevel: "warning",
          timerColorClass: expectedColorClass,
          formattedTime: expectedFormattedTime,
        });
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        const timeElement = screen.getByText(expectedFormattedTime);
        expect(timeElement).toHaveClass(expectedColorClass);
      });

      it("モックタイマーの通知状態に応じて NotificationToast が表示される", () => {
        const notificationMessage = "残り時間が10%を切りました！";
        setMockTimerState({
          notification: {
            show: true,
            message: notificationMessage,
            level: "critical",
          },
          timerColorClass: "text-red-600",
        });
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        const toastElement = screen.getByTestId("mock-notification-toast");
        expect(toastElement).toHaveTextContent(notificationMessage);
      });

      it("時間切れ時に onTimeUp コールバックが呼ばれると解答提出処理がトリガーされる", async () => {
        setMockTimerState({ timeRemaining: 1, isTimerRunning: true });
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );

        // onTimeUp コールバックを安全に取得
        const lastCallArgs = mockUseTimer.mock.calls[
          mockUseTimer.mock.calls.length - 1
        ] as any[];
        expect(lastCallArgs).toBeDefined();
        // useTimer は第2引数に options を取ることを想定
        expect(lastCallArgs.length).toBeGreaterThanOrEqual(2);

        const optionsArg = lastCallArgs[1] as TimerOptions | undefined;
        const onTimeUpCallback = optionsArg?.onTimeUp;
        expect(onTimeUpCallback).toBeDefined();
        expect(typeof onTimeUpCallback).toBe("function");

        if (onTimeUpCallback) {
          await onTimeUpCallback();
        }

        await waitFor(() => {
          expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe("解答の選択 (Answer Selection)", () => {
      it("ProblemItem で選択肢を選ぶと内部状態が更新され、提出データに反映される", async () => {
        const user = userEvent.setup();
        const choiceId1 = "b";
        const choiceId2 = "c";
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", choiceId1);
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q2")
          ?.onAnswerSelect("q2", choiceId2);
        await user.click(screen.getByRole("button", { name: "解答する" }));
        await waitFor(() => {
          expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
          const payload = mockSubmitQuizAnswers.mock
            .calls[0][0] as AnswerPayload;
          expect(
            payload.answers.find((a) => a.questionId === "q1")?.answer
          ).toBe(choiceId1);
          expect(
            payload.answers.find((a) => a.questionId === "q2")?.answer
          ).toBe(choiceId2);
        });
      });

      it("時間切れ後は解答を選択できない (提出ボタンが無効)", () => {
        setMockTimerState({ timeRemaining: 0, isTimerRunning: false });
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        const submitButton = screen.getByRole("button", { name: "解答する" });
        expect(submitButton).toBeDisabled();
      });

      it("提出中は解答を選択できない (提出ペイロードに反映されない)", async () => {
        const user = userEvent.setup();
        let resolveSubmit: ((value: { results: [] }) => void) | undefined;
        mockSubmitQuizAnswers.mockImplementation(
          () =>
            new Promise((res) => {
              resolveSubmit = res;
            })
        );
        const initialChoiceId = "a";
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", initialChoiceId);
        await user.click(screen.getByRole("button", { name: "解答する" }));
        await screen.findByRole("button", { name: "提出中..." });
        const choiceWhileSubmitting = "b";
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", choiceWhileSubmitting);
        expect(resolveSubmit).toBeDefined();
        if (resolveSubmit) resolveSubmit({ results: [] });
        await waitFor(() => {
          expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
          const payload = mockSubmitQuizAnswers.mock
            .calls[0][0] as AnswerPayload;
          expect(
            payload.answers.find((a) => a.questionId === "q1")?.answer
          ).toBe(initialChoiceId);
        });
      });
    });

    describe("解答の提出 (Submission Process)", () => {
      it("未解答がある状態で提出ボタンを押すと window.confirm が呼ばれる", async () => {
        const user = userEvent.setup();
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", "a");
        await user.click(screen.getByRole("button", { name: "解答する" }));
        expect(mockConfirmSpy).toHaveBeenCalledTimes(1);
        expect(mockConfirmSpy).toHaveBeenCalledWith(
          expect.stringContaining("未解答の問題が 1 問あります")
        );
      });

      it("未解答確認ダイアログでキャンセルすると submit API は呼ばれない", async () => {
        const user = userEvent.setup();
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", "a");
        mockConfirmSpy.mockReturnValueOnce(false); // キャンセル
        await user.click(screen.getByRole("button", { name: "解答する" }));
        expect(mockConfirmSpy).toHaveBeenCalledTimes(1);
        expect(mockSubmitQuizAnswers).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "解答する" })).toBeEnabled();
      });

      it("全問解答して提出すると正しいペイロードで submit API が呼ばれる", async () => {
        const user = userEvent.setup();
        const answer1 = "b";
        const answer2 = "c";
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", answer1);
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q2")
          ?.onAnswerSelect("q2", answer2);
        await user.click(screen.getByRole("button", { name: "解答する" }));
        await waitFor(() => {
          expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
          const payload = mockSubmitQuizAnswers.mock
            .calls[0][0] as AnswerPayload;
          expect(payload.sessionId).toBe(mockSessionId);
          expect(
            payload.answers.find((a) => a.questionId === "q1")?.answer
          ).toBe(answer1);
          expect(
            payload.answers.find((a) => a.questionId === "q2")?.answer
          ).toBe(answer2);
        });
      });

      it("提出中は解答ボタンが「提出中...」になり無効化される", async () => {
        const user = userEvent.setup();
        let resolveSubmit: ((value: any) => void) | undefined;
        mockSubmitQuizAnswers.mockImplementation(
          () =>
            new Promise((res) => {
              resolveSubmit = res;
            })
        );
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", "a");
        await user.click(screen.getByRole("button", { name: "解答する" }));
        const submittingButton = await screen.findByRole("button", {
          name: "提出中...",
        });
        expect(submittingButton).toBeDisabled();
        if (resolveSubmit) resolveSubmit({ results: [] });
      });

      it("解答提出成功時に結果画面へ正しい state と共に navigate する", async () => {
        const user = userEvent.setup();
        const mockResultsData: AnswersApiResponse = {
          results: [
            {
              questionId: "q1",
              category: "catA",
              isCorrect: true,
              userAnswer: "a",
              correctAnswer: "a",
              question: "Q1",
              options: [],
              explanation: "",
            },
            {
              questionId: "q2",
              category: "catB",
              isCorrect: false,
              userAnswer: "c",
              correctAnswer: "d",
              question: "Q2",
              options: [],
              explanation: "",
            },
          ],
        };
        mockSubmitQuizAnswers.mockResolvedValue(mockResultsData);
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", "a");
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q2")
          ?.onAnswerSelect("q2", "c");
        await user.click(screen.getByRole("button", { name: "解答する" }));
        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith(
            "/result",
            expect.objectContaining({
              state: expect.objectContaining({
                quizResults: mockResultsData.results,
                totalQuestions: mockProblems.length,
                correctQuestions: 1,
              }),
            })
          );
        });
      });

      it("解答提出失敗時にエラーメッセージが表示され、ボタンが有効に戻る", async () => {
        const user = userEvent.setup();
        const errorMessage = "提出エラー";
        mockSubmitQuizAnswers.mockRejectedValue(new Error(errorMessage));
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", "a");
        await user.click(screen.getByRole("button", { name: "解答する" }));
        await screen.findByText(`エラー: ${errorMessage}`);
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "解答する" })).toBeEnabled();
      });

      it("時間切れ時に自動提出され、成功すれば結果画面へ navigate する", async () => {
        setMockTimerState({ timeRemaining: 1, isTimerRunning: true });
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        const lastCallArgs = mockUseTimer.mock.calls[
          mockUseTimer.mock.calls.length - 1
        ] as any[];
        const optionsArg = lastCallArgs[1] as TimerOptions | undefined;
        const onTimeUpCallback = optionsArg?.onTimeUp;
        expect(onTimeUpCallback).toBeDefined();
        if (onTimeUpCallback) {
          await onTimeUpCallback();
        }
        expect(mockConfirmSpy).not.toHaveBeenCalled();
        await waitFor(() => {
          expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith(
            "/result",
            expect.anything()
          );
        });
      });

      it("提出処理中に再度提出ボタンを押しても二重送信されない", async () => {
        const user = userEvent.setup();
        let resolveSubmit: ((value: any) => void) | undefined;
        mockSubmitQuizAnswers.mockImplementation(
          () =>
            new Promise((res) => {
              resolveSubmit = res;
            })
        );
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", "a");
        const submitButton = screen.getByRole("button", { name: "解答する" });
        await user.click(submitButton);
        await screen.findByRole("button", { name: "提出中..." });
        await user.click(submitButton);
        expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
        if (resolveSubmit) resolveSubmit({ results: [] });
        await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
        expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
      });
    }); // describe('解答の提出')

    describe("画面離脱防止機能 (Navigation Blocking)", () => {
      it("解答中に useBlocker がブロック状態を返すと確認ダイアログが表示される", async () => {
        mockReturnedBlocker = {
          state: "blocked",
          proceed: mockBlockerProceed,
          reset: mockBlockerReset,
        };
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        const dialog = await screen.findByTestId("mock-confirmation-dialog");
        expect(dialog).toBeInTheDocument();
      });

      it("確認ダイアログで「OK」をクリックすると blocker.proceed が呼ばれる", async () => {
        const user = userEvent.setup();
        mockReturnedBlocker = {
          state: "blocked",
          proceed: mockBlockerProceed,
          reset: mockBlockerReset,
        };
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        const confirmButton = await screen.findByTestId("mock-confirm-button");
        await user.click(confirmButton);
        expect(mockBlockerProceed).toHaveBeenCalledTimes(1);
        expect(mockBlockerReset).not.toHaveBeenCalled();
        expect(
          screen.queryByTestId("mock-confirmation-dialog")
        ).not.toBeInTheDocument();
      });

      it("確認ダイアログで「キャンセル」をクリックすると blocker.reset が呼ばれる", async () => {
        const user = userEvent.setup();
        mockReturnedBlocker = {
          state: "blocked",
          proceed: mockBlockerProceed,
          reset: mockBlockerReset,
        };
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        const cancelButton = await screen.findByTestId("mock-cancel-button");
        await user.click(cancelButton);
        expect(mockBlockerReset).toHaveBeenCalledTimes(1);
        expect(mockBlockerProceed).not.toHaveBeenCalled();
        expect(
          screen.queryByTestId("mock-confirmation-dialog")
        ).not.toBeInTheDocument();
      });

      it("時間切れ後はブロッカーが作動せず、確認ダイアログは表示されない", () => {
        setMockTimerState({ timeRemaining: 0, isTimerRunning: false });
        mockReturnedBlocker = null;
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        expect(
          screen.queryByTestId("mock-confirmation-dialog")
        ).not.toBeInTheDocument();
      });

      it("提出中はブロッカーが作動せず、確認ダイアログは表示されない", async () => {
        const user = userEvent.setup();
        let resolveSubmit: ((value: any) => void) | undefined;
        mockSubmitQuizAnswers.mockImplementation(
          () =>
            new Promise((res) => {
              resolveSubmit = res;
            })
        );
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", "a");
        await user.click(screen.getByRole("button", { name: "解答する" }));
        await screen.findByRole("button", { name: "提出中..." });
        mockReturnedBlocker = null;
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        expect(
          screen.queryByTestId("mock-confirmation-dialog")
        ).not.toBeInTheDocument();
        if (resolveSubmit) resolveSubmit({ results: [] });
      });
    });
  });
});
