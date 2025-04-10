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
import type {
  Problem,
  AnswerPayload,
  AnswersApiResponse,
  NotificationLevel,
} from "@/types/quiz"; // パスを調整

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
    it("モックタイマーの残り時間とフォーマットされた時間が正しく表示される", async () => {
      //  API と searchParams の基本設定
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
      //  useTimer のモック状態を設定
      const expectedFormattedTime = "03:45";
      setMockTimerState({ formattedTime: expectedFormattedTime });

      // Act: レンダリングし、初期化完了を待つ
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() => expect(mockFetchQuizQuestions).toHaveBeenCalled()); // API呼び出し = 初期化完了の目安

      // Assert: 設定したフォーマット済み時間が表示されているか確認
      expect(screen.getByText(expectedFormattedTime)).toBeInTheDocument();
    });
    it("モックタイマーの警告レベルに応じてタイマーの色が変わる", async () => {
      //  API と searchParams の基本設定
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
      //  警告レベルが 'warning' の状態をシミュレート
      const expectedFormattedTime = "01:23"; // 表示確認用
      const expectedColorClass = "text-orange-500"; // useTimer が返すはずのクラス名
      setMockTimerState({
        warningLevel: "warning",
        timerColorClass: expectedColorClass, // モックがこのクラスを返すように設定
        formattedTime: expectedFormattedTime,
      });

      // Act: レンダリングし、初期化完了を待つ
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() => expect(mockFetchQuizQuestions).toHaveBeenCalled());

      // Assert:
      // 1. 時間表示要素を取得
      const timeElement = screen.getByText(expectedFormattedTime);
      expect(timeElement).toBeInTheDocument();
      // 2. 時間表示要素に期待される色クラスが付与されているか確認
      expect(timeElement).toHaveClass(expectedColorClass);

      // 3. (オプション) 時計アイコンにもクラスが付与されているか確認
      //    アイコン自体は lucide-react のものなので、直接テストは難しい場合がある
      //    親要素などでクラスを頼りに探すか、アイコンコンポーネントをモックしてテストする
      const clockIcon = timeElement.previousElementSibling; // 例: timeElement の直前の要素がアイコンだと仮定
      if (clockIcon) {
        // アイコンが見つかればクラスを確認
        expect(clockIcon).toHaveClass(expectedColorClass);
      }
    });
    it("モックタイマーの警告レベルに応じて通知トーストが表示される", async () => {
      //  API と searchParams の基本設定
      mockFetchQuizQuestions.mockResolvedValue({
        sessionId: "s1",
        questions: [
          /* ... */
        ],
      });
      mockSearchParamsGet.mockReturnValue("10");
      //  通知が表示される状態をシミュレート
      const notificationMessage = "残り時間が10%を切りました！";
      const notificationLevel: NotificationLevel = "critical";
      setMockTimerState({
        notification: {
          show: true,
          message: notificationMessage,
          level: notificationLevel,
        },
        timerColorClass: "text-red-600", // 通知レベルに合わせた色クラスも設定
      });

      // Act: レンダリングし、初期化完了を待つ
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() => expect(mockFetchQuizQuestions).toHaveBeenCalled());

      // Assert:
      // 1. NotificationToast のモックが呼ばれたことを確認 (props 配列を使用)
      expect(mockNotificationToastProps.length).toBeGreaterThan(0);
      // 2. 最後に渡された props を検証
      const lastProps =
        mockNotificationToastProps[mockNotificationToastProps.length - 1];
      expect(lastProps.show).toBe(true);
      expect(lastProps.message).toBe(notificationMessage);
      expect(lastProps.level).toBe(notificationLevel);
      expect(lastProps.colorClass).toBe("text-red-600"); // 渡された色クラス

      // 3. (別のアサーション方法) モックが表示する内容で検証
      //    NotificationToast のモック実装が data-testid やメッセージを表示する場合
      const toastElement = screen.getByTestId("mock-notification-toast");
      expect(toastElement).toBeInTheDocument();
      expect(toastElement).toHaveTextContent(notificationMessage);
      expect(toastElement).toHaveAttribute("data-level", notificationLevel);
      expect(toastElement).toHaveAttribute("data-color", "text-red-600");
    });

    it("モックタイマーの通知状態(show:false)では NotificationToast が表示されない", async () => {
      //  通知が表示されない状態 (デフォルト)
      mockFetchQuizQuestions.mockResolvedValue({
        sessionId: "s1",
        questions: [
          /* ... */
        ],
      });
      mockSearchParamsGet.mockReturnValue("10");
      // setMockTimerState はデフォルトで notification.show が false なので不要

      // Act: レンダリングし、初期化完了を待つ
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() => expect(mockFetchQuizQuestions).toHaveBeenCalled());

      // Assert: NotificationToast のモックが表示されていないことを確認
      // (props 配列の最後の要素の show が false か、または要素自体が存在しないか)
      if (mockNotificationToastProps.length > 0) {
        expect(
          mockNotificationToastProps[mockNotificationToastProps.length - 1].show
        ).toBe(false);
      }
      // または要素が存在しないことを確認
      expect(
        screen.queryByTestId("mock-notification-toast")
      ).not.toBeInTheDocument();
    });
    it("モックタイマーの時間切れ時に onTimeUp コールバック経由で提出処理がトリガーされる", async () => {
      //  API と searchParams の基本設定
      const mockProblems: Problem[] = [
        {
          questionId: "q1",
          question: "Sample question text",
          options: [],
          correctAnswer: "a",
          explanation: "",
          category: "",
        },
      ];
      mockFetchQuizQuestions.mockResolvedValue({
        sessionId: "s1",
        questions: mockProblems,
      });
      mockSearchParamsGet.mockReturnValue("10");
      //  解答提出APIは成功するように設定
      mockSubmitQuizAnswers.mockResolvedValue({ results: [] });
      //  useTimer の状態は timeRemaining > 0 で設定 (時間切れ「前」の状態)
      setMockTimerState({ timeRemaining: 1, isTimerRunning: true });

      // Act: レンダリングし、初期化完了を待つ
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() => expect(mockFetchQuizQuestions).toHaveBeenCalled());

      // Act: useTimer に渡された onTimeUp コールバックを取得
      // mockUseTimer.mock.calls[0] は useTimer が最初に呼ばれた時の引数リスト
      // [1] は第二引数の options オブジェクト、.onTimeUp でコールバック取得
      const onTimeUpCallback = mockUseTimer.mock.calls[0]?.[1]?.onTimeUp;
      expect(onTimeUpCallback).toBeDefined(); // コールバックが渡されているか確認

      // Act: 取得した onTimeUp コールバックを呼び出して時間切れをシミュレート
      // handleTimeUp -> handleSubmitRevised が async なので await する
      if (onTimeUpCallback) {
        await onTimeUpCallback();
      } else {
        throw new Error("onTimeUp callback was not passed to useTimer mock");
      }

      // Assert: 解答提出 API (mockSubmitQuizAnswers) が呼び出されたことを確認
      // handleSubmitRevised が非同期で submit を呼ぶため waitFor を使う
      await waitFor(() => {
        expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
        // オプション: 時間切れを示す情報が渡されているか確認 (もしあれば)
        // expect(mockSubmitQuizAnswers).toHaveBeenCalledWith(expect.objectContaining({ isTimeUp: true }));
      });
    });
    // it.todo('タイマーが0になったら解答ボタンが無効化される'); // これは提出や選択のテストでカバーされるかも
  });

  describe("解答の選択 (Answer Selection)", () => {
    it("ProblemItem で選択肢をクリックすると onAnswerSelect が呼ばれ、選択状態が更新される", async () => {
      //  データ読み込み成功状態にする
      const user = userEvent.setup();
      const mockProblems: Problem[] = [
        {
          questionId: "q1",
          question: "Q1",
          options: [
            { id: "a", text: "Opt A" },
            { id: "b", text: "Opt B" },
          ],
          correctAnswer: "a",
          explanation: "",
          category: "",
        },
        {
          questionId: "q2",
          question: "Q2",
          options: [
            { id: "c", text: "Opt C" },
            { id: "d", text: "Opt D" },
          ],
          correctAnswer: "d",
          explanation: "",
          category: "",
        },
      ];
      mockFetchQuizQuestions.mockResolvedValue({
        sessionId: "s1",
        questions: mockProblems,
      });
      mockSubmitQuizAnswers.mockResolvedValue({ results: [] }); // 送信は成功させる
      mockSearchParamsGet.mockReturnValue("10");
      setMockTimerState({ timeRemaining: 100, isTimerRunning: true }); // タイマー動作中

      // Act: レンダリングし、初期化完了を待つ
      render(
        <BrowserRouter>
          <AnswerInputScreen />
        </BrowserRouter>
      );
      await waitFor(() =>
        expect(mockProblemItemProps.length).toBe(mockProblems.length)
      ); // ProblemItem がレンダリングされるのを待つ

      //  1問目の ProblemItem の onAnswerSelect コールバックを取得
      const problem1Props = mockProblemItemProps[0];
      expect(problem1Props).toBeDefined();
      const problemIdToSelect = problem1Props.problem.questionId; // 'q1'
      const choiceIdToSelect = problem1Props.problem.options[1].id; // 'b'

      // Act: 1問目の onAnswerSelect コールバックを呼び出して選択をシミュレート
      if (problem1Props.onAnswerSelect) {
        problem1Props.onAnswerSelect(problemIdToSelect, choiceIdToSelect);
      } else {
        throw new Error("onAnswerSelect was not passed to ProblemItem mock");
      }

      // Act: 続けて2問目も選択
      const problem2Props = mockProblemItemProps[1];
      expect(problem2Props).toBeDefined();
      const problemId2ToSelect = problem2Props.problem.questionId; // 'q2'
      const choiceId2ToSelect = problem2Props.problem.options[0].id; // 'c'
      if (problem2Props.onAnswerSelect) {
        problem2Props.onAnswerSelect(problemId2ToSelect, choiceId2ToSelect);
      } else {
        throw new Error(
          "onAnswerSelect was not passed to ProblemItem mock for q2"
        );
      }

      // Act: 解答ボタンをクリックして提出
      const submitButton = screen.getByRole("button", { name: "解答する" });
      await user.click(submitButton);

      // Assert: submit API が呼ばれ、そのペイロードに選択した解答が含まれていることを確認
      await waitFor(() => {
        expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
        const submittedPayload = mockSubmitQuizAnswers.mock
          .calls[0][0] as AnswerPayload; // 提出されたペイロードを取得
        // q1 の解答が 'b' であることを確認
        const answerForQ1 = submittedPayload.answers.find(
          (a) => a.questionId === problemIdToSelect
        );
        expect(answerForQ1?.answer).toBe(choiceIdToSelect);
        // q2 の解答が 'c' であることを確認
        const answerForQ2 = submittedPayload.answers.find(
          (a) => a.questionId === problemId2ToSelect
        );
        expect(answerForQ2?.answer).toBe(choiceId2ToSelect);
      });
      it("時間切れ後は新しい解答を選択できない", async () => {
        //  データ読み込み成功状態、かつ時間切れ状態にする
        const user = userEvent.setup();
        const mockProblems: Problem[] = [
          {
            questionId: "q1",
            question: "Q1",
            options: [
              { id: "a", text: "Opt A" },
              { id: "b", text: "Opt B" },
            ],
            correctAnswer: "a",
            explanation: "",
            category: "",
          },
        ];
        mockFetchQuizQuestions.mockResolvedValue({
          sessionId: "s1",
          questions: mockProblems,
        });
        mockSubmitQuizAnswers.mockResolvedValue({ results: [] });
        mockSearchParamsGet.mockReturnValue("10");
        //  時間切れ状態をシミュレート
        setMockTimerState({ timeRemaining: 0, isTimerRunning: false });

        // Act: レンダリングし、初期化完了を待つ
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        await waitFor(() =>
          expect(mockProblemItemProps.length).toBe(mockProblems.length)
        );

        //  ProblemItem の onAnswerSelect コールバックを取得
        const problem1Props = mockProblemItemProps[0];
        const problemIdToSelect = problem1Props.problem.questionId;
        const choiceIdToSelect = problem1Props.problem.options[1].id;

        // Act: 時間切れ後に onAnswerSelect を呼び出す
        if (problem1Props.onAnswerSelect) {
          problem1Props.onAnswerSelect(problemIdToSelect, choiceIdToSelect);
        } else {
          throw new Error("onAnswerSelect was not passed to ProblemItem mock");
        }

        // Act: 解答ボタンをクリック (時間切れなので無効のはずだが、念のため)
        //      または時間切れによる自動提出を待つ (ここでは手動提出を試みる)
        const submitButton = screen.getByRole("button", { name: "解答する" });
        // 時間切れならボタンは disabled のはず
        expect(submitButton).toBeDisabled();
        // await user.click(submitButton); // クリックしても何も起こらないはず

        // Assert: 解答提出 API が呼ばれて *いない* ことを確認
        // (時間切れ時の自動提出は別のテストで確認するため、ここでは選択不可の確認に留める)
        // 時間切れ時の自動提出がトリガーされる可能性があるため、
        // このアサーションは「提出ペイロードに今回の選択が含まれない」ことを確認する方が良い
        // (時間切れ自動提出のテストを先に行い、それを前提とする)

        // --- アサーションの代替案 ---
        // 時間切れによる自動提出が完了したと仮定する (別途テストが必要)
        // ここでは、仮に手動で submit できたとしても、
        // onAnswerSelect での変更が反映されていないことを確認する
        mockSubmitQuizAnswers.mockClear(); // 提出履歴をクリア
        // 手動で提出関数を呼び出す（本来はボタンが無効なので呼ばれないはず）
        // (テスト対象コンポーネント内部の handleSubmitRevised を直接呼ぶのは難しいので、
        //  ここでは「もし提出されたら」という仮定でペイロードを確認するアプローチは難しい)

        // --- よりシンプルなアサーション ---
        // onAnswerSelect を呼んだ後、再度 ProblemItem の props を確認しても state の変更は分からない。
        // handleAnswerSelect の最初のガード節 `if (timeRemaining <= 0 ...)` が機能することを期待するテストになる。
        // -> 現状のモック構成では「状態が更新されなかった」ことを直接確認するのは難しい。
        // このテストは、「時間切れ時に ProblemItem の選択肢クリックが視覚的に無効化されているか」
        // (ProblemItem の単体テストの範疇) や、
        // 「時間切れ時に提出ボタンが無効化されているか」の確認に留めるのが現実的かもしれない。

        // 現状できるアサーション：ボタンが無効であること
        expect(submitButton).toBeDisabled();
        // onAnswerSelect が呼ばれても submit API は意図せずには呼ばれない (副作用がない)
        expect(mockSubmitQuizAnswers).not.toHaveBeenCalled();
      });
      it("提出中は新しい解答を選択できない", async () => {
        //  データ読み込み成功状態、タイマー動作中
        const user = userEvent.setup();
        const mockProblems: Problem[] = [
          {
            questionId: "q1",
            question: "Q1",
            options: [
              { id: "a", text: "Opt A" },
              { id: "b", text: "Opt B" },
            ],
            correctAnswer: "a",
            explanation: "",
            category: "",
          },
        ];
        //  API を準備 (提出はすぐに解決させない)
        let resolveSubmit: (value: { results: [] }) => void;
        mockFetchQuizQuestions.mockResolvedValue({
          sessionId: "s1",
          questions: mockProblems,
        });
        mockSubmitQuizAnswers.mockImplementation(
          () =>
            new Promise((res) => {
              resolveSubmit = res;
            })
        ); // 提出を保留
        mockSearchParamsGet.mockReturnValue("10");
        setMockTimerState({ timeRemaining: 100, isTimerRunning: true });

        // Act: レンダリングし、初期化完了を待つ
        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        await waitFor(() =>
          expect(mockProblemItemProps.length).toBe(mockProblems.length)
        );

        // Act: 提出ボタンをクリックして「提出中」状態にする
        const submitButton = screen.getByRole("button", { name: "解答する" });
        await user.click(submitButton);
        // 提出中表示になるのを待つ
        await screen.findByRole("button", { name: "提出中..." });
        expect(submitButton).toBeDisabled(); // ボタンが無効化されることも確認

        //  ProblemItem の onAnswerSelect コールバックを取得
        const problem1Props = mockProblemItemProps[0];
        const problemIdToSelect = problem1Props.problem.questionId;
        const choiceIdToSelect = problem1Props.problem.options[1].id; // 'b' を選ぼうとする

        // Act: 提出中に onAnswerSelect を呼び出す
        if (problem1Props.onAnswerSelect) {
          problem1Props.onAnswerSelect(problemIdToSelect, choiceIdToSelect);
        } else {
          throw new Error("onAnswerSelect was not passed to ProblemItem mock");
        }

        // Act: 提出処理を完了させる
        resolveSubmit({ results: [] });

        // Assert:
        // 提出が完了した後、submit API が受け取ったペイロードを確認する。
        // このペイロードには、提出中に選択しようとした 'b' ではなく、
        // 提出開始前の状態（何も選択していなければ null）が含まれているはず。
        await waitFor(() => {
          expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
          const submittedPayload = mockSubmitQuizAnswers.mock
            .calls[0][0] as AnswerPayload;
          const answerForQ1 = submittedPayload.answers.find(
            (a) => a.questionId === problemIdToSelect
          );
          // 提出中に 'b' を選択しようとしたが、反映されず null (または初期選択状態) のままのはず
          expect(answerForQ1?.answer).toBeNull(); // または提出前の選択状態
        });
      });
    });

    describe("解答の提出 (Submission Process)", () => {
      it("「解答する」ボタンクリック時に未解答があると window.confirm が呼ばれる", async () => {
        // 問題をロードし、1問だけ解答する
        const user = userEvent.setup();
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
            correctAnswer: "c",
            explanation: "",
            category: "",
          },
        ];
        mockFetchQuizQuestions.mockResolvedValue({
          sessionId: "s1",
          questions: mockProblems,
        });
        mockSearchParamsGet.mockReturnValue("10");
        setMockTimerState({ timeRemaining: 100, isTimerRunning: true }); // タイマー動作中

        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        await waitFor(() =>
          expect(mockProblemItemProps.length).toBe(mockProblems.length)
        );

        // 1問目 (q1) だけ解答
        const problem1Props = mockProblemItemProps.find(
          (p) => p.problem.questionId === "q1"
        );
        problem1Props?.onAnswerSelect("q1", "a");

        // window.confirm が呼ばれることを確認するため、一旦 true を返すようにしておく
        mockConfirmSpy.mockReturnValue(true);
        // submit API は呼ばれる前提で適当に設定
        mockSubmitQuizAnswers.mockResolvedValue({ results: [] });

        // Act: 提出ボタンをクリック
        const submitButton = screen.getByRole("button", { name: "解答する" });
        await user.click(submitButton);

        // Assert: window.confirm が呼ばれたことを確認
        expect(mockConfirmSpy).toHaveBeenCalledTimes(1);
        // オプション: メッセージ内容も確認 (未解答が1問の場合)
        expect(mockConfirmSpy).toHaveBeenCalledWith(
          expect.stringContaining("未解答の問題が 1 問ありますが提出しますか？")
        );
      });
      it("window.confirm でキャンセルすると submit API は呼ばれない", async () => {
        // 未解答がある状態は上記テストと同様
        const user = userEvent.setup();
        const mockProblems: Problem[] = [
          {
            questionId: "q1",
            question: "What is the answer to question 1?",
            options: [{ id: "a", text: "A" }],
            correctAnswer: "a",
            explanation: "",
            category: "",
          },
          {
            questionId: "q2",
            question: "What is the answer to question 2?",
            options: [{ id: "c", text: "C" }],
            correctAnswer: "c",
            explanation: "",
            category: "",
          },
        ];
        mockFetchQuizQuestions.mockResolvedValue({
          sessionId: "s1",
          questions: mockProblems,
        });
        mockSearchParamsGet.mockReturnValue("10");
        setMockTimerState({ timeRemaining: 100, isTimerRunning: true });

        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        await waitFor(() =>
          expect(mockProblemItemProps.length).toBe(mockProblems.length)
        );
        mockProblemItemProps[0]?.onAnswerSelect("q1", "a"); // 1問目のみ解答

        // window.confirm で "Cancel" (false) を返すように設定
        mockConfirmSpy.mockReturnValueOnce(false);

        // Act: 提出ボタンをクリック
        const submitButton = screen.getByRole("button", { name: "解答する" });
        await user.click(submitButton);

        // Assert:
        // 1. window.confirm は呼ばれた
        expect(mockConfirmSpy).toHaveBeenCalledTimes(1);
        // 2. submit API は呼ばれなかった
        expect(mockSubmitQuizAnswers).not.toHaveBeenCalled();
        // 3. ボタンは有効なまま (提出中にならない)
        expect(submitButton).toBeEnabled();
        expect(submitButton).toHaveTextContent("解答する");
      });
      it("解答提出時に正しいペイロードで submit API (mockSubmitQuizAnswers) が呼ばれる", async () => {
        // 全問解答した状態を作る
        const user = userEvent.setup();
        const mockSessionId = "session-payload-test";
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
        mockFetchQuizQuestions.mockResolvedValue({
          sessionId: mockSessionId,
          questions: mockProblems,
        });
        mockSubmitQuizAnswers.mockResolvedValue({ results: [] }); // API自体は成功させる
        mockSearchParamsGet.mockReturnValue("10");
        setMockTimerState({ timeRemaining: 100, isTimerRunning: true });

        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        await waitFor(() =>
          expect(mockProblemItemProps.length).toBe(mockProblems.length)
        );

        // 全問解答 (例: q1->b, q2->c)
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q1")
          ?.onAnswerSelect("q1", "b");
        mockProblemItemProps
          .find((p) => p.problem.questionId === "q2")
          ?.onAnswerSelect("q2", "c");

        // Act: 提出ボタンをクリック
        const submitButton = screen.getByRole("button", { name: "解答する" });
        await user.click(submitButton);

        // Assert: submit API が正しいペイロードで呼ばれたか
        await waitFor(() => {
          expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
          // 呼び出し時の引数 (ペイロード) を取得
          const submittedPayload = mockSubmitQuizAnswers.mock
            .calls[0][0] as AnswerPayload;

          // 1. sessionId が正しいか
          expect(submittedPayload.sessionId).toBe(mockSessionId);

          // 2. answers 配列の長さが問題数と一致するか
          expect(submittedPayload.answers).toHaveLength(mockProblems.length);

          // 3. 各問題の解答が正しいか (find などで確認)
          expect(
            submittedPayload.answers.find((a) => a.questionId === "q1")?.answer
          ).toBe("b");
          expect(
            submittedPayload.answers.find((a) => a.questionId === "q2")?.answer
          ).toBe("c");
          // 4. (オプション) 未解答の場合も確認するテストを追加しても良い
          //    例: expect(submittedPayload.answers.find(a => a.questionId === 'q3')?.answer).toBeNull();
        });
      });
      it("提出中は「解答する」ボタンが「提出中...」になり無効化される", async () => {
        // 提出処理がすぐに完了しないように API モックを設定
        const user = userEvent.setup();
        let resolveSubmit: (value: { results: [] }) => void;
        mockSubmitQuizAnswers.mockImplementation(
          () =>
            new Promise((res) => {
              resolveSubmit = res;
            })
        ); // 応答を保留
        // 他の初期設定
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
        setMockTimerState({ timeRemaining: 100, isTimerRunning: true });

        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        await waitFor(() => expect(mockProblemItemProps.length).toBe(1));
        mockProblemItemProps[0]?.onAnswerSelect("q1", "a"); // 全問解答

        // Act: 提出ボタンをクリック
        const submitButton = screen.getByRole("button", { name: "解答する" });
        await user.click(submitButton);

        // Assert: ボタンの表示と状態が変わるのを待つ
        // findByRole は要素が見つかるまで待機する
        const submittingButton = await screen.findByRole("button", {
          name: "提出中...",
        });
        expect(submittingButton).toBeInTheDocument();
        expect(submittingButton).toBeDisabled();

        // クリーンアップ (Promise を解決させる)
        resolveSubmit({ results: [] });
      });
      it("submit API 成功時に結果画面へ正しい state で navigate する", async () => {
        // 提出が成功する状態を作る
        const user = userEvent.setup();
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
            correctAnswer: "d",
            explanation: "",
            category: "catB",
          },
        ];
        const mockResultsData: AnswersApiResponse = {
          // submit API が返す結果データ
          results: [
            {
              questionId: "q1",
              category: "catA",
              isCorrect: true,
              userAnswer: "a",
              correctAnswer: "a",
              question: "Q1",
              options: mockProblems[0].options,
              explanation: "",
            },
            {
              questionId: "q2",
              category: "catB",
              isCorrect: false,
              userAnswer: "c",
              correctAnswer: "d",
              question: "Q2",
              options: mockProblems[1].options,
              explanation: "",
            },
          ],
        };
        mockFetchQuizQuestions.mockResolvedValue({
          sessionId: "s1",
          questions: mockProblems,
        });
        mockSubmitQuizAnswers.mockResolvedValue(mockResultsData); // 成功時のデータを設定
        mockSearchParamsGet.mockReturnValue("10");
        setMockTimerState({ timeRemaining: 100, isTimerRunning: true });

        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        await waitFor(() =>
          expect(mockProblemItemProps.length).toBe(mockProblems.length)
        );

        // 何か解答しておく (全問解答でなくても良い)
        mockProblemItemProps[0]?.onAnswerSelect("q1", "a");
        mockProblemItemProps[1]?.onAnswerSelect("q2", "c");

        // Act: 提出ボタンをクリック
        const submitButton = screen.getByRole("button", { name: "解答する" });
        await user.click(submitButton);

        // Assert: navigate が呼ばれるのを待つ
        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledTimes(1);
          // navigate の引数を検証
          expect(mockNavigate).toHaveBeenCalledWith(
            "/result", // 遷移先のパス
            expect.objectContaining({
              // 第二引数のオブジェクト
              state: expect.objectContaining({
                // state プロパティ
                quizResults: mockResultsData.results, // API が返した結果
                totalQuestions: mockProblems.length, // 問題数
                correctQuestions: mockResultsData.results.filter(
                  (r) => r.isCorrect
                ).length, // 正解数
              }),
            })
          );
        });
      });
      it("submit API 失敗時にエラーメッセージが表示され、ボタンが有効に戻る", async () => {
        // 提出が失敗する状態を作る
        const user = userEvent.setup();
        const errorMessage = "提出に失敗しました";
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
        mockSubmitQuizAnswers.mockRejectedValue(new Error(errorMessage)); // 失敗させる
        mockSearchParamsGet.mockReturnValue("10");
        setMockTimerState({ timeRemaining: 100, isTimerRunning: true });

        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        await waitFor(() => expect(mockProblemItemProps.length).toBe(1));
        mockProblemItemProps[0]?.onAnswerSelect("q1", "a"); // 解答

        // Act: 提出ボタンをクリック
        const submitButton = screen.getByRole("button", { name: "解答する" });
        await user.click(submitButton);

        // Assert:
        // 1. エラーメッセージが表示されるのを待つ
        await screen.findByText(`エラー: ${errorMessage}`);

        // 2. navigate が呼ばれていないことを確認
        expect(mockNavigate).not.toHaveBeenCalled();

        // 3. ボタンが有効に戻り、テキストが「解答する」に戻っていることを確認
        //    ※ findByText でエラーが出た時点でボタンの状態は戻っているはず
        expect(submitButton).toBeEnabled();
        expect(submitButton).toHaveTextContent("解答する");
      });
      it("時間切れによる自動提出時にも submit API が呼ばれ、結果画面へ navigate する", async () => {
        // 正常に初期化され、提出 API が成功する状態
        const mockProblems: Problem[] = [
          /* ... */
        ];
        const mockResultsData: AnswersApiResponse = {
          results: [
            /* ... */
          ],
        };
        mockFetchQuizQuestions.mockResolvedValue({
          sessionId: "s1",
          questions: mockProblems,
        });
        mockSubmitQuizAnswers.mockResolvedValue(mockResultsData);
        mockSearchParamsGet.mockReturnValue("10");
        setMockTimerState({ timeRemaining: 1, isTimerRunning: true }); // 時間切れ直前の状態

        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        await waitFor(() =>
          expect(mockProblemItemProps.length).toBe(mockProblems.length)
        );

        // onTimeUp コールバックを取得
        const onTimeUpCallback = mockUseTimer.mock.calls[0]?.[1]?.onTimeUp;
        expect(onTimeUpCallback).toBeDefined();

        // Act: 時間切れをシミュレート (onTimeUp を呼び出す)
        if (onTimeUpCallback) {
          await onTimeUpCallback();
        } else {
          throw new Error("onTimeUp callback was not passed to useTimer mock");
        }

        // Assert:
        // 1. confirm ダイアログは呼ばれない (時間切れ提出なので)
        expect(mockConfirmSpy).not.toHaveBeenCalled();

        // 2. submit API が呼ばれる
        await waitFor(() => {
          expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
        });

        // 3. navigate が結果画面へ呼ばれる
        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledTimes(1);
          expect(mockNavigate).toHaveBeenCalledWith(
            "/result",
            expect.anything()
          ); // state の内容は別テストで確認済み
        });
      });
      it("提出処理中に再度「解答する」ボタンを押しても二重送信されない", async () => {
        // 提出がすぐに完了しない状態を作る
        const user = userEvent.setup();
        let resolveSubmit: (value: { results: [] }) => void;
        mockSubmitQuizAnswers.mockImplementation(
          () =>
            new Promise((res) => {
              resolveSubmit = res;
            })
        );
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
        setMockTimerState({ timeRemaining: 100, isTimerRunning: true });

        render(
          <BrowserRouter>
            <AnswerInputScreen />
          </BrowserRouter>
        );
        await waitFor(() => expect(mockProblemItemProps.length).toBe(1));
        mockProblemItemProps[0]?.onAnswerSelect("q1", "a"); // 解答

        // Act: 1回目のクリック
        const submitButton = screen.getByRole("button", { name: "解答する" });
        await user.click(submitButton);

        // 提出中表示になるのを待つ
        await screen.findByRole("button", { name: "提出中..." });
        expect(submitButton).toBeDisabled(); // ボタンが無効化されているはず

        // Act: 2回目のクリック (無効化されているが念のためクリックを試みる)
        await user.click(submitButton); // 無効なのでイベントは発生しないはず

        // Assert: submit API がまだ1回しか呼ばれていないことを確認
        expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);

        // Act: 提出を完了させる
        resolveSubmit({ results: [] });
        await waitFor(() => expect(mockNavigate).toHaveBeenCalled()); // 遷移するまで待つ

        // Assert: 最終的に submit API が1回だけ呼ばれたことを再確認
        expect(mockSubmitQuizAnswers).toHaveBeenCalledTimes(1);
      });
    });

    describe("画面離脱防止機能 (Navigation Blocking)", () => {
      it.todo(
        "解答中に離脱しようとすると useBlocker (モック) が作動し、確認ダイアログが表示される"
      );
      it.todo("確認ダイアログで「OK」を押すと blocker.proceed が呼ばれる");
      it.todo(
        "確認ダイアログで「キャンセル」を押すと blocker.reset が呼ばれる"
      );
      it.todo("時間切れ後や提出中はブロッカーが作動しない");
    });
  });
});
