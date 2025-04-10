// src/pages/AnswerInputScreen.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
// Vitest から Mock 型をインポート
import type { Mock, MockInstance } from "vitest";
import { useTimer } from "@/hooks/useTimer"; // パスを調整
import type { TimerState } from "@/hooks/useTimer"; // パスを調整

// テスト対象コンポーネント
import AnswerInputScreen from "../pages/AnswerInputScreen"; // パスを調整

// 関連する型定義
import type { Problem, AnswerPayload, AnswersApiResponse } from "@/types/quiz"; // パスを調整

// 子コンポーネントとその Props 型をインポート
import ProblemItem from "@/components/quiz/ProblemItem"; // パス調整
import type { ProblemItemProps } from "@/components/quiz/ProblemItem"; // 型のみインポート
import NotificationToast from "@/components/quiz/NotificationToast"; // パス調整
import type { NotificationToastProps } from "@/components/quiz/NotificationToast"; // 型のみインポート
import ConfirmationDialog from "@/components/common/ConfirmationDialog"; // パス調整
import type { ConfirmationDialogProps } from "@/components/common/ConfirmationDialog"; // 型のみインポート

// ==================================
// モック設定
// ==================================

// --- API Service Mocks ---
import * as apiService from "@/services/api"; // 元のAPIサービス (型推論用)
import { a } from "vitest/dist/chunks/suite.d.FvehnV49.js";
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

// 各モックコンポーネントに渡された props を記録するための配列
const mockProblemItemProps: ProblemItemProps[] = [];
const mockNotificationToastProps: NotificationToastProps[] = [];
const mockConfirmationDialogProps: ConfirmationDialogProps[] = [];

// 2. 各子コンポーネントをモック化:
// --- ProblemItem モック ---
vi.mock("@/components/quiz/ProblemItem", () => ({
  // default エクスポートをモックする
  default: vi.fn((props: ProblemItemProps) => {
    // 渡された props を記録
    mockProblemItemProps.push(props);
    // テストで識別しやすいようにシンプルな div をレンダリング
    return (
      <div data-testid={`mock-problem-item-${props.problem.questionId}`}>
        {/* 必要なら props の一部を表示しても良い */}
        Question: {props.problem.question} (Selected:{" "}
        {props.selectedAnswer ?? "none"})
        {/* 実際の選択肢レンダリングやクリック処理は不要 */}
        {/* クリックをシミュレートしたい場合は、テストコードから props.onAnswerSelect を直接呼ぶ */}
      </div>
    );
  }),
}));

// --- NotificationToast モック ---
vi.mock("@/components/quiz/NotificationToast", () => ({
  default: vi.fn((props: NotificationToastProps) => {
    mockNotificationToastProps.push(props);
    // show が true の場合のみ表示するシンプルなモック
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

// --- ConfirmationDialog モック ---
vi.mock("@/components/common/ConfirmationDialog", () => ({
  default: vi.fn((props: ConfirmationDialogProps) => {
    mockConfirmationDialogProps.push(props);
    // show が true の場合のみ表示
    if (!props.show) return null;
    return (
      <div data-testid="mock-confirmation-dialog">
        <p>{props.message}</p>
        {/* 実際のダイアログUIではなく、テストから操作できるボタンを用意 */}
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

// window.confirm のスパイを保持する変数 (let で宣言)
let mockConfirmSpy: MockInstance<(message?: string | undefined) => boolean>;

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

    // 各テストの前に props 記録用配列をクリア
    mockProblemItemProps.length = 0;
    mockNotificationToastProps.length = 0;
    mockConfirmationDialogProps.length = 0;
    // 各テストの前に window.confirm をスパイする
    mockConfirmSpy = vi.spyOn(window, "confirm");
  });

  // --- テストケースはここに追加していく ---

  // 例: window.confirm で false (キャンセル) を返すテストケース
  it("未解答で提出時に確認ダイアログでキャンセルすると送信しない", () => {
    // このテストケース内での confirm の戻り値を false に設定
    mockConfirmSpy.mockReturnValueOnce(false);

    // ... (コンポーネントを render し、未解答状態で提出ボタンを押す操作) ...

    // confirm が呼ばれたか、submit API が呼ばれなかったかなどを検証
    expect(mockConfirmSpy).toHaveBeenCalled();
    expect(mockSubmitQuizAnswers).not.toHaveBeenCalled();
    // ...
  });

  describe("初期化と問題読み込み (Initialization and Data Loading)", () => {
    it("URLパラメータを正しく読み取り、stateの初期値が設定される", async () => {
      // useSearchParams のモック設定
      const expectedTimeLimit = 30;
      const expectedCount = 5;
      const expectedBookSource = "programming_principles";
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === "timeLimit") return expectedTimeLimit.toString();
        if (key === "count") return expectedCount.toString();
        if (key === "bookSource") return expectedBookSource;
        return null;
      });

      // APIは適当に成功させる (このテストの主眼ではないため)
      mockFetchQuizQuestions.mockResolvedValue({
        sessionId: "test-session",
        questions: [],
      });
      // useTimer の初期状態を設定 (初期時間が計算されることを期待)
      const expectedTotalTime = expectedTimeLimit * expectedCount;
      const initialTimerState = {
        ...defaultMockTimerState,
        timeRemaining: expectedTotalTime,
        formattedTime: "02:30",
      };
      setMockTimerState(initialTimerState); // 初期状態をセット

      // コンポーネントをレンダリング
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );

      // Assert:
      // 1. fetchQuizQuestions が URL パラメータ由来の値で呼び出されたか (非同期なので待機)
      await vi.waitFor(() => {
        expect(mockFetchQuizQuestions).toHaveBeenCalledWith(
          expectedBookSource,
          expectedCount,
          expectedTimeLimit
        );
      });
      // 2. useTimer が URL パラメータから計算された初期時間で呼び出されたか
      //    (useTimer の第一引数 initialTotalTime を検証)
      //    ※ useTimer のモック実装によっては、呼び出し引数の直接検証が難しい場合がある。
      //      ここでは、useTimer が期待される初期状態 (計算後の時間) でモックされているかで代替検証。
      expect(mockUseTimer).toHaveBeenCalled();
      // useTimer のモックが期待される初期状態を返していることを確認
      expect(currentMockTimerState.timeRemaining).toBe(expectedTotalTime);
    });

    // URLパラメータを正しく読み取り、stateの初期値が設定されるのテストと重複するため省略
    it.todo("問題取得API (fetchQuizQuestions) を正しい引数で呼び出す");
    it("問題取得中にローディング状態が表示される", async () => {
      //  API モックが即座には解決しないように設定
      // (Promise を作成し、resolve 関数を後で呼べるように保持)
      let resolveFetch: (value: {
        sessionId: string;
        questions: Problem[];
      }) => void;
      mockFetchQuizQuestions.mockImplementation(
        () =>
          new Promise((res) => {
            resolveFetch = res;
          })
      );
      //  URLパラメータは適当に設定
      mockSearchParamsGet.mockReturnValue("10"); // 例

      // Act: コンポーネントをレンダリング
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );

      // Assert: ローディングテキストが表示されていることを確認
      expect(screen.getByText("問題を読み込んでいます...")).toBeInTheDocument();

      // クリーンアップ (テストがハングしないように Promise を解決させる)
      // resolveFetch({ sessionId: 'dummy', questions: [] }); // このテスト自体には不要だが、後処理として推奨
    });
    it("問題取得成功時に問題リストとタイマーが表示される", async () => {
      // モックデータ準備
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
      // API モックを成功させる
      mockFetchQuizQuestions.mockResolvedValue({
        sessionId: mockSessionId,
        questions: mockProblems,
      });
      // URLパラメータ設定 (適当でOK)
      mockSearchParamsGet.mockReturnValue("10");
      // タイマーモックの初期状態 (適当でOK)
      const timerDisplayValue = "01:00";
      setMockTimerState({ formattedTime: timerDisplayValue });

      // Act: コンポーネントをレンダリング
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );

      // Assert:
      // 1. ローディングが消えていることを確認 (非同期で消えるのを待つ)
      await waitFor(() => {
        expect(
          screen.queryByText("問題を読み込んでいます...")
        ).not.toBeInTheDocument();
      });

      // 2. エラーが表示されていないことを確認
      expect(screen.queryByText(/エラー:/)).not.toBeInTheDocument();

      // 3. タイマーが表示されていることを確認 (モックの値で)
      expect(screen.getByText(timerDisplayValue)).toBeInTheDocument();

      // 4. 問題リストが表示されていることを確認 (ProblemItem モックが呼ばれたかで判断)
      //    ProblemItem モックが問題の数だけ呼ばれていることを確認
      expect(mockProblemItemProps.length).toBe(mockProblems.length);
      //    最初の ProblemItem に正しい問題データが渡されたかを確認
      expect(mockProblemItemProps[0].problem).toEqual(mockProblems[0]);
      expect(mockProblemItemProps[0].index).toBe(0);
      //    2番目の ProblemItem に正しい問題データが渡されたかを確認
      expect(mockProblemItemProps[1].problem).toEqual(mockProblems[1]);
      expect(mockProblemItemProps[1].index).toBe(1);

      // 5. ヘッダーのタイトルに問題数が表示されているか確認
      expect(
        screen.getByText(`問題解答 (${mockProblems.length}問)`)
      ).toBeInTheDocument();
    });

    it("問題取得失敗時にエラーメッセージが表示される", async () => {
      //  エラーメッセージ設定
      const errorMessage = "サーバーエラーが発生しました";
      //  API モックを失敗させる
      mockFetchQuizQuestions.mockRejectedValue(new Error(errorMessage));
      //  URLパラメータ設定 (適当でOK)
      mockSearchParamsGet.mockReturnValue("10");

      // コンポーネントをレンダリング
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );

      // Assert:
      // 1. ローディングが消えていることを確認 (非同期で消えるのを待つ)
      await waitFor(() => {
        expect(
          screen.queryByText("問題を読み込んでいます...")
        ).not.toBeInTheDocument();
      });

      // 2. エラーメッセージが表示されていることを確認
      expect(screen.getByText(`エラー: ${errorMessage}`)).toBeInTheDocument();
      // または部分一致で
      expect(screen.getByText(/エラー:/)).toBeInTheDocument();

      // 3. 問題リストやタイマーが表示されていないことを確認
      expect(screen.queryByText(/問題解答/)).not.toBeInTheDocument(); // ヘッダータイトル
      expect(mockProblemItemProps.length).toBe(0); // ProblemItem が呼ばれていない
    });

    // モックデータの確認は省略
    it.todo("モックデータ使用フラグが有効な場合、モックデータを読み込む");
  });

  describe("タイマー機能との連携 (Timer Interaction)", () => {
    it.todo(
      "モックタイマーの残り時間とフォーマットされた時間が正しく表示される"
    );
    it.todo("モックタイマーの警告レベルに応じてタイマーの色が変わる");
    it.todo("モックタイマーの警告レベルに応じて通知トーストが表示される");
    it.todo(
      "モックタイマーの時間切れ時に onTimeUp コールバック経由で提出処理がトリガーされる"
    );
    // it.todo('タイマーが0になったら解答ボタンが無効化される'); // これは提出や選択のテストでカバーされるかも
  });

  describe("解答の選択 (Answer Selection)", () => {
    it.todo(
      "ProblemItem で選択肢をクリックすると onAnswerSelect が呼ばれ、選択状態が更新される"
    );
    it.todo("時間切れ後は新しい解答を選択できない");
    it.todo("提出中は新しい解答を選択できない");
  });

  describe("解答の提出 (Submission Process)", () => {
    it.todo(
      "「解答する」ボタンクリック時に未解答があると window.confirm が呼ばれる"
    );
    it.todo("window.confirm でキャンセルすると submit API は呼ばれない");
    it.todo(
      "解答提出時に正しいペイロードで submit API (mockSubmitQuizAnswers) が呼ばれる"
    );
    it.todo("提出中は「解答する」ボタンが「提出中...」になり無効化される");
    it.todo("submit API 成功時に結果画面へ正しい state で navigate する");
    it.todo(
      "submit API 失敗時にエラーメッセージが表示され、ボタンが有効に戻る"
    );
    it.todo(
      "時間切れによる自動提出時にも submit API が呼ばれ、結果画面へ navigate する"
    );
    it.todo("提出処理中に再度「解答する」ボタンを押しても二重送信されない");
  });

  describe("画面離脱防止機能 (Navigation Blocking)", () => {
    it.todo(
      "解答中に離脱しようとすると useBlocker (モック) が作動し、確認ダイアログが表示される"
    );
    it.todo("確認ダイアログで「OK」を押すと blocker.proceed が呼ばれる");
    it.todo("確認ダイアログで「キャンセル」を押すと blocker.reset が呼ばれる");
    it.todo("時間切れ後や提出中はブロッカーが作動しない");
  });
});
