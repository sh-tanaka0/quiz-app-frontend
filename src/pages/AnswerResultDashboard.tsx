import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { LocationState } from "@/types/quiz";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { CategoryProgressChart } from "@/components/results/CategoryProgressChart";
import { SummarySection } from "@/components/results/SummarySection";
import { ProblemResultsList } from "@/components/results/ProblemResultsList";

// --- 解答結果表示画面コンポーネント ---
const AnswerResultDashboard = () => {
  // --- Hooks ---
  const location = useLocation();
  const navigate = useNavigate();

  // --- State ---
  // location.state から結果データを取得、型アサーションとデフォルト値を設定
  const {
    quizResults = [],
    totalQuestions = 0,
    correctQuestions = 0,
  } = (location.state as LocationState) || {};

  // 解説アコーディオンの開閉状態 (開いている問題の questionId を保持)
  const [openExplanationId, setOpenExplanationId] = useState<string | null>(
    null
  );

  // カテゴリフィルタで選択中のカテゴリ
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // カテゴリ別データの計算（useCategoryProgress カスタムフックを使用）
  const categoryProgressData = useCategoryProgress(quizResults);

  // 全体のサマリーデータ
  const summaryData = useMemo(
    () => ({
      totalQuestions,
      correctQuestions,
      correctRate:
        totalQuestions > 0
          ? Math.round((correctQuestions / totalQuestions) * 100)
          : 0,
    }),
    [totalQuestions, correctQuestions]
  );

  // 選択されたカテゴリに基づいてフィルタリングされた問題リスト
  const filteredProblems = useMemo(() => {
    if (!quizResults) return [];
    return selectedCategory
      ? quizResults.filter(
          (problem) => (problem.category || "未分類") === selectedCategory
        )
      : quizResults;
  }, [selectedCategory, quizResults]);

  // --- レンダリング ---

  // 結果データがない場合の表示
  if (!quizResults || quizResults.length === 0) {
    return (
      <div className="container mx-auto p-6 text-center flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-xl text-gray-600 mb-6">
          結果データが見つかりません。
        </p>
        <Button onClick={() => navigate("/")}>
          <Home className="mr-2" size={18} />
          問題選択に戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        {/* ヘッダー */}
        <div className="p-5 md:p-6 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            解答結果
          </h1>
        </div>
        {/* --- サマリーセクション --- */}
        <SummarySection data={summaryData} />

        {/* --- カテゴリ別正答率グラフ --- */}
        <div className="p-5 md:p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            カテゴリ別 正答率
          </h2>

          {/* --- グラフコンポーネント --- */}
          <CategoryProgressChart categoryData={categoryProgressData} />

          {/* --- カテゴリフィルタボタン --- */}
          {/* [source: フロント仕様まとめ.pdf, p. 27] */}
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-600 mb-3">
              フィルタ:
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm" // サイズ small
                variant={selectedCategory === null ? "default" : "outline"} // 選択状態でスタイル変更
                onClick={() => setSelectedCategory(null)}
                className={`rounded-full ${
                  selectedCategory === null
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                全て ({quizResults.length})
              </Button>
              {categoryProgressData.map((categoryData) => (
                <Button
                  key={categoryData.category}
                  size="sm"
                  variant={
                    selectedCategory === categoryData.category
                      ? "default"
                      : "outline"
                  }
                  onClick={() => setSelectedCategory(categoryData.category)}
                  className={`rounded-full ${
                    selectedCategory === categoryData.category
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {categoryData.category} ({categoryData.totalAttempts})
                </Button>
              ))}
            </div>
          </div>
        </div>
        {/* --- 問題別結果リスト --- */}
        {/* [source: フロント仕様まとめ.pdf, p. 22] */}
        <div className="p-5 md:p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            問題別 結果 {selectedCategory ? `(${selectedCategory})` : ""}
          </h2>

          <ProblemResultsList
            problems={filteredProblems}
            selectedCategory={selectedCategory}
            openExplanationId={openExplanationId}
            setOpenExplanationId={setOpenExplanationId}
          />

          {/* TOPへ戻るボタン */}
          <div className="mt-8 text-center border-t pt-6 border-gray-200">
            <Button
              variant="default"
              size="lg"
              onClick={() => navigate("/")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Home className="mr-2" size={18} />
              もう一度挑戦する
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnswerResultDashboard;
