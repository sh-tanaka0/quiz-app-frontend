// src/hooks/useCategoryProgress.ts
import { useMemo } from "react";
import { QuizResult, CategoryProgressData } from "@/types/quiz";

// カテゴリの説明の定義を別途管理
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  コード可読性:
    "コードは他者が最短時間で理解できるように書くべきという中心原則に基づき、コードの意図を明確に伝え、不必要な複雑さを排除する考え方です。これには、問題を平易な言葉で捉え直すことや、本当に必要なコードだけを書くというアプローチも含まれます。",
  変数名名とコメント:
    "変数、関数、クラス等に具体的で誤解を招かない名前を付け、情報を的確に詰め込む技術です。また、コードだけでは伝わらない背景情報、設計判断、注意点をコメントで効果的に補い、書き手の意図を明確に伝えます。",

  制御フローと論理:
    "条件分岐、ループ、変数、複雑な式などを、追いやすく理解しやすい形にするためのテクニックです。ネストの削減、早期リターン、説明変数の導入、論理式の変形により、ロジックの流れと変数の状態追跡を明確にします。",

  リファクタリングと設計原則:
    "コードを論理的な単位に整理・分割し、各部分が一度に一つの明確なタスクだけを実行するように設計する原則です。主要ロジックと直接関係ない下位問題を抽出し、関数の責務を単一にすることで、全体の保守性と理解度を高めます。",

  コーディングスタイル:
    "コードの視覚的な整理と一貫性の重要性を指します。統一されたフォーマット、適切なインデントや空白の使用、関連コードのグループ化により、コードを「目に優しく」、素早く概要を把握できるように整えます。",

  テスト設計:
    "テストコード自体の読みやすさと保守性を高めるための原則とテクニックです。明確なテスト名、単純で効果的な入力値の選択、役立つエラーメッセージにより、テストがコードの振る舞いを理解する助けとなるようにします。",

  開発マインドセット:
    "効果的なソフトウェア開発を支えるプログラマ個人の心構え（例：3大美徳）、日々の習慣（例：ボーイスカウトの規則）、問題解決アプローチ（例：ラバーダッキング）、そして既存の知見を効率的に活用する姿勢（例：車輪の再発明を避ける）。これには、継続的な改善意識やコードに対する責任感が含まれます。",

  アンチパターン:
    "時間の経過や不適切なプラクティスによるコードの劣化（技術的負債、エントロピー増大、割れた窓）を防ぐための原則や、開発プロジェクトで陥りやすい典型的な失敗パターン（セカンドシステム症候群など）の理解とそれらへの対処法。",
  エラー処理:
    "予期せぬ入力や異常系（エラー）にプログラムが適切に対処し、安定性と信頼性を高めるための設計・実装技法。これには、エラーの早期発見、適切なフィードバック、そしてプログラムを安全な状態に保つための防御的アプローチが含まれます。",
  アルゴリズムと効率性:
    "ソフトウェアがCPUやメモリなどのリソースを適切に利用し、処理速度の向上を目指す際の原則。早すぎる最適化の弊害を理解し、計測に基づいた的確なアプローチを重視し、可読性や保守性とのバランスを考慮します。",
  開発プロセス:
    "ソフトウェア開発プロジェクトの進行、チーム構造、コミュニケーションが成果物の品質や開発効率に与える影響に関する経験則や原則。人員計画の難しさ（ブルックスの法則）や組織構造とアーキテクチャの関連性（コンウェイの法則）などを扱います。",
  開発効率化:
    "開発の初期段階から方向性を見極め、リスクを低減し、効率的に開発を進めるための実践的手法や考え方。曳光弾のような骨格先行開発や、ドッグフーディングによる早期フィードバックの活用、コンテキストの理解と共有の重要性などを含みます。",
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
