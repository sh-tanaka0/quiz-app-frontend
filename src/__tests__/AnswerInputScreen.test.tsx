/* eslint-disable @typescript-eslint/no-explicit-any */
// テストファイルでは型安全性よりもテストのしやすさを優先するため、anyを許容する場合がある

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
// Vitest から MockInstance 型をインポート
import type { MockInstance } from "vitest";

// テスト対象コンポーネント
import AnswerInputScreen from "../pages/AnswerInputScreen"; // パスを調整

// 関連する型定義・コンポーネント・フック
import type { Problem, AnswerPayload, AnswersApiResponse } from "@/types/quiz"; // パスを調整
import type { ProblemItemProps } from "@/components/quiz/ProblemItem"; // パス調整
import type { NotificationToastProps } from "@/components/quiz/NotificationToast"; // パス調整
import type { ConfirmationDialogProps } from "@/components/common/ConfirmationDialog"; // パス調整
import type { TimerState, TimerOptions } from "@/hooks/useTimer"; // 型取得のため
import * as apiServiceOriginal from "@/services/api"; // 元のモジュール情報 (型推論用)
import * as routerOriginal from "react-router-dom"; // 元のモジュール情報 (型推論用)
import * as timerOriginal from "@/hooks/useTimer"; // 元のモジュール情報 (型推論用)

// ==================================
// vi.hoisted によるモック関数定義
// ==================================
const mocks = vi.hoisted(() => {
  // 関数の型シグネチャを定義
  type FetchSig = typeof apiServiceOriginal.fetchQuizQuestions;
  type SubmitSig = typeof apiServiceOriginal.submitQuizAnswers;
  type NavigateFnSig = ReturnType<typeof routerOriginal.useNavigate>;
  type SearchParamsGetSig = (key: string) => string | null;
  type BlockerActionSig = () => void;
  type UseTimerSig = typeof timerOriginal.useTimer;

  return {
    // MockInstance<関数の型全体> を使用
    mockFetchQuizQuestions: vi.fn() as MockInstance<FetchSig>,
    mockSubmitQuizAnswers: vi.fn() as MockInstance<SubmitSig>,
    mockNavigateFn: vi.fn() as MockInstance<NavigateFnSig>,
    mockSearchParamsGetFn: vi.fn() as MockInstance<SearchParamsGetSig>,
    mockBlockerProceedFn: vi.fn() as MockInstance<BlockerActionSig>,
    mockBlockerResetFn: vi.fn() as MockInstance<BlockerActionSig>,
    mockUseTimer: vi.fn() as MockInstance<UseTimerSig>,
  };
});

// ==================================
// モック設定 (State Controllerなど - vi.hoisted の外)
// ==================================
// Blocker の型定義で MockInstance を使用
type Blocker = {
  state: "blocked" | "unblocked" | "proceeding";
  proceed: MockInstance<() => void>;
  reset: MockInstance<() => void>;
};
let mockReturnedBlockerValue: Blocker | null = null; // useBlocker が返す値を制御
const defaultMockTimerState: TimerState = {
  timeRemaining: 300,
  warningLevel: "normal",
  timerColorClass: "text-gray-700",
  formattedTime: "05:00",
  notification: { show: false, message: "", level: "normal" },
  isTimerRunning: true,
};
let currentMockTimerState: TimerState = { ...defaultMockTimerState }; // useTimer が返す状態を制御
const setMockTimerState = (newState: Partial<TimerState>) => {
  currentMockTimerState = { ...currentMockTimerState, ...newState };
};
// 子コンポーネントの Props 記録用配列
const mockProblemItemProps: ProblemItemProps[] = [];
const mockNotificationToastProps: NotificationToastProps[] = [];
const mockConfirmationDialogProps: ConfirmationDialogProps[] = [];

// window.confirm スパイの型 (MockInstance を使用)
let mockConfirmSpy: MockInstance<(message?: string | undefined) => boolean>;

// ==================================
// vi.mock によるモック化 (vi.hoisted の後)
// ==================================
vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof apiServiceOriginal>(
    "@/services/api"
  );
  return {
    ...actual,
    fetchQuizQuestions: mocks.mockFetchQuizQuestions,
    submitQuizAnswers: mocks.mockSubmitQuizAnswers,
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof routerOriginal>(
    "react-router-dom"
  );
  const mockSearchParams = { get: mocks.mockSearchParamsGetFn };

  return {
    ...(typeof actual === "object" ? actual : {}),
    useNavigate: () => mocks.mockNavigateFn,
    useSearchParams: () => [mockSearchParams, vi.fn()],
    useBlocker: () =>
      mockReturnedBlockerValue
        ? {
            ...mockReturnedBlockerValue,
            proceed: mocks.mockBlockerProceedFn, // 常に最新のモック関数を参照
            reset: mocks.mockBlockerResetFn, // 常に最新のモック関数を参照
          }
        : null,
  };
});

vi.mock("@/hooks/useTimer", () => ({
  useTimer: mocks.mockUseTimer, // hoisted のモックを参照
}));

// 子コンポーネントのモック (vi.hoisted は不要)
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

// ==================================
// テストスイート
// ==================================
describe("AnswerInputScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // すべての vi.fn(), vi.spyOn() をクリア

    // hoisted で作成したモック関数の実装や状態をリセット
    mocks.mockFetchQuizQuestions.mockReset();
    mocks.mockSubmitQuizAnswers.mockReset();
    mocks.mockNavigateFn.mockClear();
    mocks.mockSearchParamsGetFn.mockReset();
    mocks.mockBlockerProceedFn.mockClear();
    mocks.mockBlockerResetFn.mockClear();
    mocks.mockUseTimer.mockImplementation(() => currentMockTimerState); // state を返すように再設定

    // State Controller のリセット
    mockReturnedBlockerValue = null;
    currentMockTimerState = { ...defaultMockTimerState };
    mockProblemItemProps.length = 0;
    mockNotificationToastProps.length = 0;
    mockConfirmationDialogProps.length = 0;

    // window.confirm のスパイを設定
    mockConfirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => true); // デフォルト true
  });

  // afterEach を beforeEach の外、describe の直下に移動
  afterEach(() => {
    vi.restoreAllMocks(); // spyOn を元に戻す
  });

  // --- Helper Function for Rendering ---
  const renderAndWaitForInit = async (mockProblems: Problem[] = []) => {
    mocks.mockFetchQuizQuestions.mockResolvedValue({
      sessionId: "sid-test",
      questions: mockProblems,
      timeLimit: 60, // 仮の値、必要なら調整
    });
    render(
      <BrowserRouter>
        <AnswerInputScreen />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(mocks.mockFetchQuizQuestions).toHaveBeenCalled();
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
      mocks.mockSearchParamsGetFn.mockImplementation((key: string) => {
        if (key === "timeLimit") return expectedTimeLimit.toString();
        if (key === "count") return expectedCount.toString();
        if (key === "bookSource") return expectedBookSource;
        return null;
      });
      const expectedTotalTime = expectedTimeLimit * expectedCount;
      setMockTimerState({ timeRemaining: expectedTotalTime });

      await renderAndWaitForInit([]);

      expect(mocks.mockFetchQuizQuestions).toHaveBeenCalledWith(
        expectedBookSource,
        expectedCount,
        expectedTimeLimit
      );
      expect(mocks.mockUseTimer).toHaveBeenCalledWith(
        expectedTotalTime,
        expect.anything()
      );
      expect(currentMockTimerState.timeRemaining).toBe(expectedTotalTime);
    });

    it("問題取得中にローディング状態が表示される", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let _resolveFetch: (value: any) => void;
      mocks.mockFetchQuizQuestions.mockImplementation(
        () =>
          new Promise((res) => {
            _resolveFetch = res;
          })
      );
      mocks.mockSearchParamsGetFn.mockReturnValue("10");
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
        } as Problem, // 型アサーションまたは完全なデータ
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
        } as Problem,
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
      mocks.mockFetchQuizQuestions.mockRejectedValue(new Error(errorMessage));
      mocks.mockSearchParamsGetFn.mockReturnValue("10");

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
  }); // describe: 初期化

  // --- 機能テスト (問題読み込み成功後) ---
  describe("機能テスト (問題読み込み成功後)", () => {
    // テスト用の問題データ (describe内でアクセス可能に)
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
      } as Problem,
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
      } as Problem,
    ];
    const mockSessionId = "s1";

    // この describe 内のテストはすべて問題読み込み成功を前提とする
    beforeEach(async () => {
      mocks.mockFetchQuizQuestions.mockResolvedValue({
        sessionId: mockSessionId,
        questions: mockProblems,
        timeLimit: 60, // APIレスポンスにも timeLimit を含める
      });
      mocks.mockSearchParamsGetFn.mockReturnValue("10"); // count=10 を返すように設定
      // タイマーや提出のデフォルト状態はルートの beforeEach でリセットされる
      mocks.mockSubmitQuizAnswers.mockResolvedValue({ results: [] });
      // confirm Spy はルートの beforeEach で設定済み (true を返す)
    });

    describe("タイマー機能との連携 (Timer Interaction)", () => {
      it("モックタイマーの残り時間 (formattedTime) が正しく表示される", async () => {
        const expectedFormattedTime = "03:45";
        setMockTimerState({ formattedTime: expectedFormattedTime });

        // Act: コンポーネントをレンダリングし、初期化完了を待つ
        // ここで初めてレンダリングする
        await renderAndWaitForInit(mockProblems);

        // Assert: 設定したフォーマット済み時間が表示されているか確認
        // findByText などで非同期に表示されるのを待っても良い
        expect(
          await screen.findByText(expectedFormattedTime)
        ).toBeInTheDocument();
        // または getByText (同期的に見つかる場合)
        // expect(screen.getByText(expectedFormattedTime)).toBeInTheDocument();
      });

      it("モックタイマーの警告レベルに応じてタイマー表示要素に色クラスが付与される", async () => {
        // Arrange
        const expectedFormattedTime = "01:23";
        const expectedColorClass = "text-orange-500";
        setMockTimerState({
          warningLevel: "warning",
          timerColorClass: expectedColorClass,
          formattedTime: expectedFormattedTime,
        });

        // Act
        await renderAndWaitForInit(mockProblems);

        // Assert
        // findByText で要素が見つかるのを待ってからクラスを確認
        const timeElement = await screen.findByText(expectedFormattedTime);
        expect(timeElement).toHaveClass(expectedColorClass);
        // アイコンの確認 (オプション)
        const clockIcon = timeElement.previousElementSibling;
        if (clockIcon) {
          expect(clockIcon).toHaveClass(expectedColorClass);
        }
      });

      it("モックタイマーの通知状態に応じて NotificationToast が表示される", async () => {
        // Arrange
        const notificationMessage = "残り時間が10%を切りました！";
        setMockTimerState({
          notification: {
            show: true,
            message: notificationMessage,
            level: "critical",
          },
          timerColorClass: "text-red-600",
        });

        // Act
        await renderAndWaitForInit(mockProblems);

        // Assert (findByTestId で非同期に待つ)
        const toastElement = await screen.findByTestId(
          "mock-notification-toast"
        );
        expect(toastElement).toHaveTextContent(notificationMessage);
        // 他の属性アサーション...
      });

      it("時間切れ時に onTimeUp コールバックが呼ばれると解答提出処理がトリガーされる", async () => {
        // Arrange
        setMockTimerState({ timeRemaining: 1, isTimerRunning: true });
        // submit API の準備
        mocks.mockSubmitQuizAnswers.mockResolvedValue({ results: [] });

        // Act
        await renderAndWaitForInit(mockProblems); // レンダリングして onTimeUp を useTimer に渡す

        // onTimeUp を取得して呼び出し
        const lastCallArgs =
          mocks.mockUseTimer.mock.calls[
            mocks.mockUseTimer.mock.calls.length - 1
          ];
        const optionsArg = lastCallArgs?.[1] as TimerOptions | undefined;
        const onTimeUpCallback = optionsArg?.onTimeUp;
        expect(onTimeUpCallback).toBeDefined();
        expect(typeof onTimeUpCallback).toBe("function");

        if (onTimeUpCallback) await onTimeUpCallback(); // 時間切れ発生

        // Assert
        await waitFor(() => {
          expect(mocks.mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe("解答の選択 (Answer Selection)", () => {
      it("ProblemItem で選択肢を選ぶと内部状態が更新され、提出データに反映される", async () => {
        const user = userEvent.setup();
        const choiceId1 = "b";
        const choiceId2 = "c";
        // find と Optional chaining で安全にコールバック呼び出し
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", choiceId1);
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q2")
          ?.onAnswerSelect("q2", choiceId2);

        await user.click(screen.getByRole("button", { name: "解答する" }));

        await waitFor(() => {
          expect(mocks.mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
          const payload = mocks.mockSubmitQuizAnswers.mock
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
        ); // 再レンダリング
        const submitButton = screen.getByRole("button", { name: "解答する" });
        expect(submitButton).toBeDisabled();
      });

      it("提出中は解答を選択できない (提出ペイロードに反映されない)", async () => {
        const user = userEvent.setup();
        let resolveSubmit: ((value: { results: [] }) => void) | undefined;
        mocks.mockSubmitQuizAnswers.mockImplementation(
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
          expect(mocks.mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
          const payload = mocks.mockSubmitQuizAnswers.mock
            .calls[0][0] as AnswerPayload;
          expect(
            payload.answers.find((a) => a.questionId === "q1")?.answer
          ).toBe(initialChoiceId);
        });
      });
    }); // describe: 解答選択

    describe("解答の提出 (Submission Process)", () => {
      it("未解答がある状態で提出ボタンを押すと window.confirm が呼ばれる", async () => {
        const user = userEvent.setup();
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", "a"); // q1 のみ解答
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
        expect(mocks.mockSubmitQuizAnswers).not.toHaveBeenCalled();
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
          expect(mocks.mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
          const payload = mocks.mockSubmitQuizAnswers.mock
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
        mocks.mockSubmitQuizAnswers.mockImplementation(
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
            { questionId: "q1", /*...*/ isCorrect: true } as any,
            { questionId: "q2", /*...*/ isCorrect: false } as any,
          ],
        }; // 簡略化
        mocks.mockSubmitQuizAnswers.mockResolvedValue(mockResultsData);
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", "a");
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q2")
          ?.onAnswerSelect("q2", "c");
        await user.click(screen.getByRole("button", { name: "解答する" }));
        await waitFor(() => {
          expect(mocks.mockNavigateFn).toHaveBeenCalledWith(
            "/result",
            expect.objectContaining({
              state: expect.objectContaining({
                quizResults: mockResultsData.results,
                totalQuestions: mockProblems.length,
                correctQuestions: 1, // mockResultsData から計算
              }),
            })
          );
        });
      });

      it("解答提出失敗時にエラーメッセージが表示され、ボタンが有効に戻る", async () => {
        const user = userEvent.setup();
        const errorMessage = "提出エラー";
        mocks.mockSubmitQuizAnswers.mockRejectedValue(new Error(errorMessage));
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", "a");
        await user.click(screen.getByRole("button", { name: "解答する" }));
        await screen.findByText(`エラー: ${errorMessage}`);
        expect(mocks.mockNavigateFn).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "解答する" })).toBeEnabled();
      });

      it("時間切れ時に自動提出され、成功すれば結果画面へ navigate する", async () => {
        setMockTimerState({ timeRemaining: 1, isTimerRunning: true });
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );

        const lastCallArgs =
          mocks.mockUseTimer.mock.calls[
            mocks.mockUseTimer.mock.calls.length - 1
          ];
        const optionsArg = lastCallArgs[1] as TimerOptions | undefined;
        const onTimeUpCallback = optionsArg?.onTimeUp;
        expect(onTimeUpCallback).toBeDefined();
        if (onTimeUpCallback) await onTimeUpCallback();

        expect(mockConfirmSpy).not.toHaveBeenCalled();
        await waitFor(() => {
          expect(mocks.mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
          expect(mocks.mockNavigateFn).toHaveBeenCalledWith(
            "/result",
            expect.anything()
          );
        });
      });

      it("提出処理中に再度提出ボタンを押しても二重送信されない", async () => {
        const user = userEvent.setup();
        let resolveSubmit: ((value: any) => void) | undefined;
        mocks.mockSubmitQuizAnswers.mockImplementation(
          () =>
            new Promise((res) => {
              resolveSubmit = res;
            })
        );
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", "a");
        const submitButton = screen.getByRole("button", { name: "解答する" });
        await user.click(submitButton); // 1回目
        await screen.findByRole("button", { name: "提出中..." });
        await user.click(submitButton); // 2回目 (無効なはず)
        expect(mocks.mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
        if (resolveSubmit) resolveSubmit({ results: [] });
        await waitFor(() => expect(mocks.mockNavigateFn).toHaveBeenCalled()); // 遷移を待つ
        expect(mocks.mockSubmitQuizAnswers).toHaveBeenCalledTimes(1); // 最終的に1回
      });
    }); // describe: 解答提出

    describe("画面離脱防止機能 (Navigation Blocking)", () => {
      it("解答中に useBlocker がブロック状態を返すと確認ダイアログが表示される", async () => {
        mockReturnedBlockerValue = {
          state: "blocked",
          proceed: mocks.mockBlockerProceedFn,
          reset: mocks.mockBlockerResetFn,
        };
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        ); // blocker の変更を反映させるために再レンダリング
        const dialog = await screen.findByTestId("mock-confirmation-dialog");
        expect(dialog).toBeInTheDocument();
      });

      it("確認ダイアログで「OK」をクリックすると blocker.proceed が呼ばれる", async () => {
        const user = userEvent.setup();
        mockReturnedBlockerValue = {
          state: "blocked",
          proceed: mocks.mockBlockerProceedFn,
          reset: mocks.mockBlockerResetFn,
        };
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        const confirmButton = await screen.findByTestId("mock-confirm-button");
        await user.click(confirmButton);
        expect(mocks.mockBlockerProceedFn).toHaveBeenCalledTimes(1);
        expect(mocks.mockBlockerResetFn).not.toHaveBeenCalled();
        expect(
          screen.queryByTestId("mock-confirmation-dialog")
        ).not.toBeInTheDocument();
      });

      it("確認ダイアログで「キャンセル」をクリックすると blocker.reset が呼ばれる", async () => {
        const user = userEvent.setup();
        mockReturnedBlockerValue = {
          state: "blocked",
          proceed: mocks.mockBlockerProceedFn,
          reset: mocks.mockBlockerResetFn,
        };
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        const cancelButton = await screen.findByTestId("mock-cancel-button");
        await user.click(cancelButton);
        expect(mocks.mockBlockerResetFn).toHaveBeenCalledTimes(1);
        expect(mocks.mockBlockerProceedFn).not.toHaveBeenCalled();
        expect(
          screen.queryByTestId("mock-confirmation-dialog")
        ).not.toBeInTheDocument();
      });

      it("時間切れ後はブロッカーが作動せず、確認ダイアログは表示されない", () => {
        setMockTimerState({ timeRemaining: 0, isTimerRunning: false });
        mockReturnedBlockerValue = null;
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
        mocks.mockSubmitQuizAnswers.mockImplementation(
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
        mockReturnedBlockerValue = null;
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        ); // 再レンダリング
        expect(
          screen.queryByTestId("mock-confirmation-dialog")
        ).not.toBeInTheDocument();
        if (resolveSubmit) resolveSubmit({ results: [] });
      });
    });
  });
});
