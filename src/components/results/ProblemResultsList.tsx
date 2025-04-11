import { QuizResult } from "@/types/quiz";
import { ProblemResultItem } from "./ProblemResultItem";

export interface ProblemResultsListProps {
  problems: QuizResult[];
  selectedCategory: string | null;
  openExplanationId: string | null;
  setOpenExplanationId: (id: string | null) => void;
}

export const ProblemResultsList = ({
  problems,
  selectedCategory,
  openExplanationId,
  setOpenExplanationId,
}: ProblemResultsListProps) => {
  if (problems.length === 0) {
    return (
      <p className="text-gray-500 text-center py-6">
        {selectedCategory
          ? `「${selectedCategory}」カテゴリの問題はありません。`
          : "表示する問題がありません。"}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {problems.map((problem, index) => (
        <ProblemResultItem
          key={problem.questionId}
          problem={problem}
          index={index}
          isOpen={openExplanationId === problem.questionId}
          toggleOpen={() =>
            setOpenExplanationId(
              openExplanationId === problem.questionId
                ? null
                : problem.questionId
            )
          }
        />
      ))}
    </div>
  );
};
