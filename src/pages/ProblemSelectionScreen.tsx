import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  BOOK_SOURCE_OPTIONS,
  PROBLEM_COUNT_OPTIONS,
  TIME_LIMIT_OPTIONS,
  DEFAULT_BOOK_SOURCE,
  DEFAULT_PROBLEM_COUNT,
  DEFAULT_TIME_LIMIT,
} from "@/constants/quizSettings";

const ProblemSelectionScreen = () => {
  const [bookSource, setBookSource] = useState<string>(DEFAULT_BOOK_SOURCE);
  const [problemCount, setProblemCount] = useState<number>(
    DEFAULT_PROBLEM_COUNT
  );
  const [timeLimit, setTimeLimit] = useState<number>(DEFAULT_TIME_LIMIT);
  const navigate = useNavigate();

  const handleStartQuiz = () => {
    const queryParams = new URLSearchParams({
      bookSource: bookSource,
      count: problemCount.toString(),
      timeLimit: timeLimit.toString(),
    }).toString();
    navigate(`/quiz?${queryParams}`);
  };

  // --- レンダリング ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">問題選択</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 出題範囲選択 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">出題範囲選択</h2>
            <RadioGroup
              value={bookSource}
              onValueChange={setBookSource} // 直接 setter を渡す
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {/* 定義した配列を map で展開 */}
              {BOOK_SOURCE_OPTIONS.map(({ value, label, icon }) => (
                <div key={value} className="w-full">
                  <RadioGroupItem
                    value={value}
                    id={value}
                    className="peer sr-only" // ラジオボタン本体は非表示
                  />
                  <Label
                    htmlFor={value} // Label と RadioGroupItem を紐付け
                    // ラベルにスタイルを適用し、クリック可能な領域を作成
                    className={`flex flex-col items-center justify-between rounded-md border-2 p-4 h-full w-full text-center cursor-pointer transition-colors duration-200 ease-in-out
                      hover:bg-sky-50 hover:border-sky-300
                      ${
                        // 選択状態に応じてスタイルを変更
                        bookSource === value
                          ? "border-sky-500 bg-sky-100 text-sky-800"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                  >
                    <div className="flex flex-col items-center">
                      {icon}
                      <span className="mt-2 font-medium">{label}</span>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 問題数選択 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">問題数選択</h2>
            <Select
              value={problemCount.toString()} // Select の value は文字列
              // 文字列で受け取り数値に変換して state を更新
              onValueChange={(value) => setProblemCount(parseInt(value, 10))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="問題数を選択" />
              </SelectTrigger>
              <SelectContent>
                {/* 定義した配列を map で展開 */}
                {PROBLEM_COUNT_OPTIONS.map((count) => (
                  <SelectItem key={count} value={count.toString()}>
                    {count}問
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 1問あたりの時間選択 */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">1問あたりの解答時間</h2>
            <Select
              value={timeLimit.toString()}
              onValueChange={(value) => setTimeLimit(parseInt(value, 10))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="1問あたりの時間" />
              </SelectTrigger>
              <SelectContent>
                {/* 定義した配列を map で展開 */}
                {TIME_LIMIT_OPTIONS.map((seconds) => (
                  <SelectItem key={seconds} value={seconds.toString()}>
                    {seconds}秒
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 開始ボタン */}
          <Button
            className="w-full bg-sky-600 hover:bg-sky-700 text-lg py-3"
            onClick={handleStartQuiz}
          >
            開始
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProblemSelectionScreen;
