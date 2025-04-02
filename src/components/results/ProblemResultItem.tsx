import React from "react";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { QuizResult } from "@/types/quiz";

interface ProblemResultItemProps {
  problem: QuizResult;
  index: number;
  isOpen: boolean;
  toggleOpen: () => void;
}

export const ProblemResultItem = ({
  problem,
  index,
  isOpen,
  toggleOpen,
}: ProblemResultItemProps) => {
  return (
    <div
      className={`rounded-lg border-2 overflow-hidden transition-colors duration-200 ${
        problem.isCorrect
          ? "border-green-300 bg-green-50/50"
          : "border-red-300 bg-red-50/50"
      }`}
    >
      {/* 問題ヘッダー */}
      <div className="p-4 border-b border-[inherit]">
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-semibold text-gray-800 flex items-center">
            {problem.isCorrect ? (
              <CheckCircle
                size={18}
                className="text-green-600 mr-2 flex-shrink-0"
              />
            ) : (
              <XCircle size={18} className="text-red-600 mr-2 flex-shrink-0" />
            )}
            問題 {index + 1}
            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
              {problem.category || "未分類"}
            </span>
          </h4>
        </div>
        <p className="mt-2 text-gray-700 pl-7">{problem.question}</p>
      </div>

      {/* 選択肢表示 */}
      <OptionsList problem={problem} />

      {/* アコーディオン形式の解説 */}
      <div className="border-t border-[inherit]">
        <button
          onClick={toggleOpen}
          className="w-full flex justify-between items-center p-3 text-left text-sm text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:bg-indigo-100 transition-colors font-medium"
        >
          <span>解説を見る</span>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {isOpen && (
          <div className="px-4 pb-4 pt-2 text-sm text-gray-800 bg-white border-t border-indigo-100">
            <p>{problem.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// 選択肢リストを分離したサブコンポーネント
interface OptionsListProps {
  problem: QuizResult;
}

const OptionsList: React.FC<OptionsListProps> = ({ problem }) => {
  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      {problem.options.map((option) => {
        const isCorrectAnswer = problem.correctAnswer === option.id;
        const isUserAnswer = problem.userAnswer === option.id;
        return (
          <div
            key={option.id}
            className={`p-3 rounded border text-sm flex items-start space-x-2 ${
              isCorrectAnswer
                ? "bg-green-100 border-green-300 font-medium text-green-900"
                : isUserAnswer
                ? "bg-red-100 border-red-300 text-red-900"
                : "bg-white border-gray-200 text-gray-700"
            }`}
          >
            <div className="flex-shrink-0 w-5 h-5 mt-0.5 flex items-center justify-center">
              {isCorrectAnswer && (
                <Check size={16} className="text-green-700" />
              )}
              {isUserAnswer && !isCorrectAnswer && (
                <XCircle size={16} className="text-red-700" />
              )}
            </div>
            <div className="flex-1">
              <span className="font-semibold mr-1">{option.id}:</span>
              <span>{option.text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
