import { Target, Check, Percent } from "lucide-react";
import { SummaryData } from "@/types/quiz";

export interface SummarySectionProps {
  data: SummaryData;
}

export const SummarySection = ({ data }: SummarySectionProps) => {
  return (
    <div className="p-5 md:p-6 border-b border-gray-200">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">サマリー</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 総問題数 */}
        <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
          <div className="p-2 bg-blue-100 rounded-full mr-3">
            <Target size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-blue-800 font-medium">総問題数</p>
            <p className="text-2xl font-bold text-blue-900">
              {data.totalQuestions}
            </p>
          </div>
        </div>

        {/* 正解数 */}
        <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-100 shadow-sm">
          <div className="p-2 bg-green-100 rounded-full mr-3">
            <Check size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-green-800 font-medium">正解数</p>
            <p className="text-2xl font-bold text-green-900">
              {data.correctQuestions}
            </p>
          </div>
        </div>

        {/* 正解率 */}
        <div className="flex items-center p-4 bg-indigo-50 rounded-lg border border-indigo-100 shadow-sm">
          <div className="p-2 bg-indigo-100 rounded-full mr-3">
            <Percent size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm text-indigo-800 font-medium">正解率</p>
            <p className="text-2xl font-bold text-indigo-900">
              {data.correctRate}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
