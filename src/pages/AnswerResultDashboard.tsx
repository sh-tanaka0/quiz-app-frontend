import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

// 結果データの型定義
interface ResultData {
  id: number;
  category: string;
  question: string;
  choices: { label: string; text: string }[];
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

// カテゴリグループの型定義
interface CategoryGroup {
  total: number;
  correct: number;
  problems: ResultData[];
}

// カテゴリ集計データの型定義
interface CategoryProgressData {
  category: string;
  successRate: number;
  totalAttempts: number;
  correctCount: number;
  description: string;
}

// 場所の状態の型定義
interface LocationState {
  quizResults: ResultData[];
  totalQuestions: number;
  correctQuestions: number;
}

// カスタムツールチップの型定義
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: CategoryProgressData;
  }>;
  label?: string;
}
const AnswerResultDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // location.stateをLocationState型として扱い、デフォルト値を設定
  const {
    quizResults = [],
    totalQuestions = 0,
    correctQuestions = 0,
  } = (location.state as LocationState) || {};

  const [openExplanationId, setOpenExplanationId] = useState<number | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // カテゴリごとの正答率を計算 - 型アノテーションを追加
  const categoryProgressData = useMemo<CategoryProgressData[]>(() => {
    // カテゴリの詳細説明を返す関数
    const getCategoryDescription = (category: string): string => {
      // カテゴリごとの説明のマッピング
      const categoryDescriptions: Record<string, string> = {
        コード可読性:
          "コードの可読性は、他の開発者が理解しやすいコードを書くことを意味します。適切なコメント、一貫した命名規則、適切なインデントなどが重要です。",
        変数命名:
          "変数名は、その変数の目的や内容を明確に示す必要があります。意味のある名前を付けることで、コードの理解が容易になります。",
        リファクタリング:
          "リファクタリングは、既存のコードの構造を変更し、可読性や保守性を向上させることです。重複コードの削減、メソッドの抽出、デザインパターンの適用などが含まれます。",
        エラーハンドリング:
          "エラーハンドリングは、プログラム実行中に発生する可能性のあるエラーを適切に管理し、予期せぬ動作を防ぐための重要な技術です。",
        オブジェクト指向:
          "オブジェクト指向プログラミングは、データとそれに関連する操作を「オブジェクト」としてカプセル化するパラダイムです。継承、ポリモーフィズムなどの概念が中心となります。",
      };

      return (
        categoryDescriptions[category] ||
        "このカテゴリの詳細な説明はありません。"
      );
    };

    // 結果データがない場合は空配列を返す
    if (!quizResults || quizResults.length === 0) {
      return [];
    }

    const categoryGroups = quizResults.reduce<Record<string, CategoryGroup>>(
      (acc: Record<string, CategoryGroup>, problem: ResultData) => {
        const category = problem.category || "未分類";
        if (!acc[category]) {
          acc[category] = { total: 0, correct: 0, problems: [] };
        }
        acc[category].total++;
        if (problem.isCorrect) {
          acc[category].correct++;
        }
        acc[category].problems.push(problem);
        return acc;
      },
      {}
    );

    return Object.keys(categoryGroups).map((category) => ({
      category,
      successRate:
        categoryGroups[category].total > 0
          ? Math.round(
              (categoryGroups[category].correct /
                categoryGroups[category].total) *
                100
            )
          : 0,
      totalAttempts: categoryGroups[category].total,
      correctCount: categoryGroups[category].correct,
      description: getCategoryDescription(category),
    }));
  }, [quizResults]);

  // サマリーデータ
  const summaryData = {
    totalQuestions,
    correctQuestions,
    correctRate:
      totalQuestions > 0
        ? Math.round((correctQuestions / totalQuestions) * 100)
        : 0,
  };

  // フィルタリングされた問題リスト
  const filteredProblems = useMemo(() => {
    if (!quizResults) return [];
    return selectedCategory
      ? quizResults.filter(
          (problem) => (problem.category || "未分類") === selectedCategory
        )
      : quizResults;
  }, [selectedCategory, quizResults]);

  // Tooltipのカスタムコンポーネント - 型を適切に定義
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // categoryProgressDataの要素
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg max-w-xs text-sm">
          <p className="font-bold text-base mb-1">{label}</p>
          <p className="mb-1">
            正答率: <span className="font-semibold">{data.successRate}%</span> (
            {data.correctCount}/{data.totalAttempts}問)
          </p>
          <p className="text-gray-600 italic">{data.description}</p>
        </div>
      );
    }
    return null;
  };

  // 問題がない場合の表示
  if (!quizResults || quizResults.length === 0) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-xl text-gray-600 mb-4">
          結果データが見つかりません。
        </p>
        <Button onClick={() => navigate("/")}>問題選択に戻る</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            解答結果
          </h1>
        </div>

        {/* --- サマリーセクション --- */}
        <div className="p-4 md:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">サマリー</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500 mb-1">総問題数</p>
              <p className="text-2xl font-bold text-gray-800">
                {summaryData.totalQuestions}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500 mb-1">正解数</p>
              <p className="text-2xl font-bold text-green-600">
                {summaryData.correctQuestions}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500 mb-1">正解率</p>
              <p className="text-2xl font-bold text-blue-600">
                {summaryData.correctRate}%
              </p>
            </div>
          </div>
        </div>

        {/* --- カテゴリ別正答率グラフ --- */}
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            カテゴリ別 正答率
          </h2>
          <div className="mb-6 h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryProgressData}
                margin={{ top: 20, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e0e0e0"
                  vertical={false}
                />
                <XAxis
                  dataKey="category"
                  axisLine={{ stroke: "#d1d5db" }}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#4b5563" }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  width={40}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(239, 246, 255, 0.5)" }}
                />
                <Bar
                  dataKey="successRate"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  fill="#3b82f6"
                >
                  <LabelList
                    dataKey="successRate"
                    position="top"
                    formatter={(value: number) =>
                      value > 0 ? `${value}%` : ""
                    }
                    fontSize={12}
                    fill="#374151"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* カテゴリフィルタ */}
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              フィルタ:
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                  selectedCategory === null
                    ? "bg-blue-600 text-white shadow"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                全て ({quizResults.length})
              </button>
              {categoryProgressData.map((categoryData) => (
                <button
                  key={categoryData.category}
                  onClick={() => setSelectedCategory(categoryData.category)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                    selectedCategory === categoryData.category
                      ? "bg-blue-600 text-white shadow"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {categoryData.category} ({categoryData.totalAttempts})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- 問題別結果リスト --- */}
        <div className="p-4 md:p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            問題別 結果 {selectedCategory ? `(${selectedCategory})` : ""}
          </h2>
          {filteredProblems.length > 0 ? (
            <div className="space-y-4">
              {filteredProblems.map((problem, index) => (
                <div
                  key={problem.id}
                  className={`rounded-lg border overflow-hidden ${
                    problem.isCorrect
                      ? "border-green-200 bg-green-50/50"
                      : "border-red-200 bg-red-50/50"
                  }`}
                >
                  {/* 問題ヘッダー */}
                  <div className="p-4 border-b border-[inherit]">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-gray-800">
                        問題 {index + 1}
                        <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {problem.category || "未分類"}
                        </span>
                      </h4>
                      <span
                        className={`text-sm font-bold px-2 py-1 rounded-full ${
                          problem.isCorrect
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {problem.isCorrect ? "正解" : "不正解"}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-700">{problem.question}</p>
                  </div>

                  {/* 選択肢表示 */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {problem.choices.map((choice) => (
                      <div
                        key={choice.label}
                        className={`p-3 rounded border text-sm flex items-start space-x-2 ${
                          problem.correctAnswer === choice.label
                            ? "bg-green-100 border-green-300"
                            : problem.userAnswer === choice.label
                            ? "bg-red-100 border-red-300"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        {/* アイコン表示 */}
                        <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                          {problem.correctAnswer === choice.label && (
                            <span className="text-green-600">✓</span>
                          )}
                          {problem.userAnswer === choice.label &&
                            problem.userAnswer !== problem.correctAnswer && (
                              <span className="text-red-600">✗</span>
                            )}
                        </div>
                        {/* テキスト */}
                        <div className="flex-1">
                          <span className="font-medium mr-1">
                            {choice.label}:
                          </span>
                          <span>{choice.text}</span>
                          {problem.userAnswer === choice.label && (
                            <span className="ml-2 text-xs font-semibold text-blue-600">
                              (あなたの解答)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* アコーディオン形式の解説 */}
                  <div className="border-t border-[inherit]">
                    <button
                      onClick={() =>
                        setOpenExplanationId(
                          openExplanationId === problem.id ? null : problem.id
                        )
                      }
                      className="w-full flex justify-between items-center p-3 text-left text-sm text-blue-600 hover:bg-blue-50 focus:outline-none focus:bg-blue-100 transition-colors"
                    >
                      <span className="font-medium">解説</span>
                      {openExplanationId === problem.id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    {openExplanationId === problem.id && (
                      <div className="px-4 pb-4 pt-2 text-sm text-gray-700 bg-white border-t border-blue-100">
                        <p>{problem.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              {selectedCategory
                ? `「${selectedCategory}」カテゴリの問題はありません。`
                : "表示する問題がありません。"}
            </p>
          )}

          {/* 再挑戦ボタン */}
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              もう一度挑戦する
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnswerResultDashboard;
