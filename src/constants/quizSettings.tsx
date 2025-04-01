// src/constants/quizSettings.ts
import React from "react";
import { Book, BookOpen } from "lucide-react";

// 型定義もこちらに移動すると良い
export interface BookSourceOption {
  value: string;
  label: string;
  icon: React.ReactNode;
}

export const BOOK_SOURCE_OPTIONS: BookSourceOption[] = [
  {
    value: "readableCode",
    label: "リーダブルコード",
    icon: <Book className="mb-2" size={32} />,
  },
  {
    value: "principles",
    label: "プリンシプルオブプログラミング",
    icon: <BookOpen className="mb-2" size={32} />,
  },
  {
    value: "both",
    label: "両方",
    icon: (
      <div className="flex justify-center items-center mb-2">
        <Book className="mr-1" size={24} />
        <BookOpen size={24} />
      </div>
    ),
  },
];

export const PROBLEM_COUNT_OPTIONS: number[] = [5, 10, 15, 20, 25, 30];
export const TIME_LIMIT_OPTIONS: number[] = [30, 45, 60, 75, 90];

export const DEFAULT_BOOK_SOURCE = "readableCode";
export const DEFAULT_PROBLEM_COUNT = 10;
export const DEFAULT_TIME_LIMIT = 60;
