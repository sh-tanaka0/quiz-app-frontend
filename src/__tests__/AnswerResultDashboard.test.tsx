/* eslint-disable @typescript-eslint/no-explicit-any */
// テストファイルでは型安全性よりもテストのしやすさを優先するため、anyを許容する場合がある

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
// Vitest から MockInstance 型をインポート
import type { MockInstance } from "vitest";

// テスト対象コンポーネント
import AnswerResultDashboard from "../pages/AnswerResultDashboard";

// 関連する型定義・コンポーネント・フック
import type {
  QuizResult,
  LocationState,
  CategoryProgressData,
} from "@/types/quiz";
import type { CategoryProgressChartProps } from "@/components/results/CategoryProgressChart";
import type { ProblemResultsListProps } from "@/components/results/ProblemResultsList";
import type { SummarySectionProps } from "@/components/results/SummarySection";
import * as routerOriginal from "react-router-dom";

// ==================================
// vi.hoisted によるモック関数定義
// ==================================
const mocks = vi.hoisted(() => {
  type NavigateFnSig = ReturnType<typeof routerOriginal.useNavigate>;
  type UseCategoryProgressReturnSig = (results: any) => CategoryProgressData[];
  type ScrollToSig = typeof window.scrollTo;

  return {
    mockNavigateFn: vi.fn() as MockInstance<NavigateFnSig>,
    // mockImplementation で具体的な戻り値の型を保証する
    mockUseCategoryProgress:
      vi.fn() as MockInstance<UseCategoryProgressReturnSig>,
    mockScrollTo: vi.fn() as MockInstance<ScrollToSig>,
  };
});

// ==================================
// モック設定 (State Controllerなど)
// ==================================
let mockLocationState: LocationState | null = null;
let mockCategoryData: CategoryProgressData[] = []; // 初期値は空配列
const mockSummaryProps: SummarySectionProps[] = [];
const mockChartProps: CategoryProgressChartProps[] = [];
const mockProblemListProps: ProblemResultsListProps[] = [];
let mockScrollToSpy: MockInstance<(x: number, y: number) => void>;

// ==================================
// vi.mock によるモック化
// ==================================
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof routerOriginal>(
    "react-router-dom"
  );
  return {
    ...(typeof actual === "object" ? actual : {}),
    useNavigate: () => mocks.mockNavigateFn,
    useLocation: (): ReturnType<typeof routerOriginal.useLocation> => ({
      // useLocation の戻り値の型を正確に
      state: mockLocationState,
      pathname: "/result",
      search: "", // search も追加
      hash: "",
      key: "default", // key も追加
    }),
  };
});

// useCategoryProgress カスタムフックをモック化
vi.mock("@/hooks/useCategoryProgress", () => ({
  useCategoryProgress: mocks.mockUseCategoryProgress, // モック関数自体を渡す
}));

// --- 子コンポーネントのモック ---
vi.mock("@/components/results/SummarySection", () => ({
  SummarySection: vi.fn((props: SummarySectionProps) => {
    mockSummaryProps.push(props);
    return (
      <div data-testid="mock-summary-section">
        Total:{props.data.totalQuestions},Correct:{props.data.correctQuestions}
        ,Rate:{props.data.correctRate}%
      </div>
    );
  }),
}));

vi.mock("@/components/results/CategoryProgressChart", () => ({
  CategoryProgressChart: vi.fn((props: CategoryProgressChartProps) => {
    mockChartProps.push(props);
    return (
      <div data-testid="mock-category-chart">
        {/* categoryData が配列でない場合にエラーにならないようにチェック */}
        Categories:
        {Array.isArray(props.categoryData) ? props.categoryData.length : 0}
      </div>
    );
  }),
}));

vi.mock("@/components/results/ProblemResultsList", () => ({
  ProblemResultsList: vi.fn((props: ProblemResultsListProps) => {
    mockProblemListProps.push(props);
    const simulateToggle = (questionId: string) => {
      const currentOpenId = props.openExplanationId;
      props.setOpenExplanationId(
        currentOpenId === questionId ? null : questionId
      );
    };
    return (
      <div data-testid="mock-problem-list">
        {/* Props が存在することを確認してからアクセス */}
        Problems Displayed: {props.problems?.length ?? 0}, Selected Category:{" "}
        {props.selectedCategory ?? "none"}, Open:{" "}
        {props.openExplanationId ?? "none"}
        {/* 各問題に対応するトグルボタン（テスト用） */}
        {props.problems?.map((problem) => (
          <button
            key={problem.questionId}
            data-testid={`toggle-${problem.questionId}`}
            onClick={() => simulateToggle(problem.questionId)}
          >
            Toggle {problem.questionId} Explanation
          </button>
        ))}
      </div>
    );
  }),
}));

// ==================================
// テストスイート本体
// ==================================
describe("AnswerResultDashboard", () => {
  // 各テスト実行前の共通セットアップ (トップレベル)
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.mockNavigateFn.mockClear();
    mocks.mockUseCategoryProgress.mockReset(); // ★ 実装も含めてリセットされる

    mockLocationState = null;
    mockCategoryData = []; // デフォルトは空配列に戻す
    mockSummaryProps.length = 0;
    mockChartProps.length = 0;
    mockProblemListProps.length = 0;

    mockScrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Helper: レンダリング関数 ---
  const renderResultScreen = (state: LocationState | null) => {
    mockLocationState = state;
    // レンダリング前に useCategoryProgress モックが設定されていることを確認
    // (通常は各 describe の beforeEach で設定される)
    if (!mocks.mockUseCategoryProgress.getMockImplementation()) {
      console.warn(
        "Warning: mockUseCategoryProgress implementation not set before render. Setting default."
      );
      mocks.mockUseCategoryProgress.mockImplementation(() => mockCategoryData); // フォールバック
    }
    render(
      <BrowserRouter>
        <AnswerResultDashboard />
      </BrowserRouter>
    );
  };

  // --- Helper: テスト用結果データ生成 ---
  const createMockResults = (
    count: number,
    correctCount: number,
    categories: string[] = ["Category A", "Category B"]
  ): QuizResult[] => {
    const results: QuizResult[] = [];
    for (let i = 0; i < count; i++) {
      const isCorrect = i < correctCount;
      const category = categories[i % categories.length];
      results.push({
        questionId: `q${i + 1}`,
        category: category,
        isCorrect: isCorrect,
        userAnswer: isCorrect ? `correct${i}` : `wrong${i}`,
        correctAnswer: `correct${i}`,
        question: `Question ${i + 1}?`,
        options: [
          { id: `correct${i}`, text: "Correct" },
          { id: `wrong${i}`, text: "Wrong" },
        ],
        explanation: `Explanation ${i + 1}`,
      });
    }
    return results;
  };

  // --- Helper: テスト用カテゴリデータ生成 ---
  const createMockCategoryData = (
    results: QuizResult[]
  ): CategoryProgressData[] => {
    // useCategoryProgress のロジックを簡易的に模倣
    const categoryMap: Record<string, { correct: number; total: number }> = {};
    results.forEach((result) => {
      const category = result.category || "未分類";
      if (!categoryMap[category]) {
        categoryMap[category] = { correct: 0, total: 0 };
      }
      categoryMap[category].total++;
      if (result.isCorrect) {
        categoryMap[category].correct++;
      }
    });
    return Object.entries(categoryMap).map(([category, data]) => ({
      category,
      correctCount: data.correct,
      totalAttempts: data.total,
      successRate:
        data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      description: `Description for ${category}`, // ダミー
    }));
  };

  // --- テストケース ---

  describe("データがない場合の表示", () => {
    beforeEach(() => {
      mockCategoryData = [];
      mocks.mockUseCategoryProgress.mockImplementation(() => mockCategoryData);
    });

    it("location.state が null の場合、「結果データが見つかりません」と表示され、戻るボタンがある", () => {
      renderResultScreen(null);
      expect(
        screen.getByText("結果データが見つかりません。")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /問題選択に戻る/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("mock-summary-section")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("mock-category-chart")
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("mock-problem-list")).not.toBeInTheDocument();
      // useCategoryProgress が呼ばれないか、呼ばれても空配列でエラーにならないことを確認
      expect(mocks.mockUseCategoryProgress).not.toThrow();
    });

    it("location.state.quizResults が空配列の場合、「結果データが見つかりません」と表示される", () => {
      renderResultScreen({
        quizResults: [],
        totalQuestions: 0,
        correctQuestions: 0,
      });
      expect(
        screen.getByText("結果データが見つかりません。")
      ).toBeInTheDocument();
      // useCategoryProgress が呼ばれるが、空配列を渡し、空配列が返ることを確認
      expect(mocks.mockUseCategoryProgress).toHaveBeenCalledWith([]);
      expect(mocks.mockUseCategoryProgress).toHaveReturnedWith([]);
    });
  }); // describe: データがない場合

  describe("初期表示とデータ連携 (データがある場合)", () => {
    const mockResults = createMockResults(5, 3, ["Category A", "Category B"]);
    const mockState: LocationState = {
      quizResults: mockResults,
      totalQuestions: 5,
      correctQuestions: 3,
    };
    // ヘルパー関数を使ってテストデータからカテゴリデータを生成
    const mockCategories = createMockCategoryData(mockResults);

    beforeEach(() => {
      mockCategoryData = mockCategories;
      mocks.mockUseCategoryProgress.mockImplementation(() => mockCategoryData);

      // レンダリング実行
      renderResultScreen(mockState);
    });

    it("ヘッダー、サマリー、グラフ、フィルタ、問題リスト、戻るボタンが表示される", () => {
      expect(
        screen.getByRole("heading", { name: "解答結果" })
      ).toBeInTheDocument();
      expect(screen.getByTestId("mock-summary-section")).toBeInTheDocument();
      expect(screen.getByTestId("mock-category-chart")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: `全て (${mockResults.length})` })
      ).toBeInTheDocument();
      expect(screen.getByTestId("mock-problem-list")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /もう一度挑戦する/ })
      ).toBeInTheDocument();
    });

    it("SummarySection に正しいサマリーデータが渡される", async () => {
      // waitFor でモックコンポーネントのレンダリングを待つ (非同期の可能性があるため)
      await waitFor(() => {
        expect(mockSummaryProps.length).toBeGreaterThanOrEqual(1); // 1回以上呼ばれる
        const props = mockSummaryProps[mockSummaryProps.length - 1]; // 最後の Props を確認
        expect(props.data.totalQuestions).toBe(5);
        expect(props.data.correctQuestions).toBe(3);
        expect(props.data.correctRate).toBe(60); // (3 / 5) * 100
      });
    });

    it("CategoryProgressChart に正しいカテゴリデータが渡される", async () => {
      await waitFor(() => {
        expect(mockChartProps.length).toBeGreaterThanOrEqual(1);
        const props = mockChartProps[mockChartProps.length - 1];
        expect(props.categoryData).toEqual(mockCategories);
      });
    });

    it("カテゴリフィルターボタンが正しく表示される (全て + カテゴリ数)", () => {
      expect(
        screen.getByRole("button", { name: `全て (${mockResults.length})` })
      ).toBeInTheDocument();
      // mockCategories データに基づいてアサーション
      mockCategories.forEach((catData) => {
        expect(
          screen.getByRole("button", {
            name: `${catData.category} (${catData.totalAttempts})`,
          })
        ).toBeInTheDocument();
      });
    });

    it("初期表示で ProblemResultsList に全ての quizResults が渡される", async () => {
      await waitFor(() => {
        expect(mockProblemListProps.length).toBeGreaterThanOrEqual(1);
        const props = mockProblemListProps[mockProblemListProps.length - 1];
        expect(props.problems).toEqual(mockResults);
        expect(props.selectedCategory).toBeNull(); // 初期は null
        expect(props.openExplanationId).toBeNull(); // 初期は null
      });
    });

    it("マウント時に window.scrollTo(0, 0) が呼ばれる", () => {
      // renderResultScreen 内で呼ばれているはず
      expect(mockScrollToSpy).toHaveBeenCalledWith(0, 0);
    });
  }); // describe: 初期表示とデータ連携

  describe("カテゴリフィルタリング", () => {
    const mockResults = createMockResults(5, 3, [
      "Category A",
      "Category B",
      "Category C",
    ]); // カテゴリ追加
    const mockState: LocationState = {
      quizResults: mockResults,
      totalQuestions: 5,
      correctQuestions: 3,
    };
    const mockCategories = createMockCategoryData(mockResults);
    const categoryA = mockCategories.find((c) => c.category === "Category A")!;
    const categoryB = mockCategories.find((c) => c.category === "Category B")!;
    const categoryC = mockCategories.find((c) => c.category === "Category C")!;

    beforeEach(() => {
      mockCategoryData = mockCategories;
      mocks.mockUseCategoryProgress.mockImplementation(() => mockCategoryData);
    });

    it("カテゴリボタンをクリックすると ProblemResultsList に渡される problems がフィルタリングされる", async () => {
      const user = userEvent.setup();
      renderResultScreen(mockState); // 初期表示

      // Category A のボタンをクリック
      const categoryAButton = screen.getByRole("button", {
        name: new RegExp(`^${categoryA.category}`),
      });
      await user.click(categoryAButton);

      await waitFor(() => {
        const lastProps = mockProblemListProps[mockProblemListProps.length - 1];
        expect(lastProps.selectedCategory).toBe(categoryA.category);
        const expectedProblemsA = mockResults.filter(
          (p) => p.category === categoryA.category
        );
        expect(lastProps.problems).toEqual(expectedProblemsA);
        expect(lastProps.problems).toHaveLength(categoryA.totalAttempts);
      });

      // Category B のボタンをクリック
      const categoryBButton = screen.getByRole("button", {
        name: new RegExp(`^${categoryB.category}`),
      });
      await user.click(categoryBButton);

      await waitFor(() => {
        const lastProps = mockProblemListProps[mockProblemListProps.length - 1];
        expect(lastProps.selectedCategory).toBe(categoryB.category);
        const expectedProblemsB = mockResults.filter(
          (p) => p.category === categoryB.category
        );
        expect(lastProps.problems).toEqual(expectedProblemsB);
        expect(lastProps.problems).toHaveLength(categoryB.totalAttempts);
      });
    });

    it("「全て」ボタンをクリックするとフィルタが解除され、全ての problems が渡される", async () => {
      const user = userEvent.setup();
      renderResultScreen(mockState);

      // 最初に Category C をクリック
      const categoryCButton = screen.getByRole("button", {
        name: new RegExp(`^${categoryC.category}`),
      });
      await user.click(categoryCButton);
      await waitFor(() => {
        const lastProps = mockProblemListProps[mockProblemListProps.length - 1];
        expect(lastProps.selectedCategory).toBe(categoryC.category);
        expect(lastProps.problems.length).toBeLessThan(mockResults.length);
      });

      // 次に「全て」ボタンをクリック
      const allButton = screen.getByRole("button", { name: /^全て/ });
      await user.click(allButton);

      await waitFor(() => {
        const lastProps = mockProblemListProps[mockProblemListProps.length - 1];
        expect(lastProps.selectedCategory).toBeNull();
        expect(lastProps.problems).toEqual(mockResults);
        expect(lastProps.problems).toHaveLength(mockResults.length);
      });
    });
  }); // describe: カテゴリフィルタリング

  describe("解説アコーディオン", () => {
    const mockResults = createMockResults(2, 1, ["Category D"]); // 2問、カテゴリD
    const mockState: LocationState = {
      quizResults: mockResults,
      totalQuestions: 2,
      correctQuestions: 1,
    };
    const mockAccordionCategories = createMockCategoryData(mockResults);

    beforeEach(() => {
      mockCategoryData = mockAccordionCategories;
      mocks.mockUseCategoryProgress.mockImplementation(() => mockCategoryData);
    });

    it("ProblemResultsList 内で解説を開閉すると openExplanationId が更新される", async () => {
      renderResultScreen(mockState);

      const firstProblemId = mockResults[0].questionId; // 'q1'
      const secondProblemId = mockResults[1].questionId; // 'q2'

      // ProblemResultsList モック内のテスト用ボタンを使用
      // waitFor でボタンが表示されるのを待つ
      const toggleButton1 = await screen.findByTestId(
        `toggle-${firstProblemId}`
      );
      const toggleButton2 = await screen.findByTestId(
        `toggle-${secondProblemId}`
      );

      // 1. 初期状態 (null) を確認 (Props 配列で確認)
      // レンダリング完了を待つ
      await waitFor(() => {
        expect(mockProblemListProps.length).toBeGreaterThanOrEqual(1);
      });
      expect(
        mockProblemListProps[mockProblemListProps.length - 1].openExplanationId
      ).toBeNull();

      // 2. q1 の解説を開く
      await userEvent.click(toggleButton1);
      await waitFor(() => {
        expect(
          mockProblemListProps[mockProblemListProps.length - 1]
            .openExplanationId
        ).toBe(firstProblemId);
      });

      // 3. q2 の解説を開く (q1 は閉じるはず)
      await userEvent.click(toggleButton2);
      await waitFor(() => {
        expect(
          mockProblemListProps[mockProblemListProps.length - 1]
            .openExplanationId
        ).toBe(secondProblemId);
      });

      // 4. q2 をもう一度クリックして閉じる
      await userEvent.click(toggleButton2);
      await waitFor(() => {
        expect(
          mockProblemListProps[mockProblemListProps.length - 1]
            .openExplanationId
        ).toBeNull();
      });
    });
  }); // describe: 解説アコーディオン

  describe("画面遷移", () => {
    const mockResults = createMockResults(1, 0, ["Category E"]); // 1問
    const mockState: LocationState = {
      quizResults: mockResults,
      totalQuestions: 1,
      correctQuestions: 0,
    };
    const mockNavCategories = createMockCategoryData(mockResults);

    beforeEach(() => {
      mockCategoryData = mockNavCategories;
      mocks.mockUseCategoryProgress.mockImplementation(() => mockCategoryData);
    });

    it('「もう一度挑戦する」ボタンをクリックすると "/" へ navigate する', async () => {
      const user = userEvent.setup();
      renderResultScreen(mockState);

      const backButton = screen.getByRole("button", {
        name: /もう一度挑戦する/,
      });
      await user.click(backButton);

      expect(mocks.mockNavigateFn).toHaveBeenCalledTimes(1);
      expect(mocks.mockNavigateFn).toHaveBeenCalledWith("/");
    });
  }); // describe: 画面遷移
}); // describe: AnswerResultDashboard
