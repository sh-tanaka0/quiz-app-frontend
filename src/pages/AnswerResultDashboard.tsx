import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// Rechartsコンポーネントをインポート
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
  Cell, // Cell を追加
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Target,
  Check,
  Percent,
  Home,
} from "lucide-react"; // アイコンを追加

// --- 型定義 ---
// 解答画面から渡されるデータの型 (APIレスポンス形式に準拠)
// [source: API情報.pdf, p. 6], [source: フロント仕様まとめ.pdf, p. 22]
interface ProblemOption {
  id: string;
  text: string;
}
interface QuizResult {
  questionId: string; // id -> questionId (string)
  category: string;
  isCorrect: boolean;
  userAnswer: string | null;
  correctAnswer: string | undefined;
  displayOrder?: string[];
  question: string;
  options: ProblemOption[]; // choices -> options, label -> id
  explanation: string;
}

// カテゴリごとの集計データ型 (グラフ・フィルタ用)
interface CategoryProgressData {
  category: string; // カテゴリ名
  successRate: number; // 正解率 (%)
  totalAttempts: number; // 解答数
  correctCount: number; // 正解数
  description: string; // カテゴリ説明
}

// useLocation の state の型
interface LocationState {
  quizResults: QuizResult[]; // 型を QuizResult[] に修正
  totalQuestions: number;
  correctQuestions: number;
}

// RechartsのカスタムツールチップのProps型
// (payloadの型をより具体的に)
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CategoryProgressData }>; // payloadの型を修正
  label?: string;
}

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
  ); // 型を string | null に修正
  // カテゴリフィルタで選択中のカテゴリ (null の場合は「全て」)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // グラフのバーホバー状態
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // --- データ加工 (useMemoで計算結果をメモ化) ---

  /**
   * [source: フロント仕様まとめ.pdf, p. 25]
   */
  const categoryProgressData = useMemo<CategoryProgressData[]>(() => {
    // カテゴリの説明 (固定)
    const getCategoryDescription = (category: string): string => {
      const categoryDescriptions: Record<string, string> = {
        コード可読性:
          "コードの可読性は、他の開発者が理解しやすいコードを書くことを意味します。適切なコメント、一貫した命名規則、適切なインデントなどが重要です。",
        変数命名: "変数名は、その変数の目的や内容を明確に示す必要があります。",
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

    if (!quizResults || quizResults.length === 0) return [];

    // カテゴリごとに問題を集計する型
    interface CategoryGroup {
      total: number;
      correct: number;
    }

    // カテゴリごとに正解数と総数を集計
    const categoryGroups = quizResults.reduce<Record<string, CategoryGroup>>(
      (acc, problem) => {
        const category = problem.category || "未分類";
        if (!acc[category]) {
          acc[category] = { total: 0, correct: 0 };
        }
        acc[category].total++;
        if (problem.isCorrect) {
          acc[category].correct++;
        }
        return acc;
      },
      {}
    );

    // 集計結果をグラフ用のデータ形式に変換
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

  /**
   * 全体のサマリーデータ
   * [source: フロント仕様まとめ.pdf, p. 22]
   */
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

  /**
   * 選択されたカテゴリに基づいてフィルタリングされた問題リスト
   * [source: フロント仕様まとめ.pdf, p. 27]
   */
  const filteredProblems = useMemo(() => {
    if (!quizResults) return [];
    // selectedCategory が null でなければカテゴリでフィルタリング
    return selectedCategory
      ? quizResults.filter(
          (problem) => (problem.category || "未分類") === selectedCategory
        )
      : quizResults; // null なら全件表示
  }, [selectedCategory, quizResults]);

  // --- カスタムコンポーネント ---

  /**
   * Rechartsグラフのカスタムツールチップ
   * [source: フロント仕様まとめ.pdf, p. 25]
   */
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // 表示中のバーに対応するデータ
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg max-w-xs text-sm">
          <p className="font-bold text-base mb-1">{label}</p> {/* カテゴリ名 */}
          <p className="mb-1">
            正答率: <span className="font-semibold">{data.successRate}%</span> (
            {data.correctCount}/{data.totalAttempts}問)
          </p>
          <p className="text-gray-600 italic">{data.description}</p>{" "}
          {/* カテゴリ説明 */}
        </div>
      );
    }
    return null;
  };

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
        </Button>{" "}
        {/* ボタンにアイコン追加 */}
      </div>
    );
  }

  return (
    // 全体のコンテナ (背景色、最小高さ)
    <div className="p-4 md:p-6 bg-gray-100 min-h-screen">
      {/* メインカード (影付き、角丸) */}
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        {" "}
        {/* 少し幅を広げる */}
        {/* ヘッダー */}
        <div className="p-5 md:p-6 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            解答結果
          </h1>
        </div>
        {/* --- サマリーセクション --- */}
        <div className="p-5 md:p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">サマリー</h2>
          {/* 改善: 各項目をアイコン付きカードで表示 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
              <div className="p-2 bg-blue-100 rounded-full mr-3">
                <Target size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-800 font-medium">総問題数</p>
                <p className="text-2xl font-bold text-blue-900">
                  {summaryData.totalQuestions}
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-100 shadow-sm">
              <div className="p-2 bg-green-100 rounded-full mr-3">
                <Check size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-800 font-medium">正解数</p>
                <p className="text-2xl font-bold text-green-900">
                  {summaryData.correctQuestions}
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-indigo-50 rounded-lg border border-indigo-100 shadow-sm">
              <div className="p-2 bg-indigo-100 rounded-full mr-3">
                <Percent size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-indigo-800 font-medium">正解率</p>
                <p className="text-2xl font-bold text-indigo-900">
                  {summaryData.correctRate}%
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* --- カテゴリ別正答率グラフ --- */}
        <div className="p-5 md:p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            カテゴリ別 正答率
          </h2>
          {/* グラフコンテナ (高さ設定) */}
          <div className="mb-6 h-80 md:h-96">
            {" "}
            {/* 高さを少し増やす */}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryProgressData}
                margin={{
                  top: 20,
                  right: 10,
                  left: -15,
                  bottom: 55,
                }} /* bottom margin 調整 */
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e0e0e0"
                  vertical={false}
                />
                {/* 改善: X軸ラベルの調整 */}
                <XAxis
                  dataKey="category"
                  axisLine={{ stroke: "#d1d5db" }}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#4b5563" }} // フォントサイズ少し小さく
                  interval={0} // 全てのラベルを表示
                  angle={-45} // 角度変更
                  textAnchor="end" // アンカー位置調整
                  dy={15} // Y方向オフセット調整
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  width={45} /* 幅調整 */
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{
                    fill: "rgba(239, 246, 255, 0.6)",
                  }} /* ホバー色少し濃く */
                />
                <Bar
                  dataKey="successRate"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                  onMouseEnter={(data) => setHoveredBar(data.category)} // ホバー状態設定
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* 改善: ホバー時に色を変える */}
                  {categoryProgressData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        hoveredBar === entry.category ? "#2563eb" : "#3b82f6"
                      }
                    />
                  ))}
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

          {/* --- カテゴリフィルタボタン --- */}
          {/* [source: フロント仕様まとめ.pdf, p. 27] */}
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-600 mb-3">
              フィルタ:
            </h3>
            {/* 改善: ボタンデザイン調整 */}
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
          {filteredProblems.length > 0 ? (
            <div className="space-y-4">
              {filteredProblems.map((problem, index) => (
                // 改善: 正誤でボーダー色が変わるカード
                <div
                  key={problem.questionId} // id -> questionId
                  className={`rounded-lg border-2 overflow-hidden transition-colors duration-200 ${
                    problem.isCorrect
                      ? "border-green-300 bg-green-50/50" // 正解時
                      : "border-red-300 bg-red-50/50" // 不正解時
                  }`}
                >
                  {/* 問題ヘッダー */}
                  <div className="p-4 border-b border-[inherit]">
                    {" "}
                    {/* ボーダー色を親に合わせる */}
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-gray-800 flex items-center">
                        {" "}
                        {/* アイコンと並べるためにflex */}
                        {/* 改善: 正誤アイコン表示 */}
                        {problem.isCorrect ? (
                          <CheckCircle
                            size={18}
                            className="text-green-600 mr-2 flex-shrink-0"
                          />
                        ) : (
                          <XCircle
                            size={18}
                            className="text-red-600 mr-2 flex-shrink-0"
                          />
                        )}
                        問題 {index + 1}
                        <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                          {problem.category || "未分類"}
                        </span>
                      </h4>
                      {/* 正解/不正解ラベルはアイコンにしたので削除 */}
                    </div>
                    <p className="mt-2 text-gray-700 pl-7">
                      {problem.question}
                    </p>{" "}
                    {/* アイコン分インデント */}
                  </div>

                  {/* 選択肢表示 */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 修正: options を参照, id を参照 */}
                    {problem.options.map((option) => {
                      const isCorrectAnswer =
                        problem.correctAnswer === option.id;
                      const isUserAnswer = problem.userAnswer === option.id;
                      return (
                        <div
                          key={option.id}
                          // 改善: 選択肢のスタイル調整
                          className={`p-3 rounded border text-sm flex items-start space-x-2 ${
                            isCorrectAnswer
                              ? "bg-green-100 border-green-300 font-medium text-green-900" // 正解の選択肢
                              : isUserAnswer
                              ? "bg-red-100 border-red-300 text-red-900" // ユーザーが選んだ不正解の選択肢
                              : "bg-white border-gray-200 text-gray-700" // その他
                          }`}
                        >
                          {/* 改善: アイコン表示の調整 */}
                          <div className="flex-shrink-0 w-5 h-5 mt-0.5 flex items-center justify-center">
                            {isCorrectAnswer && (
                              <Check size={16} className="text-green-700" />
                            )}
                            {isUserAnswer && !isCorrectAnswer && (
                              <XCircle size={16} className="text-red-700" />
                            )}
                          </div>
                          {/* テキスト */}
                          <div className="flex-1">
                            <span className="font-semibold mr-1">
                              {option.id}:
                            </span>{" "}
                            {/* id を表示 */}
                            <span>{option.text}</span>
                            {/* 改善: ユーザー解答表示をアイコンに統合したので削除 */}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* アコーディオン形式の解説 */}
                  {/* [source: フロント仕様まとめ.pdf, p. 30] */}
                  <div className="border-t border-[inherit]">
                    <button
                      onClick={() =>
                        setOpenExplanationId(
                          openExplanationId === problem.questionId
                            ? null
                            : problem.questionId
                        )
                      } // id -> questionId
                      // 改善: アコーディオンボタンのスタイル調整
                      className="w-full flex justify-between items-center p-3 text-left text-sm text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:bg-indigo-100 transition-colors font-medium"
                    >
                      <span>解説を見る</span>
                      {openExplanationId === problem.questionId ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}{" "}
                      {/* アイコンサイズ調整 */}
                    </button>
                    {/* 解説コンテンツ */}
                    {openExplanationId === problem.questionId && (
                      <div className="px-4 pb-4 pt-2 text-sm text-gray-800 bg-white border-t border-indigo-100">
                        {" "}
                        {/* 背景白に */}
                        <p>{problem.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // フィルタ結果がない場合
            <p className="text-gray-500 text-center py-6">
              {selectedCategory
                ? `「${selectedCategory}」カテゴリの問題はありません。`
                : "表示する問題がありません。"}
            </p>
          )}

          {/* TOPへ戻るボタン */}
          {/* [source: フロント仕様まとめ.pdf, p. 32] */}
          <div className="mt-8 text-center border-t pt-6 border-gray-200">
            {" "}
            {/* 区切り線追加 */}
            <Button
              variant="default" // 通常ボタンに変更
              size="lg" // サイズ大きく
              onClick={() => navigate("/")} // 問題選択画面へ
              className="bg-blue-600 hover:bg-blue-700" // 色調整
            >
              <Home className="mr-2" size={18} /> {/* アイコン追加 */}
              もう一度挑戦する
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnswerResultDashboard;
