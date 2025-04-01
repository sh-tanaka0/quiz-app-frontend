// src/components/quiz/ProblemItem.tsx
import React from "react";
import { Problem } from "@/types/quiz"; // パスを調整

interface ProblemItemProps {
  problem: Problem;
  index: number;
  selectedAnswer: string | null;
  onAnswerSelect: (problemId: string, choiceId: string) => void;
  isTimeUp: boolean;
  isSubmitting: boolean;
}

const ProblemItem: React.FC<ProblemItemProps> = ({
  problem,
  index,
  selectedAnswer,
  onAnswerSelect,
  isTimeUp,
  isSubmitting,
}) => {
  return (
    <div className="mb-8 pb-6 border-b last:border-b-0">
      <h2 className="text-lg font-semibold mb-4 p-3 bg-gray-100 rounded-md">
        問題 {index + 1}: {problem.text}
      </h2>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        {problem.options.map((option) => (
          <div
            key={option.id}
            onClick={() => onAnswerSelect(problem.id, option.id)}
            className={`
              p-3 rounded border cursor-pointer transition-all duration-150 ease-in-out
              flex items-center space-x-3 group
              ${
                selectedAnswer === option.id
                  ? "bg-sky-100 border-sky-500 ring-2 ring-sky-300"
                  : isTimeUp || isSubmitting
                  ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-white hover:bg-gray-50 hover:border-gray-400 border-gray-200"
              }
            `}
            style={{ opacity: isTimeUp || isSubmitting ? 0.7 : 1 }}
          >
            <div
              className={`/* ... ラジオボタン風UIのクラス ... */
                 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                 ${
                   selectedAnswer === option.id
                     ? "border-sky-600 bg-sky-500"
                     : isTimeUp || isSubmitting
                     ? "border-gray-300 bg-gray-100"
                     : "border-gray-400 group-hover:border-gray-500 bg-white"
                 }
            `}
            >
              {selectedAnswer === option.id && (
                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
              )}
            </div>
            <div className="flex-1">
              <span className="font-semibold mr-1">{option.id}:</span>
              {option.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProblemItem;
