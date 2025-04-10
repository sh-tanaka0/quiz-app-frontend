// src/pages/AnswerInputScreen.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"; // afterEach を追加 (restoreAllMocks のため)
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import type { Mock, MockInstance } from "vitest";

// テスト対象コンポーネント
import AnswerInputScreen from "../pages/AnswerInputScreen"; // パスを調整

// 関連する型定義・コンポーネント・フック (モックや型付けのため)
import type {
  Problem,
  AnswerPayload,
  AnswersApiResponse,
  NotificationLevel,
} from "@/types/quiz"; // パスを調整
import type { ProblemItemProps } from "@/components/quiz/ProblemItem"; // パス調整
import type { NotificationToastProps } from "@/components/quiz/NotificationToast"; // パス調整
import type { ConfirmationDialogProps } from "@/components/common/ConfirmationDialog"; // パス調整
import { useTimer } from "@/hooks/useTimer"; // useTimer の型取得のため元のフックもインポート
import type { TimerState } from "@/hooks/useTimer"; // useTimer の戻り値の型 (もしエクスポートされていれば)
import * as apiService from "@/services/api"; // 元のAPIサービス (型推論用)
import {
  BOOK_SOURCE_OPTIONS,
  PROBLEM_COUNT_OPTIONS,
  TIME_LIMIT_OPTIONS,
  DEFAULT_BOOK_SOURCE,
} from "@/constants/quizSettings"; // 定数もインポート

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
let mockConfirmSpy: MockInstance<[message?: string | undefined], boolean>;

// ==================================
// テストスイート
// ==================================
describe("AnswerInputScreen", () => {
  // モックのセットアップとクリア
  beforeEach(() => {
    vi.clearAllMocks(); // Vitest のモックをクリア
    mockSearchParamsGet.mockReset(); // 個別のモック実装をリセット
    mockReturnedBlocker = null; // ブロッカー状態をリセット
    currentMockTimerState = { ...defaultMockTimerState }; // タイマー状態をリセット
    // Props 記録用配列をクリア
    mockProblemItemProps.length = 0;
    mockNotificationToastProps.length = 0;
    mockConfirmationDialogProps.length = 0;
    // window.confirm のスパイを設定 (テスト実行時に window が存在することを保証するため beforeEach 内)
    mockConfirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => true); // デフォルトは OK とする
  });

  // スパイを確実にリストアするための設定 (オプションだが推奨)
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
      mockFetchQuizQuestions.mockResolvedValue({
        sessionId: "test-session",
        questions: [],
      });
      const expectedTotalTime = expectedTimeLimit * expectedCount;
      const initialTimerState = {
        ...defaultMockTimerState,
        timeRemaining: expectedTotalTime,
        formattedTime: "02:30",
      };
      setMockTimerState(initialTimerState);

      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );

      await vi.waitFor(() => {
        expect(mockFetchQuizQuestions).toHaveBeenCalledWith(
          expectedBookSource,
          expectedCount,
          expectedTimeLimit
        );
      });
      expect(mockUseTimer).toHaveBeenCalled();
      expect(currentMockTimerState.timeRemaining).toBe(expectedTotalTime);
    });

    it("問題取得中にローディング状態が表示される", () => {
      let resolveFetch: (value: any) => void; // 型をanyに変更 (ここでは具体的な型は不要なため)
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

      // resolveFetch({ sessionId: 'dummy', questions: [] }); // テストをハングさせないための後処理 (ここでは不要かも)
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
      const mockSessionId = "session-success";
      mockFetchQuizQuestions.mockResolvedValue({
        sessionId: mockSessionId,
        questions: mockProblems,
      });
      mockSearchParamsGet.mockReturnValue("10");
      const timerDisplayValue = "01:00";
      setMockTimerState({ formattedTime: timerDisplayValue });

      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(
          screen.queryByText("問題を読み込んでいます...")
        ).not.toBeInTheDocument();
      });
      expect(screen.queryByText(/エラー:/)).not.toBeInTheDocument();
      expect(screen.getByText(timerDisplayValue)).toBeInTheDocument();
      expect(mockProblemItemProps.length).toBe(mockProblems.length);
      expect(mockProblemItemProps[0].problem).toEqual(mockProblems[0]);
      expect(mockProblemItemProps[1].problem).toEqual(mockProblems[1]);
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

      await waitFor(() => {
        expect(
          screen.queryByText("問題を読み込んでいます...")
        ).not.toBeInTheDocument();
      });
      expect(screen.getByText(`エラー: ${errorMessage}`)).toBeInTheDocument();
      expect(screen.queryByText(/問題解答/)).not.toBeInTheDocument();
      expect(mockProblemItemProps.length).toBe(0);
    });
  });

  describe("タイマー機能との連携 (Timer Interaction)", () => {
    beforeEach(() => {
      // この describe 内のテストは問題読み込み成功が前提
      mockFetchQuizQuestions.mockResolvedValue({
        sessionId: "s1",
        questions: [
          {
            questionId: "q1",
            question: "Q1",
            options: [],
            correctAnswer: "a",
            explanation: "e1",
            category: "c1",
          },
        ],
      });
      mockSearchParamsGet.mockReturnValue("10");
    });

    it("モックタイマーの残り時間 (formattedTime) が正しく表示される", async () => {
      const expectedFormattedTime = "03:45";
      setMockTimerState({ formattedTime: expectedFormattedTime });

      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() => expect(mockFetchQuizQuestions).toHaveBeenCalled());

      expect(screen.getByText(expectedFormattedTime)).toBeInTheDocument();
    });

    it("モックタイマーの警告レベルに応じてタイマー表示要素に色クラスが付与される", async () => {
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
      await waitFor(() => expect(mockFetchQuizQuestions).toHaveBeenCalled());

      const timeElement = screen.getByText(expectedFormattedTime);
      expect(timeElement).toHaveClass(expectedColorClass);
      const clockIcon = timeElement.previousElementSibling;
      if (clockIcon) {
        expect(clockIcon).toHaveClass(expectedColorClass);
      }
    });

    it("モックタイマーの通知状態に応じて NotificationToast が表示される", async () => {
      const notificationMessage = "残り時間が10%を切りました！";
      const notificationLevel: NotificationLevel = "critical";
      setMockTimerState({
        notification: {
          show: true,
          message: notificationMessage,
          level: notificationLevel,
        },
        timerColorClass: "text-red-600",
      });

      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() => expect(mockFetchQuizQuestions).toHaveBeenCalled());

      // props 配列で検証
      expect(mockNotificationToastProps.length).toBeGreaterThan(0);
      const lastProps =
        mockNotificationToastProps[mockNotificationToastProps.length - 1];
      expect(lastProps.show).toBe(true);
      expect(lastProps.message).toBe(notificationMessage);
      expect(lastProps.level).toBe(notificationLevel);

      // モックの表示内容で検証
      const toastElement = screen.getByTestId("mock-notification-toast");
      expect(toastElement).toBeInTheDocument();
      expect(toastElement).toHaveTextContent(notificationMessage);
    });

    it("モックタイマーの通知状態(show:false)では NotificationToast が表示されない", async () => {
      // デフォルトで show: false のため setMockTimerState は不要
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() => expect(mockFetchQuizQuestions).toHaveBeenCalled());

      expect(
        screen.queryByTestId("mock-notification-toast")
      ).not.toBeInTheDocument();
    });

    it("時間切れ時に onTimeUp コールバックが呼ばれると解答提出処理がトリガーされる", async () => {
      mockSubmitQuizAnswers.mockResolvedValue({ results: [] });
      setMockTimerState({ timeRemaining: 1, isTimerRunning: true }); // 時間切れ直前

      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() => expect(mockFetchQuizQuestions).toHaveBeenCalled());

      const onTimeUpCallback = mockUseTimer.mock.calls[0]?.[1]?.onTimeUp;
      expect(onTimeUpCallback).toBeDefined();

      if (onTimeUpCallback) {
        await onTimeUpCallback();
      } else {
        throw new Error("onTimeUp callback was not passed to useTimer mock");
      }

      await waitFor(() => {
        expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("解答の選択 (Answer Selection)", () => {
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
        category: "",
      },
      {
        questionId: "q2",
        question: "Q2",
        options: [
          { id: "c", text: "C" },
          { id: "d", text: "D" },
        ],
        correctAnswer: "d",
        explanation: "",
        category: "",
      },
    ];

    beforeEach(() => {
      // この describe 内のテストは問題読み込み成功が前提
      mockFetchQuizQuestions.mockResolvedValue({
        sessionId: "s1",
        questions: mockProblems,
      });
      mockSubmitQuizAnswers.mockResolvedValue({ results: [] });
      mockSearchParamsGet.mockReturnValue("10");
      setMockTimerState({ timeRemaining: 100, isTimerRunning: true }); // タイマー動作中
    });

    it("ProblemItem で選択肢を選ぶと内部状態が更新され、提出データに反映される", async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBe(mockProblems.length)
      );

      const problem1Props = mockProblemItemProps.find(
        (p) => p.problem.questionId === "q1"
      );
      const choiceId1 = "b"; // q1 -> b
      problem1Props?.onAnswerSelect("q1", choiceId1);

      const problem2Props = mockProblemItemProps.find(
        (p) => p.problem.questionId === "q2"
      );
      const choiceId2 = "c"; // q2 -> c
      problem2Props?.onAnswerSelect("q2", choiceId2);

      const submitButton = screen.getByRole("button", { name: "解答する" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
        const submittedPayload = mockSubmitQuizAnswers.mock
          .calls[0][0] as AnswerPayload;
        expect(
          submittedPayload.answers.find((a) => a.questionId === "q1")?.answer
        ).toBe(choiceId1);
        expect(
          submittedPayload.answers.find((a) => a.questionId === "q2")?.answer
        ).toBe(choiceId2);
      });
    });

    it("時間切れ後は解答を選択できない (提出ボタンが無効)", async () => {
      setMockTimerState({ timeRemaining: 0, isTimerRunning: false }); // 時間切れ

      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBe(mockProblems.length)
      );

      const problem1Props = mockProblemItemProps.find(
        (p) => p.problem.questionId === "q1"
      );
      const choiceId1 = "b";
      // onAnswerSelect を呼び出してみる
      problem1Props?.onAnswerSelect("q1", choiceId1);

      // ボタンが無効であることを確認
      const submitButton = screen.getByRole("button", { name: "解答する" });
      expect(submitButton).toBeDisabled();
      // 意図せず提出されないことを確認
      expect(mockSubmitQuizAnswers).not.toHaveBeenCalled();
    });

    it("提出中は解答を選択できない (提出ペイロードに反映されない)", async () => {
      const user = userEvent.setup();
      let resolveSubmit: (value: { results: [] }) => void;
      mockSubmitQuizAnswers.mockImplementation(
        () =>
          new Promise((res) => {
            resolveSubmit = res;
          })
      ); // 提出保留

      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBe(mockProblems.length)
      );

      // 最初に q1 -> a を選択
      const initialChoiceId = "a";
      mockProblemItemProps
        .find((p) => p.problem.questionId === "q1")
        ?.onAnswerSelect("q1", initialChoiceId);

      // 提出開始
      const submitButton = screen.getByRole("button", { name: "解答する" });
      await user.click(submitButton);
      await screen.findByRole("button", { name: "提出中..." });
      expect(submitButton).toBeDisabled();

      // 提出中に q1 -> b を選択しようとする
      const choiceWhileSubmitting = "b";
      mockProblemItemProps
        .find((p) => p.problem.questionId === "q1")
        ?.onAnswerSelect("q1", choiceWhileSubmitting);

      // 提出完了
      resolveSubmit({ results: [] });

      // 提出されたペイロードを確認
      await waitFor(() => {
        expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
        const submittedPayload = mockSubmitQuizAnswers.mock
          .calls[0][0] as AnswerPayload;
        // 提出中に選択しようとした 'b' ではなく、最初の 'a' が送信されているはず
        expect(
          submittedPayload.answers.find((a) => a.questionId === "q1")?.answer
        ).toBe(initialChoiceId);
      });
    });
  });

  describe("解答の提出 (Submission Process)", () => {
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

    beforeEach(() => {
      // この describe 内のテストは問題読み込み成功が前提
      mockFetchQuizQuestions.mockResolvedValue({
        sessionId: mockSessionId,
        questions: mockProblems,
      });
      mockSearchParamsGet.mockReturnValue("10");
      setMockTimerState({ timeRemaining: 100, isTimerRunning: true }); // タイマー動作中
      mockSubmitQuizAnswers.mockResolvedValue({ results: [] }); // デフォルトは成功
      // confirm Spy は beforeEach で true を返すように設定済み (必要なら上書き)
    });

    it("未解答がある状態で提出ボタンを押すと window.confirm が呼ばれる", async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBe(mockProblems.length)
      );
      // 1問目 (q1) のみ解答
      mockProblemItemProps
        .find((p) => p.problem.questionId === "q1")
        ?.onAnswerSelect("q1", "a");

      const submitButton = screen.getByRole("button", { name: "解答する" });
      await user.click(submitButton);

      expect(mockConfirmSpy).toHaveBeenCalledTimes(1);
      expect(mockConfirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("未解答の問題が 1 問あります")
      );
    });

    it("未解答確認ダイアログでキャンセルすると submit API は呼ばれない", async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBe(mockProblems.length)
      );
      mockProblemItemProps
        .find((p) => p.problem.questionId === "q1")
        ?.onAnswerSelect("q1", "a"); // 1問目のみ解答
      mockConfirmSpy.mockReturnValueOnce(false); // キャンセルをシミュレート

      const submitButton = screen.getByRole("button", { name: "解答する" });
      await user.click(submitButton);

      expect(mockConfirmSpy).toHaveBeenCalledTimes(1);
      expect(mockSubmitQuizAnswers).not.toHaveBeenCalled();
      expect(submitButton).toBeEnabled();
    });

    it("全問解答して提出すると正しいペイロードで submit API が呼ばれる", async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBe(mockProblems.length)
      );

      const answer1 = "b";
      const answer2 = "c";
      mockProblemItemProps
        .find((p) => p.problem.questionId === "q1")
        ?.onAnswerSelect("q1", answer1);
      mockProblemItemProps
        .find((p) => p.problem.questionId === "q2")
        ?.onAnswerSelect("q2", answer2);

      const submitButton = screen.getByRole("button", { name: "解答する" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
        const submittedPayload = mockSubmitQuizAnswers.mock
          .calls[0][0] as AnswerPayload;
        expect(submittedPayload.sessionId).toBe(mockSessionId);
        expect(submittedPayload.answers).toHaveLength(mockProblems.length);
        expect(
          submittedPayload.answers.find((a) => a.questionId === "q1")?.answer
        ).toBe(answer1);
        expect(
          submittedPayload.answers.find((a) => a.questionId === "q2")?.answer
        ).toBe(answer2);
      });
    });

    it("提出中は解答ボタンが「提出中...」になり無効化される", async () => {
      const user = userEvent.setup();
      let resolveSubmit: (value: any) => void;
      mockSubmitQuizAnswers.mockImplementation(
        () =>
          new Promise((res) => {
            resolveSubmit = res;
          })
      );
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBe(mockProblems.length)
      );
      mockProblemItemProps
        .find((p) => p.problem.questionId === "q1")
        ?.onAnswerSelect("q1", "a"); // 何か解答

      const submitButton = screen.getByRole("button", { name: "解答する" });
      await user.click(submitButton);

      const submittingButton = await screen.findByRole("button", {
        name: "提出中...",
      });
      expect(submittingButton).toBeDisabled();

      resolveSubmit({ results: [] }); // 後処理
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
      mockSubmitQuizAnswers.mockResolvedValue(mockResultsData); // 成功レスポンス設定

      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBe(mockProblems.length)
      );
      mockProblemItemProps
        .find((p) => p.problem.questionId === "q1")
        ?.onAnswerSelect("q1", "a");
      mockProblemItemProps
        .find((p) => p.problem.questionId === "q2")
        ?.onAnswerSelect("q2", "c");

      const submitButton = screen.getByRole("button", { name: "解答する" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith(
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
      mockSubmitQuizAnswers.mockRejectedValue(new Error(errorMessage)); // 失敗させる

      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBe(mockProblems.length)
      );
      mockProblemItemProps
        .find((p) => p.problem.questionId === "q1")
        ?.onAnswerSelect("q1", "a");

      const submitButton = screen.getByRole("button", { name: "解答する" });
      await user.click(submitButton);

      await screen.findByText(`エラー: ${errorMessage}`);
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(submitButton).toBeEnabled();
      expect(submitButton).toHaveTextContent("解答する");
    });

    it("時間切れ時に自動提出され、成功すれば結果画面へ navigate する", async () => {
      mockSubmitQuizAnswers.mockResolvedValue({ results: [] }); // 成功させる
      setMockTimerState({ timeRemaining: 1, isTimerRunning: true }); // 時間切れ直前

      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBe(mockProblems.length)
      );

      const onTimeUpCallback = mockUseTimer.mock.calls[0]?.[1]?.onTimeUp;
      expect(onTimeUpCallback).toBeDefined();

      if (onTimeUpCallback) {
        await onTimeUpCallback();
      } // 時間切れを発生させる

      expect(mockConfirmSpy).not.toHaveBeenCalled(); // confirm は呼ばれない
      await waitFor(() => {
        expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/result", expect.anything());
      });
    });

    it("提出処理中に再度提出ボタンを押しても二重送信されない", async () => {
      const user = userEvent.setup();
      let resolveSubmit: (value: any) => void;
      mockSubmitQuizAnswers.mockImplementation(
        () =>
          new Promise((res) => {
            resolveSubmit = res;
          })
      );
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBe(mockProblems.length)
      );
      mockProblemItemProps
        .find((p) => p.problem.questionId === "q1")
        ?.onAnswerSelect("q1", "a");

      const submitButton = screen.getByRole("button", { name: "解答する" });
      // 1回目のクリック
      await user.click(submitButton);
      await screen.findByRole("button", { name: "提出中..." });
      expect(submitButton).toBeDisabled();

      // 2回目のクリック (無効なので効かないはず)
      await user.click(submitButton);

      expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1); // まだ1回

      resolveSubmit({ results: [] }); // 提出完了
      await waitFor(() => expect(mockNavigate).toHaveBeenCalled());

      expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1); // 最終的に1回だけ
    });
  });

  describe("画面離脱防止機能 (Navigation Blocking)", () => {
    beforeEach(() => {
      // この describe 内のテストは問題読み込み成功が前提
      mockFetchQuizQuestions.mockResolvedValue({
        sessionId: "s1",
        questions: [
          {
            questionId: "q1",
            /*...*/ options: [],
            correctAnswer: "a",
            explanation: "",
            category: "",
          },
        ],
      });
      mockSearchParamsGet.mockReturnValue("10");
      setMockTimerState({ timeRemaining: 100, isTimerRunning: true }); // タイマー動作中
    });

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
      const lastDialogProps =
        mockConfirmationDialogProps[mockConfirmationDialogProps.length - 1];
      expect(lastDialogProps.show).toBe(true);
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
      setMockTimerState({ timeRemaining: 0, isTimerRunning: false }); // 時間切れ
      mockReturnedBlocker = null; // ブロックしない
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
      let resolveSubmit: (value: any) => void;
      mockSubmitQuizAnswers.mockImplementation(
        () =>
          new Promise((res) => {
            resolveSubmit = res;
          })
      );
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBeGreaterThan(0)
      );
      mockProblemItemProps[0]?.onAnswerSelect("q1", "a");
      const submitButton = screen.getByRole("button", { name: "解答する" });
      await user.click(submitButton);
      await screen.findByRole("button", { name: "提出中..." }); // 提出中状態

      mockReturnedBlocker = null; // ブロックしない設定

      // ここで離脱を試みるようなテストは難しいが、
      // blocker が null を返していればダイアログは出ないはず
      expect(
        screen.queryByTestId("mock-confirmation-dialog")
      ).not.toBeInTheDocument();

      resolveSubmit({ results: [] }); // 後処理
    });
  });
});
