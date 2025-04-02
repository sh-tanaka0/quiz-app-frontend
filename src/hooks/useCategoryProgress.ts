// src/hooks/useCategoryProgress.ts
import { useMemo } from "react";
import { QuizResult, CategoryProgressData } from "@/types/quiz";

// カテゴリの説明の定義を別途管理
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
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

/**
 * カテゴリごとの進捗データを計算するカスタムフック
 */
export const useCategoryProgress = (
  quizResults: QuizResult[]
): CategoryProgressData[] => {
  return useMemo<CategoryProgressData[]>(() => {
    const getCategoryDescription = (category: string): string => {
      return (
        CATEGORY_DESCRIPTIONS[category] ||
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
};
