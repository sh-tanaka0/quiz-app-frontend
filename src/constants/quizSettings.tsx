// src/constants/quizSettings.ts
import React from "react";
import readableCodeImage from "@/assets/readable-code.jpeg";
import principlesImage from "@/assets/programming-principles.jpg";
import { BookCover } from "./bookCover";

// 型定義もこちらに移動すると良い
export interface BookSourceOption {
  value: string;
  label: string;
  description: string;
  difficulty: string;
  icon: React.ReactNode;
  problemCount: number;
}

export const BOOK_SOURCE_OPTIONS: BookSourceOption[] = [
  {
    value: "readable_code",
    label: "リーダブルコード",
    icon: (
      <BookCover imageUrl={readableCodeImage} alt="リーダブルコード 書籍画像" />
    ),
    description: "美しく読みやすいコードの書き方を学ぶ",
    difficulty: "初級〜中級",
    problemCount: 60,
  },
  {
    value: "programming_principles",
    label: "プリンシプル オブ プログラミング",
    icon: (
      <BookCover
        imageUrl={principlesImage}
        alt="プリンシプル オブ プログラミング 書籍画像"
      />
    ),
    description: "プログラミングの根本原則と設計思想",
    difficulty: "中級〜上級",
    problemCount: 90,
  },
  {
    value: "both",
    label: "全範囲",
    icon: (
      <div className="relative">
        <div className="absolute -left-2 -top-1">
          <BookCover
            imageUrl={readableCodeImage}
            alt="リーダブルコード 書籍画像"
          />
        </div>
        <div className="ml-6">
          <BookCover
            imageUrl={principlesImage}
            alt="プリンシプル オブ プログラミング 書籍画像"
          />
        </div>
      </div>
    ),
    description: "すべての書籍から出題",
    difficulty: "全レベル",
    problemCount: 150,
  },
];

export const PROBLEM_COUNT_OPTIONS: number[] = [5, 10, 15, 20, 25, 30];
export const TIME_LIMIT_OPTIONS: number[] = [30, 45, 60, 75, 90];

export const DEFAULT_BOOK_SOURCE = "readable_code";
export const DEFAULT_PROBLEM_COUNT = 10;
export const DEFAULT_TIME_LIMIT = 60;

export const RECENT_UPDATES = [
  { date: "2025年5月21日", content: "サイトのデザインをリニューアルしました" },
  { date: "2025年5月15日", content: "問題を100問追加しました" },
  {
    date: "2025年5月8日",
    content: "問題取得のパフォーマンスが向上しました",
  },
  { date: "2025年4月23日", content: "サイトをリリースしました！！" },
];

export const RECENT_PROBLEMS = [
  "変数名の命名規則について",
  "関数の責任分離に関する問題",
  "コメントの適切な使い方",
];
